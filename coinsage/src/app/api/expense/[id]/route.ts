// src/app/api/expense/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { getUserFromToken } from "@/lib/auth";

// Import models so Mongoose registers schemas
import Account from "@/model/Account";
import IncomeGoal from "@/model/IncomeGoal";
import "@/model/Category";
import "@/model/ExpenditureType";
import People from "@/model/People";
import Expense from "@/model/Expense";
import Debt from "@/model/Debt";
import ExpenseAllocation from "@/model/ExpenseAllocation";
import ExpenseSplit from "@/model/ExpenseSplit";

async function getUserId(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const tokenInHeader = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : "";
  const tokenInCookie = req.cookies.get("accessToken")?.value || "";
  const token = tokenInHeader || tokenInCookie;
  return getUserFromToken(token || "");
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1) Authenticate
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Connect to DB
    await dbConnect();

    // 3) Fetch existing expense
    const oldExpense = await Expense.findOne({ _id: params.id, userId });
    if (!oldExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // 4) Extract old-side data, coercing to 0 if missing
    const oldAccountId = oldExpense.accountId.toString();
    const oldGoalId = oldExpense.goalId.toString();
    const oldUserPaid = Number((oldExpense as any).userPaid) || 0;
    const oldUserShare = Number(oldExpense.totalAmount) || 0;

    // 5) Fetch old Account and Goal
    const [oldAccount, oldGoal] = await Promise.all([
      Account.findOne({ _id: oldAccountId, user: userId }),
      IncomeGoal.findOne({ _id: oldGoalId, user: userId }),
    ]);

    // 6) Reverse old side-effects
    if (oldAccount) {
      const currentBal = oldAccount.balance ?? 0;
      oldAccount.balance = currentBal + oldUserPaid;
      await oldAccount.save();
    }
    if (oldGoal) {
      const currentGoalBal = oldGoal.balance ?? 0;
      oldGoal.balance = currentGoalBal - oldUserShare;
      await oldGoal.save();
    }

    // 7) Delete old related docs
    await Promise.all([
      ExpenseSplit.deleteMany({ expense: oldExpense._id }),
      Debt.deleteMany({ expenseId: oldExpense._id }),
      ExpenseAllocation.deleteMany({ expense: oldExpense._id }),
    ]);

    // 8) Parse new request body
    const {
      name,
      totalBillAmount,
      paidBy,    // Array<{ personId: string, amountPaid: number }>
      splitType, // 'PERCENTAGE' or 'AMOUNT'
      splits,    // Array<{ personId: string, value: number }>
      date,
      accountId: newAccountId,
      categoryId,
      typeId,
      goalId: newGoalId,
      notes,
    } = await req.json();

    // 9) Basic validation
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (typeof totalBillAmount !== "number" || totalBillAmount <= 0) {
      return NextResponse.json(
        { error: "totalBillAmount must be a positive number" },
        { status: 400 }
      );
    }
    if (!["PERCENTAGE", "AMOUNT"].includes(splitType)) {
      return NextResponse.json(
        { error: 'splitType must be either "PERCENTAGE" or "AMOUNT"' },
        { status: 400 }
      );
    }
    if (!Array.isArray(splits)) {
      return NextResponse.json(
        { error: "splits must be an array (can be empty)" },
        { status: 400 }
      );
    }
    if (!Array.isArray(paidBy) || paidBy.length === 0) {
      return NextResponse.json(
        { error: "paidBy array is required and cannot be empty" },
        { status: 400 }
      );
    }
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    if (!newAccountId?.trim()) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }
    if (!newGoalId?.trim()) {
      return NextResponse.json(
        { error: "IncomeGoal ID is required" },
        { status: 400 }
      );
    }
    if (!categoryId?.trim()) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }
    if (!typeId?.trim()) {
      return NextResponse.json(
        { error: "ExpenditureType ID is required" },
        { status: 400 }
      );
    }

    // 10) Verify ownership of new Account & new IncomeGoal
    const [newAccount, newGoal] = await Promise.all([
      Account.findOne({ _id: newAccountId, user: userId }),
      IncomeGoal.findOne({ _id: newGoalId, user: userId }),
    ]);
    if (!newAccount) {
      return NextResponse.json(
        { error: "New account not found or not owned by user" },
        { status: 404 }
      );
    }
    if (!newGoal) {
      return NextResponse.json(
        { error: "New income goal not found or not owned by user" },
        { status: 404 }
      );
    }

    // 11) Ensure self “People” record exists
    let selfPerson = await People.findOne({ user: userId, isUser: true });
    if (!selfPerson) {
      selfPerson = await People.create({
        user: userId,
        name: "You",
        email: null,
        phone: null,
        image: null,
        isUser: true,
      });
    }
    const userPersonId = selfPerson._id.toString();

    // 12) Build new shareMap { personId → rupeeShare }
    const shareMap: Record<string, number> = {};
    let sumOfShares = 0;
    for (const entry of splits) {
      const { personId, value } = entry;
      if (!personId?.trim()) {
        return NextResponse.json(
          { error: "Each splits.personId is required" },
          { status: 400 }
        );
      }
      if (typeof value !== "number" || value < 0) {
        return NextResponse.json(
          { error: "Each splits.value must be non-negative" },
          { status: 400 }
        );
      }
      const shareAmt =
        splitType === "PERCENTAGE"
          ? (value / 100) * totalBillAmount
          : value;
      shareMap[personId] = (shareMap[personId] || 0) + shareAmt;
      sumOfShares += shareAmt;
    }
    // Assign remainder to user
    const remainder = totalBillAmount - sumOfShares;
    if (remainder < -0.01) {
      return NextResponse.json(
        { error: "Splits exceed totalBillAmount" },
        { status: 400 }
      );
    }
    shareMap[userPersonId] = (shareMap[userPersonId] || 0) + Math.max(0, remainder);

    // 13) Build new paidMap { personId → amountPaid }
    const paidMap: Record<string, number> = {};
    let sumPaidSoFar = 0;
    for (const entry of paidBy) {
      const { personId, amountPaid } = entry;
      if (!personId?.trim()) {
        return NextResponse.json(
          { error: "Each paidBy.personId is required" },
          { status: 400 }
        );
      }
      if (typeof amountPaid !== "number" || amountPaid < 0) {
        return NextResponse.json(
          { error: "Each paidBy.amountPaid must be non-negative" },
          { status: 400 }
        );
      }
      paidMap[personId] = (paidMap[personId] || 0) + amountPaid;
      sumPaidSoFar += amountPaid;
    }
    if (Math.abs(sumPaidSoFar - totalBillAmount) > 0.01) {
      return NextResponse.json(
        { error: "Sum of paidBy amounts must equal totalBillAmount" },
        { status: 400 }
      );
    }

    // 14) Determine new userPaid & userShare
    const newUserPaid = paidMap[userPersonId] || 0;
    const newUserShare = shareMap[userPersonId] || 0;

    // 15) Update Expense document fields, coercing numbers
    oldExpense.name = name.trim();
    oldExpense.totalAmount = newUserShare;
    ;(oldExpense as any).userPaid = newUserPaid;
    oldExpense.date = new Date(date);
    oldExpense.accountId = newAccountId;
    oldExpense.categoryId = categoryId;
    oldExpense.typeId = typeId;
    oldExpense.goalId = newGoalId;
    oldExpense.splitType = splitType;
    oldExpense.notes = notes?.trim() || null;
    await oldExpense.save();

    // 16) Adjust Account balances
    if (oldAccountId === newAccountId) {
      // same account: net = newUserPaid - oldUserPaid
      const currentBal = newAccount.balance ?? 0;
      const net = newUserPaid - oldUserPaid;
      if (net > currentBal + 0.001) {
        return NextResponse.json(
          { error: "Insufficient funds in account after update" },
          { status: 400 }
        );
      }
      newAccount.balance = currentBal - net;
      await newAccount.save();
    } else {
      // different account: subtract newUserPaid from newAccount
      const currentNewBal = newAccount.balance ?? 0;
      if (newUserPaid > currentNewBal + 0.001) {
        return NextResponse.json(
          { error: "Insufficient funds in new account" },
          { status: 400 }
        );
      }
      newAccount.balance = currentNewBal - newUserPaid;
      await newAccount.save();
      // oldAccount was already restored above
    }

    // 17) Adjust Goal balances
    if (oldGoalId === newGoalId) {
      // same goal: net = newUserShare - oldUserShare
      const currentGoalBal = oldGoal?.balance ?? 0;
      oldGoal!.balance = currentGoalBal + (newUserShare - oldUserShare);
      await oldGoal!.save();
    } else {
      // different goal: add to newGoal
      const currentNewGoalBal = newGoal.balance ?? 0;
      newGoal.balance = currentNewGoalBal + newUserShare;
      await newGoal.save();
    }

    // 18) Create updated ExpenseSplit entries
    const splitDocs: mongoose.Document[] = [];
    for (const pid of Object.keys(shareMap)) {
      const shareAmt = +shareMap[pid].toFixed(2);
      const paidAmt = +(paidMap[pid] || 0).toFixed(2);
      const isPaid = paidAmt > 0.001;

      const sharePercent =
        splitType === "PERCENTAGE"
          ? splits.find((s) => s.personId === pid)?.value ?? 0
          : (shareAmt / totalBillAmount) * 100;

      const shareRate =
        splitType === "PERCENTAGE"
          ? sharePercent / 100
          : shareAmt / totalBillAmount;

      const splitDoc = await ExpenseSplit.create({
        expense: oldExpense._id,
        hasPaid: isPaid,
        shareRate,
        shareAmount: shareAmt,
        sharePercent: +sharePercent.toFixed(2),
        paidAmount: paidAmt,
        people: new mongoose.Types.ObjectId(pid),
      });
      splitDocs.push(splitDoc);
    }

    // 19) Build overpayers & underpayers
    type PersonDiff = { personId: string; diff: number };
    const overpayers: PersonDiff[] = [];
    const underpayers: PersonDiff[] = [];

    for (const pid of Object.keys(shareMap)) {
      const paidAmt = paidMap[pid] || 0;
      const shareAmt = shareMap[pid] || 0;
      const diff = +(paidAmt - shareAmt).toFixed(2);
      if (diff > 0.001) {
        overpayers.push({ personId: pid, diff });
      } else if (diff < -0.001) {
        underpayers.push({ personId: pid, diff });
      }
    }
    const totalOverpaid = overpayers.reduce((sum, o) => sum + o.diff, 0);

    // 20) Recreate Debt entries proportionally
    const debtDocs: mongoose.Document[] = [];
    const currencyId = (newAccount.currency as mongoose.Types.ObjectId) || null;

    for (const under of underpayers) {
      const underAmt = -under.diff;
      if (totalOverpaid < 0.001) continue;
      for (const over of overpayers) {
        const portion = over.diff / totalOverpaid;
        const owesAmount = +(underAmt * portion).toFixed(2);
        if (owesAmount < 0.01) continue;

        const underpayerType =
          under.personId === userPersonId ? "User" : "People";
        const underpayerId =
          under.personId === userPersonId
            ? userId
            : new mongoose.Types.ObjectId(under.personId);

        const overpayerType =
          over.personId === userPersonId ? "User" : "People";
        const overpayerId =
          over.personId === userPersonId
            ? userId
            : new mongoose.Types.ObjectId(over.personId);

        const debt = await Debt.create({
          userId,
          payerType: underpayerType,
          payerId: underpayerId,
          payeeType: overpayerType,
          payeeId: overpayerId,
          expenseId: oldExpense._id,
          originalAmount: owesAmount,
          remainingAmount: owesAmount,
          currencyId,
          createdAt: new Date(),
          date: new Date(date),
          status: "PENDING",
        });
        debtDocs.push(debt);
      }
    }

    // 21) Create new ExpenseAllocation for newUserShare
    const allocationId = new mongoose.Types.ObjectId().toHexString();
    await ExpenseAllocation.create({
      allocationId,
      expense: oldExpense._id,
      goal: newGoalId,
      amount: mongoose.Types.Decimal128.fromString(newUserShare.toString()),
      allocatedAt: new Date(),
    });

    // 22) Populate & return updated Expense + Debts + Splits
    const updated = await Expense.findById(oldExpense._id)
      .populate("accountId", "name balance")
      .populate("categoryId", "name")
      .populate("typeId", "name")
      .populate("goalId", "name targetAmount targetDate balance");

    return NextResponse.json(
      {
        expense: updated,
        debts: debtDocs,
        splits: splitDocs,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in PUT /api/expense/[id]:", err);
    if (err.message.toLowerCase().includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Bad Request" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1) Authenticate
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Connect to the database
    await dbConnect();

    // 3) Find the existing expense
    const expense = await Expense.findOne({ _id: params.id, userId });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // 4) Read fields needed to revert balances (coerce to number)
    const accountId = expense.accountId.toString();
    const goalId = expense.goalId.toString();
    const userPaid = Number((expense as any).userPaid) || 0;
    const userShare = Number(expense.totalAmount) || 0;

    // 5) Revert Account balance (add back userPaid)
    const acct = await Account.findOne({ _id: accountId, user: userId });
    if (acct) {
      const curr = acct.balance ?? 0;
      acct.balance = curr + userPaid;
      await acct.save();
    }

    // 6) Revert IncomeGoal balance (subtract userShare)
    const goal = await IncomeGoal.findOne({ _id: goalId, user: userId });
    if (goal) {
      const currGoal = goal.balance ?? 0;
      goal.balance = currGoal - userShare;
      await goal.save();
    }

    // 7) Delete related ExpenseSplit documents
    await ExpenseSplit.deleteMany({ expense: expense._id });

    // 8) Delete related Debt documents
    await Debt.deleteMany({ expenseId: expense._id });

    // 9) Delete related ExpenseAllocation documents
    await ExpenseAllocation.deleteMany({ expense: expense._id });

    // 10) Finally delete the Expense itself
    await Expense.deleteOne({ _id: expense._id });

    return NextResponse.json(
      { message: "Expense deleted and all balances restored" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in DELETE /api/expense/[id]:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const expense = await Expense.findOne({ _id: params.id, userId })
      .populate("accountId", "name balance")
      .populate("goalId", "name balance")
      .populate("categoryId", "name")
      .populate("typeId", "name")
      .lean();

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Get splits, allocations, debts
    const [splits, allocations, debts] = await Promise.all([
      ExpenseSplit.find({ expense: expense._id }).populate("person", "name email phone image isUser").lean(),
      ExpenseAllocation.find({ expense: expense._id }).lean(),
      Debt.find({ expenseId: expense._id }).populate("payerId payeeId", "name email phone image isUser").lean(),
    ]);

    return NextResponse.json({
      expense,
      splits,
      allocations,
      debts,
    });
  } catch (err) {
    console.error("GET /api/expense/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}