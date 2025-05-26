// src/app/api/account/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getUserFromToken } from '@/lib/auth';
import Account from '@/model/Account';

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

    const account = await Account.findOne({ _id: params.id, user: userId });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    return NextResponse.json(account);
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
    const { name, type, balance, currency } = await req.json();

    // Validation
    if (!name?.trim() || !type?.trim()) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }
    if (typeof balance !== 'number') {
      return NextResponse.json({ error: 'Balance must be a number' }, { status: 400 });
    }
    if (!currency?.trim()) {
      return NextResponse.json({ error: 'Currency ID is required' }, { status: 400 });
    }

    await dbConnect();
    const updated = await Account.findOneAndUpdate(
      { _id: params.id, user: userId },
      {
        name:     name.trim(),
        type:     type.trim(),
        balance,
        currency: currency.trim()
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
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

    const deleted = await Account.findOneAndDelete({ _id: params.id, user: userId });
    if (!deleted) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
