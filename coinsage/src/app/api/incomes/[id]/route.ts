// src/app/api/income/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getUserFromToken } from '@/lib/auth';
import mongoose from 'mongoose';
import Account from '@/model/Account';
import IncomeSource from '@/model/IncomeSource';
import IncomeGoal from '@/model/IncomeGoal';
import Income from '@/model/Income';
import IncomeAllocation from '@/model/IncomeAllocation';

async function getUserId(req: NextRequest) {
  let token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) token = req.cookies.get('accessToken')?.value;
  return getUserFromToken(token || '');
}

// ------------------------------
// GET /api/income/:id
// ------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    await dbConnect();

    // 1. Fetch the income (ensuring it belongs to this user)
    const income = await Income.findOne({ _id: params.id, user: userId })
      .populate('source', 'name')
      .populate('destAccount', 'name balance');

    if (!income) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    // 2. Fetch all allocations for this income
    const allocations = await IncomeAllocation.find({ income: income._id })
      .populate('goal', 'name allocationRate balance');

    return NextResponse.json({
      ...income.toObject(),
      allocations: allocations.map((alloc) => alloc.toObject())
    });
  } catch (err: any) {
    const message = err?.message || 'Something went wrong';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// ------------------------------
// PUT /api/income/:id
// ------------------------------
// Must update:
//  • Income document fields (name, amount, source, date, notes, destAccount)  
//  • Adjust the old destination account’s balance by subtracting the old amount, then add the new amount to the (possibly new) destAccount.  
//  • Remove all existing IncomeAllocation records for this income:
//      – For each such allocation: subtract that allocation’s amount from its goal.balance, then delete the allocation doc.  
//  • Recompute new allocations for *all* of the user’s current IncomeGoals based on the new amount and each goal’s allocationRate:  
//      – For each goal, compute `newAllocAmt = Math.round(newAmount * (goal.allocationRate/100))`.  
//      – goal.balance += newAllocAmt;  create a fresh IncomeAllocation with `{ income: income._id, goal: goal._id, amount: newAllocAmt }`.  
//  • Save everything and return the updated Income (with new allocations).


export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Get the logged‐in user’s ID
    const userId = await getUserId(req);

    // 2. Pull fields from the request body
    const {
      name,
      amount: newAmount,
      source: newSourceId,
      date: newDateString,
      notes: newNotes,
      destAccount: newDestAccountId,
    } = await req.json();

    // 3. Basic validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    if (typeof newAmount !== "number" || newAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }
    if (!newSourceId || !newSourceId.trim()) {
      return NextResponse.json(
        { error: "Income source ID is required" },
        { status: 400 }
      );
    }
    if (!newDestAccountId || !newDestAccountId.trim()) {
      return NextResponse.json(
        { error: "Destination Account ID is required" },
        { status: 400 }
      );
    }

    // 4. Ensure Mongoose is connected
    await dbConnect();

    // 5. Find the existing Income (and verify user ownership)
    const income = await Income.findOne({
      _id: params.id,
      user: userId,
    });
    if (!income) {
      return NextResponse.json(
        { error: "Income not found" },
        { status: 404 }
      );
    }

    // 6. Load both “old” and “new” Account documents
    //    so we can subtract the old amount from the old account and add the new amount to the new account.
    const [oldAccount, newAccount] = await Promise.all([
      Account.findOne({ _id: income.destAccount, user: userId }),
      Account.findOne({ _id: newDestAccountId, user: userId }),
    ]);
    if (!newAccount) {
      return NextResponse.json(
        { error: "Destination account not found" },
        { status: 404 }
      );
    }

    // 7. Adjust balances on the accounts:
    //    • If the user didn’t actually change the destination account, just do a “delta”:
    if (oldAccount && oldAccount._id.equals(newAccount._id)) {
      const delta = newAmount - income.amount;
      oldAccount.balance = oldAccount.balance + delta;
      await oldAccount.save();
    } else {
      //    • Otherwise, “undo” the old income on the old account, and apply the new income on the new account:
      if (oldAccount) {
        oldAccount.balance = oldAccount.balance - income.amount;
        await oldAccount.save();
      }
      newAccount.balance = newAccount.balance + newAmount;
      await newAccount.save();
    }

    // 8. Pull all existing allocations for this Income so we can roll them back from each goal
    const oldAllocations = await IncomeAllocation.find({
      income: income._id,
    });

    // We will keep track of every goal ID that was allocated to, so we can recalc.
    const goalIdsToRecalc = new Set<string>();

    // A list of “save” promises (for undoing old allocations on IncomeGoal)
    const rollbackPromises: Promise<any>[] = [];

    for (const alloc of oldAllocations) {
      const goalId = alloc.goal.toString();
      goalIdsToRecalc.add(goalId);

      // 8a. Fetch the goal and subtract this old allocation from its balance
      const goalDoc = await IncomeGoal.findOne({
        _id: goalId,
        user: userId,
      });
      if (goalDoc) {
        goalDoc.balance = (goalDoc.balance || 0) - alloc.amount;
        rollbackPromises.push(goalDoc.save());
      }

      // 8b. Delete the old allocation document
      await alloc.deleteOne();
    }
    // Wait for all the “undo” saves to finish
    await Promise.all(rollbackPromises);

    // 9. Update the Income document’s fields
    income.name = name.trim();
    income.amount = newAmount;
    income.source = newSourceId.trim();
    income.date = newDateString ? new Date(newDateString) : income.date;
    income.notes = newNotes?.trim() ?? income.notes;
    income.destAccount = newDestAccountId.trim();
    await income.save();

    // 10. Re‐calculate allocations for each affected goal:
    //     • Load all goals that were in goalIdsToRecalc
    const goalsToRecalc = await IncomeGoal.find({
      _id: { $in: Array.from(goalIdsToRecalc) },
      user: userId,
    });

    // A list of “save goal” promises and a batch array for new allocations
    const reAllocPromises: Promise<any>[] = [];
    const newAllocDocs: {
      income: mongoose.Types.ObjectId;
      goal: mongoose.Types.ObjectId;
      amount: number;
    }[] = [];

    for (const goalDoc of goalsToRecalc) {
      // 10a. Determine the new allocation amount as floor((newAmount * allocationRate)/100)
      const rate = Number(goalDoc.allocationRate) || 0;
      const newAllocAmt = Math.floor((newAmount * rate) / 100);

      if (newAllocAmt > 0) {
        // 10b. Add that to the goal’s balance
        goalDoc.balance = (goalDoc.balance || 0) + newAllocAmt;
        reAllocPromises.push(goalDoc.save());

        // 10c. Queue up a new IncomeAllocation document to insert
        newAllocDocs.push({
          income: income._id,
          goal: goalDoc._id,
          amount: newAllocAmt,
        });
      }
    }

    // Wait for all the goal‐balance updates to finish
    await Promise.all(reAllocPromises);

    // 10d. Insert the new IncomeAllocation docs in one batch (if any exist)
    if (newAllocDocs.length > 0) {
      await IncomeAllocation.insertMany(newAllocDocs);
    }

    // 11. Finally, re‐fetch the updated Income (with its populated fields) and the fresh allocations
    const updatedIncome = await Income.findById(income._id)
      .populate("source", "name")
      .populate("destAccount", "name balance");

    const freshAllocations = await IncomeAllocation.find({
      income: income._id,
    }).populate("goal", "name allocationRate balance");

    // 12. Return everything in JSON
    return NextResponse.json({
      ...updatedIncome!.toObject(),
      allocations: freshAllocations.map((a) => a.toObject()),
    });
  } catch (err: any) {
    console.error("[INCOME_PUT_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 400 }
    );
  }
}

