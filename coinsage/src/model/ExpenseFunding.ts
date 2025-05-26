// // models/ExpenseFunding.ts
// import mongoose, { Schema } from 'mongoose';
// import { IExpenseFunding } from '../types';

// const ExpenseFundingSchema: Schema = new Schema({
//   expense: { type: Schema.Types.ObjectId, ref: 'Expense', required: true, unique: true },
//   goal:    { type: Schema.Types.ObjectId, ref: 'IncomeGoal', required: true },
//   amount:  { type: Number, required: true }
// });

// export default mongoose.models.ExpenseFunding as mongoose.Model<IExpenseFunding> || mongoose.model<IExpenseFunding>('ExpenseFunding', ExpenseFundingSchema);

