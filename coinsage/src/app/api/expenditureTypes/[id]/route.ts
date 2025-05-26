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

export async function PUT(req: NextRequest) {
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate
    const userId = await getUserId(req);

    // 2. Connect to DB
    await dbConnect();

    // 3. Delete only if it belongs to this user
    const deleted = await ExpenditureType.findOneAndDelete({
      _id: params.id,
      user: userId
    });

    if (!deleted) {
      return NextResponse.json(
        { error: 'Expenditure type not found' },
        { status: 404 }
      );
    }

    // 4. Success
    return NextResponse.json(
      { message: 'Expenditure type deleted successfully' }
    );
  } catch (err: any) {
    // 5. Error handling
    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    );
  }
}