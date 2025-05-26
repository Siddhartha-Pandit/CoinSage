
//  src/models/IncomeGoal.ts 
import mongoose, { Schema, model } from 'mongoose';
import { IIncomeGoal } from '../types';

const IncomeGoalSchema = new Schema<IIncomeGoal>({
user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
name: { type: String, required: true, maxlength: 50 },
targetAmount: { type: Number, required: false },
targetDate: { type: Date, required: false },
balance: { type: Number, required: false },
allocationRate: { type: Number, required: true },
account: { type: Schema.Types.ObjectId, ref: 'Account', required: true }
});

export default mongoose.models.IncomeGoal as mongoose.Model<IIncomeGoal> || model<IIncomeGoal>('IncomeGoal', IncomeGoalSchema);
