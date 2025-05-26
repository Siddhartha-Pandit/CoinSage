
//  src/model/ExpenditureType.ts 
import mongoose, { Schema, model } from 'mongoose';
import { IExpenditureType } from '../types';

const ExpenditureTypeSchema = new Schema<IExpenditureType>({
user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
name: { type: String, required: true, maxlength: 50 }
});

export default mongoose.models.ExpenditureType as mongoose.Model<IExpenditureType> || model<IExpenditureType>('ExpenditureType', ExpenditureTypeSchema);
