
//  src/models/People.ts 
import mongoose, { Schema, model } from 'mongoose';
import { IPeople } from '../types';

const PeopleSchema = new Schema<IPeople>({
user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
name: { type: String, required: true, trim: true, maxlength: 100 },
email: { type: String, trim: true, maxlength: 150, default: null },
phone: { type: String, default: null },
image: { type: String, default: null },
createdAt: { type: Date, default: Date.now },
isUser:{type:Boolean,default:false}
});

export default mongoose.models.People as mongoose.Model<IPeople> || model<IPeople>('People', PeopleSchema);
