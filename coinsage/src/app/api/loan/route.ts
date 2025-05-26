// src/app/api/loan/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Loan from "@/model/Loan";
import Account from "@/model/Account";
import People from "@/model/People";
import { getUserFromToken } from "@/lib/auth";
import { Types } from "mongoose";

export async function getUserId(req: NextRequest): Promise<Types.ObjectId> {
  const authHeader = req.headers.get("authorization") || "";
  const tokenInHeader = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : "";
  const tokenInCookie = req.cookies.get("accessToken")?.value || "";
  const token = tokenInHeader || tokenInCookie;

  const userIdStr = getUserFromToken(token);
  if (!userIdStr) throw new Error("Unauthorized");
  return new Types.ObjectId(userIdStr);
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const userId = await getUserId(req);

    const loans = await Loan.find({ user: userId })
      // .populate(["lender", "borrower", "account", "expense"])
      .lean();

    return NextResponse.json(loans);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const userId = await getUserId(req);

    const body = await req.json();
    const { lender, borrower, amount, date, notes, settled, account, expense } =
      body;

    if (!lender || !borrower || !amount || !date) {
      return NextResponse.json(
        { error: "Missing required fields (lender, borrower, amount, date)" },
        { status: 400 }
      );
    }

    // Validate People
    const [lenderPerson, borrowerPerson] = await Promise.all([
      People.findById(lender).lean(),
      People.findById(borrower).lean(),
    ]);

    if (!lenderPerson || !borrowerPerson) {
      return NextResponse.json(
        { error: "Lender or borrower not found" },
        { status: 404 }
      );
    }

    // Handle account balance updates
    if (account) {
      const acc = await Account.findOne({ _id: account, user: userId });
      if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

      const isLenderUser = lenderPerson.isUser && lenderPerson.user.equals(userId);
      const isBorrowerUser = borrowerPerson.isUser && borrowerPerson.user.equals(userId);

      if (isLenderUser && !isBorrowerUser) {
        acc.balance -= amount;
      } else if (isBorrowerUser && !isLenderUser) {
        acc.balance += amount;
      }
      await acc.save();
    }

    // Create loan
    const loan = await Loan.create({
      lender,
      borrower,
      amount,
      date,
      notes,
      settled: settled || false,
      account: account || null,
      expense: expense || null,
      user: userId,
    });

    // Populate and return
    const populatedLoan = await Loan.findById(loan._id);
      // .populate(["lender", "borrower", "account", "expense"]);

    return NextResponse.json(populatedLoan, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/loan error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}