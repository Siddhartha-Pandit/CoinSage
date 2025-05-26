// src/app/api/income-source/[id]/route.ts
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    await dbConnect();

    const source = await IncomeSource.findOne({ _id: params.id, user: userId });
    if (!source) {
      return NextResponse.json({ error: 'Income source not found' }, { status: 404 });
    }
    return NextResponse.json(source);
  } catch (err: any) {
    const status = err.message.includes('token') ? 401 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await dbConnect();
    const updated = await IncomeSource.findOneAndUpdate(
      { _id: params.id, user: userId },
      { name: name.trim() },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Income source not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err: any) {
    const status = err.message.includes('token') ? 401 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    await dbConnect();

    const deleted = await IncomeSource.findOneAndDelete({
      _id: params.id,
      user: userId
    });
    if (!deleted) {
      return NextResponse.json({ error: 'Income source not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Income source deleted successfully' });
  } catch (err: any) {
    const status = err.message.includes('token') ? 401 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
