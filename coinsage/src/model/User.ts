
//  src/models/User.ts 
import mongoose, { Schema, model } from 'mongoose';
import { IUser } from '../types';

const UserSchema = new Schema<IUser>({
name: { type: String, required: true, trim: true, maxlength: 100 },
email: { type: String, required: true, unique: true, trim: true, maxlength: 150 },
password: { type: String, required: true, select: false },
createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User as mongoose.Model<IUser> || model<IUser>('User', UserSchema);
