// src/app/api/incomeGoal/route.ts

import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import { getUserFromToken } from '@/lib/auth'

// register related models so that populate() works correctly:
import Account     from '@/model/Account'
import IncomeGoal  from '@/model/IncomeGoal'

/**
 * Extracts the user ID from either the Authorization header (Bearer token)
 * or from a cookie named "accessToken". Returns the userId (as a string).
 * Throws an error if the token is invalid or missing.
 */
async function getUserId(req: NextRequest): Promise<string> {
  let token = req.headers.get('authorization')?.split(' ')[1]
  if (!token) {
    token = req.cookies.get('accessToken')?.value || ''
  }
  return getUserFromToken(token)
}

/**
 * POST /api/incomeGoal
 * Body JSON (example):
 * {
 *   "name": "Emergency Fund",
 *   "targetAmount": 50000,
 *   "targetDate": "2025-12-31T00:00:00.000Z",   // optional
 *   "balance": 0,                              // optional (default: 0)
 *   "allocationRate": 30,
 *   "account": "6829a685c732b97aac7a1043"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)

    const {
      name,
      targetAmount,
      targetDate,
      balance,
      allocationRate,
      account
    } = await req.json()

    // ─── 1) Basic validation ───────────────────────────────────────────────
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string.' },
        { status: 400 }
      )
    }

    if (
      typeof allocationRate !== 'number' ||
      isNaN(allocationRate) ||
      allocationRate < 0
    ) {
      return NextResponse.json(
        { error: 'allocationRate must be a non-negative number.' },
        { status: 400 }
      )
    }

    if (typeof targetAmount !== 'number' || isNaN(targetAmount) || targetAmount < 0) {
      return NextResponse.json(
        { error: 'targetAmount must be a non-negative number.' },
        { status: 400 }
      )
    }

    if (!account || typeof account !== 'string' || !account.trim()) {
      return NextResponse.json(
        { error: 'Account ID is required and must be a non-empty string.' },
        { status: 400 }
      )
    }

    if (targetDate && isNaN(Date.parse(targetDate))) {
      return NextResponse.json(
        { error: 'targetDate must be a valid ISO date string.' },
        { status: 400 }
      )
    }

    // ─── 2) Connect to DB ─────────────────────────────────────────────────
    await dbConnect()

    // ─── 3) Verify ownership of the Account ────────────────────────────────
    const accountDoc = await Account.findOne({ _id: account, user: userId })
    if (!accountDoc) {
      return NextResponse.json(
        { error: 'Account not found or not owned by the current user.' },
        { status: 404 }
      )
    }

    // ─── 4) Create IncomeGoal document ─────────────────────────────────────
    const newGoal = await IncomeGoal.create({
      user:           userId,
      name:           name.trim(),
      targetAmount,
      targetDate:     targetDate ? new Date(targetDate) : undefined,
      balance:        typeof balance === 'number' ? balance : 0,
      allocationRate,
      account
    })

    return NextResponse.json(newGoal, { status: 201 })
  } catch (err: any) {
    // If getUserFromToken threw due to missing/invalid token, err.message should mention token.
    const status = err.message?.toLowerCase().includes('token') ? 401 : 400
    return NextResponse.json({ error: err.message }, { status })
  }
}

/**
 * GET /api/incomeGoal
 * Returns all IncomeGoal documents for the authenticated user, populated with
 * the related Account’s name & balance.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    await dbConnect()

    // Find all goals belonging to this user, and populate the "account" field
    const goals = await IncomeGoal.find({ user: userId })
      .populate('account', 'name balance')
      .sort({ targetDate: 1 }) // earliest targetDate first

    return NextResponse.json(goals, { status: 200 })
  } catch (err: any) {
    const status = err.message?.toLowerCase().includes('token') ? 401 : 500
    return NextResponse.json({ error: err.message }, { status })
  }
}