// ------------------------------
// DELETE /api/income/:id
// ------------------------------
// Steps:
//  1. Find and delete the Income (ensure it belongs to user).  
//  2. Subtract income.amount from its destination account’s balance.  
//  3. Find ALL IncomeAllocation records for that income; for each, subtract that allocation’s amount from its goal.balance, delete the allocation record.  
//  4. Return confirmation message.

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Get the logged‐in user’s ID
    const userId = await getUserId(req);

    // 2. Ensure Mongoose is connected
    await dbConnect();

    // 3. Find and delete the Income (only if it belongs to this user)
    const income = await Income.findOneAndDelete({
      _id: params.id,
      user: userId,
    });
    if (!income) {
      return NextResponse.json(
        { error: "Income not found" },
        { status: 404 }
      );
    }

    // 4. Subtract the deleted income’s amount from its destination account (if it exists)
    const account = await Account.findOne({
      _id: income.destAccount,
      user: userId,
    });
    if (account) {
      account.balance = (account.balance || 0) - income.amount;
      await account.save();
    }

    // 5. Find all allocations for this income so we can roll them back from each goal
    const allocations = await IncomeAllocation.find({
      income: income._id,
    });

    // We’ll batch‐save goal adjustments
    const goalRollbackPromises: Array<Promise<any>> = [];

    for (const alloc of allocations) {
      // 5a. Load the goal tied to this allocation and subtract the allocation amount
      const goalDoc = await IncomeGoal.findOne({
        _id: alloc.goal,
        user: userId,
      });
      if (goalDoc) {
        goalDoc.balance = (goalDoc.balance || 0) - alloc.amount;
        goalRollbackPromises.push(goalDoc.save());
      }

      // 5b. Delete this allocation document
      await alloc.deleteOne();
    }

    // 6. Wait for all goal‐balance rollbacks to finish
    await Promise.all(goalRollbackPromises);

    // 7. Return a success message
    return NextResponse.json(
      { message: "Income deleted and all balances adjusted." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[INCOME_DELETE_ERROR]", err);
    const message = err.message || "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}