// src/app/api/category/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getUserFromToken } from '@/lib/auth';
import Category from '@/model/Category';

export async function POST(req: NextRequest) {
  try {
    // 1. Extract token from Authorization header or cookie
    let token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      token = req.cookies.get('accessToken')?.value;
    }
    // 2. Verify token → get userId
    const userId = getUserFromToken(token || '');

    // 3. Parse & validate body
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // 4. Connect to DB & create
    await dbConnect();
    const category = await Category.create({
      name: name.trim(),
      user: userId
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Extract token
    let token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      token = req.cookies.get('accessToken')?.value;
    }
    // 2. Verify token
    const userId = getUserFromToken(token || '');

    // 3. Connect & fetch
    await dbConnect();
    const categories = await Category.find({ user: userId }).sort({ name: 1 });
    return NextResponse.json(categories);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
