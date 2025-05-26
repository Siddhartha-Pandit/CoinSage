// src/app/api/expenditure-type/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getUserFromToken } from '@/lib/auth';
import ExpenditureType from '@/model/ExpenditureType';

async function getUserId(req: NextRequest) {
  let token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) token = req.cookies.get('accessToken')?.value;
  return getUserFromToken(token || '');
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await dbConnect();
    const expType = await ExpenditureType.create({
      name: name.trim(),
      user: userId
    });

    return NextResponse.json(expType, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    await dbConnect();
    const list = await ExpenditureType.find({ user: userId }).sort({ name: 1 });
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
