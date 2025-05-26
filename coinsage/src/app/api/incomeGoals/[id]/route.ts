// src/app/api/income-goal/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getUserFromToken } from '@/lib/auth';
import IncomeGoal from '@/model/IncomeGoal';

async function getUserId(req: NextRequest) {
  let token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) token = req.cookies.get('accessToken')?.value;
  return getUserFromToken(token || '');
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    await dbConnect();

    const goal = await IncomeGoal.findOne({ _id: params.id, user: userId });
    if (!goal) {
      return NextResponse.json({ error: 'Income goal not found' }, { status: 404 });
    }
    return NextResponse.json(goal);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    const {
      name,
      targetAmount,
      targetDate,
      balance,
      allocationRate,
      account
    } = await req.json();

    // Basic validation
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (typeof allocationRate !== 'number') {
      return NextResponse.json({ error: 'allocationRate must be a number' }, { status: 400 });
    }

    // Build the update object explicitly
    const updateFields: Record<string, any> = { name: name.trim(), allocationRate };

    if (typeof targetAmount === 'number') {
      updateFields.targetAmount = targetAmount;
    }
    if (targetDate) {
      updateFields.targetDate = new Date(targetDate);
    }
    if (typeof balance === 'number') {
      updateFields.balance = balance;
    }
    if (account) {
      updateFields.account = account;
    }

    await dbConnect();
    const updated = await IncomeGoal.findOneAndUpdate(
      { _id: params.id, user: userId },
      updateFields,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Income goal not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    await dbConnect();

    const deleted = await IncomeGoal.findOneAndDelete({ _id: params.id, user: userId });
    if (!deleted) {
      return NextResponse.json({ error: 'Income goal not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Income goal deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
