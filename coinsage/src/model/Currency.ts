//  src/models/Currency.ts 
import mongoose, { Schema, model } from 'mongoose';
import { ICurrency } from '../types';

const CurrencySchema = new Schema<ICurrency>({
symbol: { type: String, required: true, unique: true, maxlength: 3 },
name: { type: String, required: true }
});

export default mongoose.models.Currency as mongoose.Model<ICurrency> || model<ICurrency>('Currency', CurrencySchema);
