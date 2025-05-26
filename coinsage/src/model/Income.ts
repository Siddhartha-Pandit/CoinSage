// src/models/Income.ts 
import mongoose, { Schema, model } from 'mongoose';
import { IIncome } from '../types';
const IncomeSchema = new Schema<IIncome>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 150 },
  amount: { type: Number, required: true },
  source: { type: Schema.Types.ObjectId, ref: 'IncomeSource', required: true },
  date: { type: Date, required: true },
  notes: { type: String, default: null },
  destAccount: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
});

export default mongoose.models.Income as mongoose.Model<IIncome> || model<IIncome>('Income', IncomeSchema);