import mongoose, { Document, Schema, model } from 'mongoose';
import { IExpenseAllocation } from '@/types';
const ExpenseAllocationSchema = new Schema<IExpenseAllocation>(
  {
    allocationId: { type: String, required: true, unique: true },
    expense: { type: Schema.Types.ObjectId, ref: 'Expense', required: true },
    goal: { type: Schema.Types.ObjectId, ref: 'IncomeGoal', required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    allocatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'expense_allocations',
    timestamps: false, // only createdAt via allocatedAt
  }
);

// ✅ Corrected:
export default mongoose.models.ExpenseAllocation as mongoose.Model<IExpenseAllocation>
  || model<IExpenseAllocation>('ExpenseAllocation', ExpenseAllocationSchema);
