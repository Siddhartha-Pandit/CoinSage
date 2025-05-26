// src/model/Debt.ts
import mongoose, { Schema, model } from 'mongoose';
import { IDebt } from '../types';

const DebtSchema = new Schema<IDebt>({
  payerType: { type: String, enum: ['User', 'People'], required: true },
  payerId:   { type: Schema.Types.ObjectId, required: true },
  payeeType: { type: String, enum: ['User', 'People'], required: true },
  payeeId:   { type: Schema.Types.ObjectId, required: true },
  expenseId: { type: Schema.Types.ObjectId, ref: 'Expense', required: true },
  originalAmount: { type: Number, required: true },
  remainingAmount:{ type: Number, required: true },
  currencyId: { type: Schema.Types.ObjectId, ref: 'Currency', required: true },
  createdAt:  { type: Date, default: Date.now },
  date:       { type: Date, default: null },
  status:     { type: String, required: true, default: 'PENDING' },
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true }
});
  
DebtSchema.index({ payerId: 1, payeeId: 1, status: 1 });

export default (mongoose.models.Debt as mongoose.Model<IDebt>)
  || model<IDebt>('Debt', DebtSchema);
