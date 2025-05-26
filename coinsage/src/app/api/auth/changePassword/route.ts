// coinsage/src/app/api/auth/changePassword/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/model/User';
import { hashPassword, comparePassword } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    await dbConnect();

    // Grab the userId injected by middleware
    const userId = req.headers.get('x-user-id');
    if (!userId || !mongoose.isValidObjectId(userId)) {
      console.error('Invalid user ID format:', userId);
      return NextResponse.json(
        {
          success: false,
          error: 'session_expired',
          message: 'Session expired. Please login again.',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const { oldPassword, newPassword } = await req.json().catch(() => ({}));

    // Validate input
    if (!oldPassword?.trim() || !newPassword?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'missing_fields',
          message: 'Both current and new passwords are required',
        },
        { status: 400 }
      );
    }

    // Find the user (include password)
    const user = await User.findById(userId).select('+password');
    if (!user) {
      console.error('User not found for ID:', userId);
      return NextResponse.json(
        {
          success: false,
          error: 'user_not_found',
          message: 'Account does not exist',
        },
        { status: 404 }
      );
    }

    // Verify old password
    const isValid = await comparePassword(oldPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'invalid_credentials',
          message: 'Current password is incorrect',
        },
        { status: 401 }
      );
    }

    // Hash and save the new password
    user.password = await hashPassword(newPassword);
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'server_error',
        message: 'Please try again later',
      },
      { status: 500 }
    );
  }
}
