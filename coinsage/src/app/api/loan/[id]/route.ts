// src/app/api/loan/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import Loan from "@/model/Loan";
import Account from "@/model/Account";
import People from "@/model/People";
import dbConnect from "@/lib/dbConnect";
import { getUserFromToken } from "@/lib/auth";
import { Types } from "mongoose";

export async function getUserId(req: NextRequest): Promise<Types.ObjectId> {
  const authHeader = req.headers.get("authorization") || "";
  const tokenInHeader = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : "";
  const tokenInCookie = req.cookies.get("accessToken")?.value || "";
  const token = tokenInHeader || tokenInCookie;

  const userIdStr = getUserFromToken(token); // returns string or throws
  if (!userIdStr) throw new Error("Unauthorized");
  return new Types.ObjectId(userIdStr);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  try {
    const userId = await getUserId(req);

    const loan = await Loan.findOne({ _id: params.id, user: userId })
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }
    return NextResponse.json(loan);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  try {
    const userId = await getUserId(req);

    // 1) Fetch existing loan
    const oldLoan = await Loan.findOne({ _id: params.id, user: userId });
    if (!oldLoan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    const prevAmount = oldLoan.amount;
    const prevAccountId = oldLoan.account?.toString();

    // 2) Determine old lender/borrower roles
    const oldLender = await People.findById(oldLoan.lender).lean();
    const oldBorrower = await People.findById(oldLoan.borrower).lean();

    const oldLenderIsUser =
      !!oldLender &&
      oldLender.isUser === true &&
      oldLender.user.toString() === userId.toString();
    const oldBorrowerIsUser =
      !!oldBorrower &&
      oldBorrower.isUser === true &&
      oldBorrower.user.toString() === userId.toString();

    // 3) Revert old account effect (only if an account was recorded)
    if (prevAccountId) {
      const oldAccount = await Account.findOne({
        _id: prevAccountId,
        user: userId,
      });
      if (oldAccount) {
        if (oldLenderIsUser && !oldBorrowerIsUser) {
          // User was lender → add back prevAmount
          oldAccount.balance += prevAmount;
        } else if (oldBorrowerIsUser && !oldLenderIsUser) {
          // User was borrower → subtract prevAmount
          oldAccount.balance -= prevAmount;
        }
        await oldAccount.save();
      }
    }

    // 4) Parse new data
    const {
      lender: newLender,
      borrower: newBorrower,
      amount: newAmount,
      date: newDate,
      notes: newNotes,
      settled: newSettled,
      account: newAccountId,
      expense: newExpense,
    } = await req.json();

    // 5) Fetch new lender/borrower roles
    const newLenderPerson = await People.findById(newLender).lean();
    const newBorrowerPerson = await People.findById(newBorrower).lean();

    if (!newLenderPerson) {
      return NextResponse.json({ error: "New lender not found" }, { status: 404 });
    }
    if (!newBorrowerPerson) {
      return NextResponse.json({ error: "New borrower not found" }, { status: 404 });
    }

    const newLenderIsUser =
      newLenderPerson.isUser === true &&
      newLenderPerson.user.toString() === userId.toString();
    const newBorrowerIsUser =
      newBorrowerPerson.isUser === true &&
      newBorrowerPerson.user.toString() === userId.toString();

    // 6) Apply new account effect
    if (newAccountId) {
      const newAccount = await Account.findOne({
        _id: newAccountId,
        user: userId,
      });
      if (!newAccount) {
        return NextResponse.json({ error: "New account not found" }, { status: 404 });
      }

      if (newLenderIsUser && !newBorrowerIsUser) {
        // User is now lender → deduct newAmount
        newAccount.balance -= newAmount;
      } else if (newBorrowerIsUser && !newLenderIsUser) {
        // User is now borrower → add newAmount
        newAccount.balance += newAmount;
      }
      await newAccount.save();
    }

    // 7) Update the loan document fields
    oldLoan.set({
      lender: newLender,
      borrower: newBorrower,
      amount: newAmount,
      date: new Date(newDate),
      notes: newNotes,
      settled: newSettled,
      account: newAccountId || null,
      expense: newExpense || null,
    });
    await oldLoan.save();

    const updatedLoan = await Loan.findById(oldLoan._id)
    // .populate(
    //   "lender borrower account expense"
    // );
    return NextResponse.json(updatedLoan);
  } catch (err: any) {
    console.error("PUT /api/loan/[id] error:", err);
    const status = err.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  try {
    const userId = await getUserId(req);

    const loan = await Loan.findOne({ _id: params.id, user: userId });
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    // 1) Determine roles for deletion
    const lenderPerson = await People.findById(loan.lender).lean();
    const borrowerPerson = await People.findById(loan.borrower).lean();

    const lenderIsUser =
      !!lenderPerson &&
      lenderPerson.isUser === true &&
      lenderPerson.user.toString() === userId.toString();

    const borrowerIsUser =
      !!borrowerPerson &&
      borrowerPerson.isUser === true &&
      borrowerPerson.user.toString() === userId.toString();

    // 2) Adjust account before deletion (if an account was recorded)
    if (loan.account) {
      const acc = await Account.findOne({
        _id: loan.account,
        user: userId,
      });
      if (acc) {
        if (lenderIsUser && !borrowerIsUser) {
          // User was lender → refund
          acc.balance += loan.amount;
        } else if (borrowerIsUser && !lenderIsUser) {
          // User was borrower → subtract
          acc.balance -= loan.amount;
        }
        await acc.save();
      }
    }

    // 3) Delete the loan
    await loan.deleteOne();
    return NextResponse.json({ message: "Loan deleted successfully" });
  } catch (err: any) {
    console.error("DELETE /api/loan/[id] error:", err);
    const status = err.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
