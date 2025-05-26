// src/app/api/account/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getUserFromToken } from '@/lib/auth';
import Account from '@/model/Account';

async function getUserId(req: NextRequest) {
  let token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) token = req.cookies.get('accessToken')?.value;
  return getUserFromToken(token || '');
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { name, type, balance, currency } = await req.json();

    // Basic validation
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
    const account = await Account.create({
      user:     userId,
      name:     name.trim(),
      type:     type.trim(),
      balance,
      currency: currency.trim()
    });

    return NextResponse.json(account, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message.includes('token') ? 401 : 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    await dbConnect();

    const accounts = await Account.find({ user: userId }).sort({ name: 1 });
    return NextResponse.json(accounts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message.includes('token') ? 401 : 400 });
  }
}
