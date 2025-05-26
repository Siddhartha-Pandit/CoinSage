/* src/types/index.d.ts */
import { Document, Types } from "mongoose";

export interface ICurrency extends Document {
  _id: Types.ObjectId;
  symbol: string;
  name: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

export interface IAccount extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  type: string;
  balance: number;
  currency: Types.ObjectId;
}

export interface ICategory extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
}

export interface IExpenditureType extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
}

export interface IExpense extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  accountId: Types.ObjectId;
  goalId: Types.ObjectId;
  name: string;
  totalAmount: number;
  date: Date;
  categoryId: Types.ObjectId;
  typeId: Types.ObjectId;
  splitType: string;
  notes?: string;
  createdAt: Date;
}

export interface IExpenseSplit extends Document {
  _id: Types.ObjectId;
  expense: Types.ObjectId;
  hasPaid: boolean;
  shareRate?: number;
  shareAmount?: number;
  sharePercent?: number;
  paidAmount?: number;
  people: Types.ObjectId;
}


export interface IExpenseFunding extends Document {
  _id: Types.ObjectId;
  expense: Types.ObjectId;
  goal: Types.ObjectId;
  amount: number;
}

export interface IIncomeSource extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
}

export interface IIncomeGoal extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  targetAmount?: number;
  targetDate?: Date;
  balance?: number;
  allocationRate: number;
  account: Types.ObjectId;
}

export interface IIncome extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  amount: number;
  source: Types.ObjectId;
  date: Date;
  notes?: string;
  destAccount: Types.ObjectId;
  incomeGoal: Types.ObjectId;
}

export interface IIncomeSplit extends Document {
  _id: Types.ObjectId;
  income: Types.ObjectId;
  goal: Types.ObjectId;
  percent: number;
  allocatedAmount: number;
}

export interface ILoan extends Document {
  _id: Types.ObjectId;
  lender: Types.ObjectId;
  borrower: Types.ObjectId;
  amount: number;
  date: Date;
  notes?: string;
  settled: boolean;
  expense?: Types.ObjectId;
  account?: Types.ObjectId;
  user: Types.ObjectId;
}

export interface IPeople extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  image?: string;
  isUser?: boolean;
  createdAt: Date;
  updatedAt: Date; // Add this if you're using timestamps
}

export interface IIncomeAllocation extends Document {
  _id: Types.ObjectId;
  income: Types.ObjectId;
  goal: Types.ObjectId;
  amount: number;
  allocatedAt: Date;
}

export interface IExpenseShare extends Document {
  _id: Types.ObjectId;
  expenseId: Types.ObjectId;
  userId: Types.ObjectId;
  shareAmount: number;
  paidAmount: number;
  settled: boolean;
  settledAt?: Date;
  peopleId: Types.ObjectId;
  date: Date;
}

export interface IDebt extends Document {
  _id: Types.ObjectId;
  payerId: Types.ObjectId;
  payeeId: Types.ObjectId;
  expenseId?: Types.ObjectId;
  originalAmount: number;
  remainingAmount: number;
  currencyId: Types.ObjectId;
  createdAt: Date;
  date?: Date;
  status: string;
  userId: Types.ObjectId;
  payerType: string;
  payeeType: string;
}
export interface IExpenseAllocation extends Document {
  allocationId: string; // CHAR(36) from SQL
  expense: mongoose.Types.ObjectId; // references Expense._id
  goal: mongoose.Types.ObjectId; // references IncomeGoal._id
  amount: mongoose.Types.Decimal128;
  allocatedAt: Date;
}
