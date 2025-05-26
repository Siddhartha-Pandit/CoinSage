// model/ExpenseSplit.ts
import mongoose, { Schema } from "mongoose";
import { IExpenseSplit } from "../types";

const ExpenseSplitSchema: Schema = new Schema({
  expense: {
    type: Schema.Types.ObjectId,
    ref: "Expense",
    required: true,
  },
  hasPaid: { type: Boolean, default: false },
  shareRate: { type: Number },
  shareAmount: { type: Number },
  sharePercent: { type: Number },
  paidAmount: { type: Number },
  people: { type: Schema.Types.ObjectId, ref: "People", required: true },
});

export default (mongoose.models
  .ExpenseSplit as mongoose.Model<IExpenseSplit>) ||
  mongoose.model<IExpenseSplit>("ExpenseSplit", ExpenseSplitSchema);
