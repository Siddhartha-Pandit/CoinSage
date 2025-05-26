
//  src/models/IncomeSource.ts 
import mongoose, { Schema, model } from 'mongoose';
import { IIncomeSource } from '../types';

const IncomeSourceSchema = new Schema<IIncomeSource>({
user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
name: { type: String, required: true, maxlength: 50 }
});

export default mongoose.models.IncomeSource as mongoose.Model<IIncomeSource> || model<IIncomeSource>('IncomeSource', IncomeSourceSchema);
