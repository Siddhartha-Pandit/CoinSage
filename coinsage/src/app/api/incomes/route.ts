// src/app/api/income/route.ts
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

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const {
      name,
      amount,
      source: sourceId,
      date: dateString,
      notes,
      destAccount: destAccountId,
      allocations: goalIds,
    } = await req.json();

    // 1. Basic validation
    if (!name?.trim())
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (typeof amount !== 'number' || amount <= 0)
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    if (!sourceId?.trim())
      return NextResponse.json({ error: 'IncomeSource ID is required' }, { status: 400 });
    if (!dateString)
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    if (!destAccountId?.trim())
      return NextResponse.json({ error: 'Destination Account ID is required' }, { status: 400 });
    if (!Array.isArray(goalIds) || goalIds.length === 0)
      return NextResponse.json({ error: 'At least one goal ID must be provided' }, { status: 400 });

    await dbConnect();

    // 2. Verify source & account ownership
    const [incSource, account] = await Promise.all([
      IncomeSource.findOne({ _id: sourceId, user: userId }),
      Account.findOne({ _id: destAccountId, user: userId }),
    ]);
    if (!incSource)
      return NextResponse.json({ error: 'IncomeSource not found' }, { status: 404 });
    if (!account)
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // 3. Fetch & verify all specified goals
    const goals = await IncomeGoal.find({
      _id: { $in: goalIds },
      user: userId,
    });
    if (goals.length !== goalIds.length) {
      return NextResponse.json(
        { error: 'One or more IncomeGoals not found or not owned by you' },
        { status: 404 }
      );
    }

    // 4. Create the Income record
    const incomeDate = new Date(dateString);
    const income = await Income.create({
      user: userId,
      name: name.trim(),
      amount,
      source: sourceId,
      date: incomeDate,
      notes: notes?.trim() || '',
      destAccount: destAccountId,
    });

    // 5. Update account balance
    account.balance += amount;
    await account.save();

    // 6. Allocate across provided goals
    const allocationPromises: Promise<any>[] = [];
    const allocationDocs: Array<{
      user: string;                                    // ← added `user` here
      income: mongoose.Types.ObjectId;
      goal: mongoose.Types.ObjectId;
      amount: number;
    }> = [];

    for (const goal of goals) {
      const rate = Number(goal.allocationRate) || 0;
      const allocAmt = Math.floor((amount * rate) / 100);
      if (allocAmt > 0) {
        goal.balance = (goal.balance || 0) + allocAmt;
        allocationPromises.push(goal.save());
        allocationDocs.push({
          user:   userId,     // now allowed by the type
          income: income._id,
          goal:   goal._id,
          amount: allocAmt,
        });
      }
    }

    // save goals and then insert allocations
    await Promise.all(allocationPromises);
    if (allocationDocs.length) {
      await IncomeAllocation.insertMany(allocationDocs);
    }

    // 7. Return the newly created Income, populated
    const created = await Income.findById(income._id)
      .populate('source', 'name')
      .populate('destAccount', 'name balance')
      .lean();

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('[INCOME_POST_ERROR]', err);
    const msg = err.message || 'Something went wrong';
    const status = msg.toLowerCase().includes('token') ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    await dbConnect();

    const incomes = await Income.find({ user: userId })
      .populate('source', 'name')
      .populate('destAccount', 'name balance')
      .sort({ date: -1 });

    const result = await Promise.all(
      incomes.map(async inc => {
        const allocs = await IncomeAllocation.find({ income: inc._id })
          .populate('goal', 'name allocationRate balance');
        return { ...inc.toObject(), allocations: allocs.map(a => a.toObject()) };
      })
    );

    return NextResponse.json(result);
  } catch (err: any) {
    const msg = err.message || 'Something went wrong';
    const code = msg.toLowerCase().includes('token') ? 401 : 400;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
