//  src/models/IncomeAllocation.ts 
import mongoose, { Schema, model } from 'mongoose';
import { IIncomeAllocation } from '../types';

const IncomeAllocationSchema = new Schema<IIncomeAllocation>({
income: { type: Schema.Types.ObjectId, ref: 'Income', required: true },
goal: { type: Schema.Types.ObjectId, ref: 'IncomeGoal', required: true },
amount: { type: Number, required: true },
allocatedAt: { type: Date, default: Date.now }
});

// fix index keys
IncomeAllocationSchema.index({ income: 1, goal: 1 });

export default mongoose.models.IncomeAllocation as mongoose.Model<IIncomeAllocation> || model<IIncomeAllocation>('IncomeAllocation', IncomeAllocationSchema);
