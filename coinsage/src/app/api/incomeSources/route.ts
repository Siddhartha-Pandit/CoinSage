// src/app/api/income-source/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getUserFromToken } from '@/lib/auth';
import IncomeSource from '@/model/IncomeSource';

async function getUserId(req: NextRequest) {
  let token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    token = req.cookies.get('accessToken')?.value;
  }
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
    const incomeSource = await IncomeSource.create({
      user: userId,
      name: name.trim()
    });

    return NextResponse.json(incomeSource, { status: 201 });
  } catch (err: any) {
    const status = err.message.includes('token') ? 401 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    await dbConnect();

    const list = await IncomeSource.find({ user: userId }).sort({ name: 1 });
    return NextResponse.json(list);
  } catch (err: any) {
    const status = err.message.includes('token') ? 401 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
