// src/app/api/expense/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { getUserFromToken } from "@/lib/auth";

// ─── IMPORT ALL MODELS SO MONGOOSE CAN REGISTER THEM ─────────────────────────────────
// Note: your folder is “model” (singular), so we import from "@/model/…"
import Account from "@/model/Account";
import IncomeGoal from "@/model/IncomeGoal";
import "@/model/Category";
import "@/model/ExpenditureType";
import People from "@/model/People";
import Expense from "@/model/Expense";
import Debt from "@/model/Debt";
import ExpenseAllocation from "@/model/ExpenseAllocation";
import ExpenseSplit from "@/model/ExpenseSplit";

// ──────────────────────────────────────────────────────────────────────────────────────

// Utility: extract userId from Authorization header or accessToken cookie
async function getUserId(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const tokenInHeader = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : "";
  const tokenInCookie = req.cookies.get("accessToken")?.value || "";
  const token = tokenInHeader || tokenInCookie;
  return getUserFromToken(token);
}

// ──────────────────────────────────────────────────────────────────────────────────────
// GET /api/expense  → List all expenses (populated) for this user
// ──────────────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const expenses = await Expense.find({ userId })
      .populate("accountId", "name balance")
      .populate("categoryId", "name")
      .populate("typeId", "name")
      .populate("goalId", "name targetAmount targetDate balance")
      .sort({ date: -1 });

    return NextResponse.json(expenses);
  } catch (err: any) {
    console.error("Error in GET /api/expense:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────────────
// POST /api/expense  → Create a new “GoDutch”-style expense
//  • totalBillAmount = full bill among all participants
//  • paidBy[] = who actually paid & how much
//  • splits[] = how the bill is divided (percentage or fixed rupee amounts)
//  • We store in Expense.totalAmount **only** what the user themself actually paid.
//  • We create Debt documents so that any over-payments/under-payments get tracked.
//  • We deduct from the user’s account exactly userPaid.
//  • We allocate **only userShare** to their IncomeGoal.
// ──────────────────────────────────────────────────────────────────────────────────────



export async function POST(req: NextRequest) {
  try {
    // ─── 1) Authenticate the user ───────────────────────────────────────────────────
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── 2) Parse request body ─────────────────────────────────────────────────────
    const {
      name,
      totalBillAmount,
      paidBy,    // Array<{ personId: string, amountPaid: number }>
      splitType, // 'PERCENTAGE' or 'AMOUNT'
      splits,    // Array<{ personId: string, value: number }>
      date,
      accountId,
      categoryId,
      typeId,
      goalId,
      notes,
    } = await req.json();

    // ─── 3) Basic validation ─────────────────────────────────────────────────────────
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
    if (!accountId?.trim()) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }
    if (!goalId?.trim()) {
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

    // ─── 4) Connect to database ──────────────────────────────────────────────────────
    await dbConnect();

    // ─── 5) Verify Account & IncomeGoal ownership ───────────────────────────────────
    const [account, goal] = await Promise.all([
      Account.findOne({ _id: accountId, user: userId }),
      IncomeGoal.findOne({ _id: goalId, user: userId }),
    ]);
    if (!account) {
      return NextResponse.json(
        { error: "Account not found or not owned by user" },
        { status: 404 }
      );
    }
    if (!goal) {
      return NextResponse.json(
        { error: "IncomeGoal not found or not owned by user" },
        { status: 404 }
      );
    }

    // ─── 6) Ensure a “self” People document exists (isUser: true) ──────────────────
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

    // ─── 7) Build shareMap { personId → rupeeShare } ───────────────────────────────
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

    // ─── 8) Build paidMap { personId → amountPaid } ───────────────────────────────
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

    // ─── 9) Determine userPaid & userShare ────────────────────────────────────────
    const userPaid = paidMap[userPersonId] || 0;      // how much user actually paid
    const userShare = shareMap[userPersonId] || 0;    // how much user owes

    // ─── 10) Create the Expense (store totalAmount=userShare, userPaid) ──────────
    const expense = await Expense.create({
      userId,
      accountId,
      goalId,
      name: name.trim(),
      totalAmount: userShare,
      userPaid,                 // store for later DELETE restoration
      date: new Date(date),
      categoryId,
      typeId,
      splitType,
      notes: notes?.trim() || null,
      createdAt: new Date(),
    });

    // ─── 11) Deduct userPaid from user’s account balance ─────────────────────────
    if (userPaid > account.balance + 0.001) {
      return NextResponse.json(
        { error: "Insufficient funds in user’s account" },
        { status: 400 }
      );
    }
    account.balance -= userPaid;
    await account.save();

    // ─── 12) Increase goal balance by userShare ──────────────────────────────────
    goal.balance = (goal.balance || 0) + userShare;
    await goal.save();

    // ─── 13) Create ExpenseSplit entries for all participants ────────────────────
    //
    // Each ExpenseSplit records:
    //   - expense:  this expense’s _id
    //   - hasPaid:  true if person appears in paidMap with >0
    //   - shareRate: fraction (if percent, value/100; if amount, shareAmt/totalBillAmount)
    //   - sharePercent: if splitType=“PERCENTAGE” then value; else (shareAmt/totalBillAmount)*100
    //   - shareAmount: the rupee share
    //   - paidAmount: paidMap[personId] or 0
    //   - people:  that person’s People._id
    //
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
        expense: expense._id,
        hasPaid: isPaid,
        shareRate,
        shareAmount: shareAmt,
        sharePercent: +sharePercent.toFixed(2),
        paidAmount: paidAmt,
        people: new mongoose.Types.ObjectId(pid),
      });
      splitDocs.push(splitDoc);
    }

    // ─── 14) Build lists of overpayers & underpayers ───────────────────────────────
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

    // ─── 15) Create Debt entries (proportional allocation) ────────────────────────
    const debtDocs: mongoose.Document[] = [];
    const currencyId = (account.currency as mongoose.Types.ObjectId) || null;

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
          expenseId: expense._id,
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

    // ─── 16) Create ExpenseAllocation for exactly userShare ───────────────────────
    const allocationId = new mongoose.Types.ObjectId().toHexString();
    await ExpenseAllocation.create({
      allocationId,
      expense: expense._id,
      goal: goalId,
      amount: mongoose.Types.Decimal128.fromString(userShare.toString()),
      allocatedAt: new Date(),
    });

    // ─── 17) Populate & return newly created Expense + Debts + Splits ────────────
    const created = await Expense.findById(expense._id)
      .populate("accountId", "name balance")
      .populate("categoryId", "name")
      .populate("typeId", "name")
      .populate("goalId", "name targetAmount targetDate balance");

    return NextResponse.json(
      { expense: created, debts: debtDocs, splits: splitDocs },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error in POST /api/expense:", err);
    if (err.message.toLowerCase().includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Bad Request" },
      { status: 400 }
    );
  }
}
