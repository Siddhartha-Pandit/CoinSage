// // models/IncomeSplit.ts
// import mongoose, { Schema } from 'mongoose';
// import { IIncomeSplit } from '../types';

// const IncomeSplitSchema: Schema = new Schema({
//   income:          { type: Schema.Types.ObjectId, ref: 'Income', required: true, unique: true },
//   goal:            { type: Schema.Types.ObjectId, ref: 'IncomeGoal', required: true },
//   percent:         { type: Number, required: true },
//   allocatedAmount: { type: Number, required: true }
// });

// export default mongoose.models.IncomeSplit as mongoose.Model<IIncomeSplit> || mongoose.model<IIncomeSplit>('IncomeSplit', IncomeSplitSchema);

