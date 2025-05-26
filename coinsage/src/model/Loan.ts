import { Schema, model, models } from "mongoose";
import { ILoan } from "@/types";

const LoanSchema = new Schema<ILoan>({
  lender: { type: Schema.Types.ObjectId, ref: "People", required: true },
  borrower: { type: Schema.Types.ObjectId, ref: "People", required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  notes: { type: String, default: null },
  settled: { type: Boolean, default: false },
  account: { type: Schema.Types.ObjectId, ref: "Account", required: false },
  expense: { type: Schema.Types.ObjectId, ref: "Expense", required: false }, // Added expense field
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export default models.Loan || model<ILoan>("Loan", LoanSchema);