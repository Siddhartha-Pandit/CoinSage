// src/model/Category.ts
import mongoose, { Schema, model } from 'mongoose';
import { ICategory } from '../types';

const CategorySchema = new Schema<ICategory>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 50 }
});

// Register under exactly "Category"
export default (mongoose.models.Category as mongoose.Model<ICategory>) || model<ICategory>('Category', CategorySchema);
