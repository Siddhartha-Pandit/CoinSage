
//  src/model/Expense.ts 
import mongoose, { Schema, model } from 'mongoose';
import { IExpense } from '../types';

const ExpenseSchema = new Schema<IExpense>({
userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
goalId: { type: Schema.Types.ObjectId, ref: 'IncomeGoal', required: true },
name: { type: String, required: true, maxlength: 150 },
totalAmount: { type: Number, required: true },
date: { type: Date, required: true },
categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
typeId: { type: Schema.Types.ObjectId, ref: 'ExpenditureType', required: true },
splitType: { type: String, required: true, default: 'EQUAL' },
notes: { type: String, default: null },
createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Expense as mongoose.Model<IExpense> || model<IExpense>('Expense', ExpenseSchema);
