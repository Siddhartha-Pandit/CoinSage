
//  src/models/ExpenseShare.ts 
import mongoose, { Schema, model } from 'mongoose';
import { IExpenseShare } from '../types';

const ExpenseShareSchema = new Schema<IExpenseShare>({
expenseId: { type: Schema.Types.ObjectId, ref: 'Expense', required: true },
userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
shareAmount: { type: Number, required: true },
paidAmount: { type: Number, required: true, default: 0.00 },
settled: { type: Boolean, required: true, default: false },
settledAt: { type: Date, default: null },
peopleId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
date: { type: Date, required: true },

});

ExpenseShareSchema.index({ expenseId: 1, userId: 1 });

export default mongoose.models.ExpenseShare as mongoose.Model<IExpenseShare> || model<IExpenseShare>('ExpenseShare', ExpenseShareSchema);
