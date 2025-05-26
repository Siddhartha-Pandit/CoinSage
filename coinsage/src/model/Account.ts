/* src/models/Account.ts */
import mongoose, { Schema, model } from 'mongoose';
import { IAccount } from '../types';

const AccountSchema = new Schema<IAccount>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  balance: { type: Number, required: true, default: 0 },
  currency: { type: Schema.Types.ObjectId, ref: 'Currency', required: true }
});

export default mongoose.models.Account as mongoose.Model<IAccount> || model<IAccount>('Account', AccountSchema);
