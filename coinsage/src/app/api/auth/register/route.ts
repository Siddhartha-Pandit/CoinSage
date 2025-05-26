// coinsage/src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/model/User';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing fields' },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already in use' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, password: passwordHash });

    // Sign a token with { id, email }, using the updated helper
    const accessToken = signToken(user);

    const response = NextResponse.json(
      {
        success: true,
        user: { id: user._id, name, email },
        accessToken,
      },
      { status: 201 }
    );

    response.cookies.set({
      name: 'accessToken',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
