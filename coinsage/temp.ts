/\* src/types/index.d.ts \*/
import { Document, Types } from 'mongoose';

export interface ICurrency extends Document {
\_id: Types.ObjectId;
symbol: string;
name: string;
}

export interface IUser extends Document {
\_id: Types.ObjectId;
name: string;
email: string;
password: string;
createdAt: Date;
}

export interface IAccount extends Document {
\_id: Types.ObjectId;
user: Types.ObjectId;
name: string;
type: string;
balance: number;
currency: Types.ObjectId;
}

export interface ICategory extends Document {
\_id: Types.ObjectId;
user: Types.ObjectId;
name: string;
}

export interface IExpenditureType extends Document {
\_id: Types.ObjectId;
user: Types.ObjectId;
name: string;
}

export interface IExpense extends Document {
\_id: Types.ObjectId;
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
\_id: Types.ObjectId;
expense: Types.ObjectId;
user: Types.ObjectId;
shareAmount?: number;
sharePercent?: number;
}

export interface IExpenseFunding extends Document {
\_id: Types.ObjectId;
expense: Types.ObjectId;
goal: Types.ObjectId;
amount: number;
}

export interface IIncomeSource extends Document {
\_id: Types.ObjectId;
user: Types.ObjectId;
name: string;
}

export interface IIncomeGoal extends Document {
\_id: Types.ObjectId;
user: Types.ObjectId;
name: string;
targetAmount?: number;
targetDate?: Date;
balance?: number;
allocationRate: number;
account: Types.ObjectId;
}

export interface IIncome extends Document {
\_id: Types.ObjectId;
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
\_id: Types.ObjectId;
income: Types.ObjectId;
goal: Types.ObjectId;
percent: number;
allocatedAmount: number;
}

export interface ILoan extends Document {
\_id: Types.ObjectId;
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
\_id: Types.ObjectId;
user: Types.ObjectId;
name: string;
email?: string;
phone?: string;
image?: string;
}

export interface IIncomeAllocation extends Document {
\_id: Types.ObjectId;
income: Types.ObjectId;
goal: Types.ObjectId;
amount: number;
allocatedAt: Date;
}

export interface IExpenseShare extends Document {
\_id: Types.ObjectId;
expenseId: Types.ObjectId;
userId: Types.ObjectId;
shareAmount: number;
paidAmount: number;
settled: boolean;
settledAt?: Date;
}

export interface IDebt extends Document {
\_id: Types.ObjectId;
payerId: Types.ObjectId;
payeeId: Types.ObjectId;
expenseId: Types.ObjectId;
originalAmount: number;
remainingAmount: number;
currencyId: Types.ObjectId;
createdAt: Date;
dueDate?: Date;
status: string;
}

/\* src/models/Account.ts \*/
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

/\* src/models/Category.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { ICategory } from '../types';

const CategorySchema = new Schema<ICategory>({
user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
name: { type: String, required: true, maxlength: 50 }
});

export default mongoose.models.Category as mongoose.Model<ICategory> || model<ICategory>('Category', CategorySchema);

/\* src/models/Currency.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { ICurrency } from '../types';

const CurrencySchema = new Schema<ICurrency>({
symbol: { type: String, required: true, unique: true, maxlength: 3 },
name: { type: String, required: true }
});

export default mongoose.models.Currency as mongoose.Model<ICurrency> || model<ICurrency>('Currency', CurrencySchema);

/\* src/models/Debt.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { IDebt } from '../types';

const DebtSchema = new Schema<IDebt>({
payerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
payeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
expenseId: { type: Schema.Types.ObjectId, ref: 'Expense', required: true },
originalAmount: { type: Number, required: true },
remainingAmount: { type: Number, required: true },
currencyId: { type: Schema.Types.ObjectId, ref: 'Currency', required: true },
createdAt: { type: Date, default: Date.now },
dueDate: { type: Date, default: null },
status: { type: String, required: true, default: 'PENDING' }
});

DebtSchema.index({ payerId: 1, payeeId: 1, status: 1 });

export default mongoose.models.Debt as mongoose.Model<IDebt> || model<IDebt>('Debt', DebtSchema);

/\* src/models/ExpenditureType.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { IExpenditureType } from '../types';

const ExpenditureTypeSchema = new Schema<IExpenditureType>({
user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
name: { type: String, required: true, maxlength: 50 }
});

export default mongoose.models.ExpenditureType as mongoose.Model<IExpenditureType> || model<IExpenditureType>('ExpenditureType', ExpenditureTypeSchema);

/\* src/models/Expense.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { IExpense } from '../types';

const ExpenseSchema = new Schema<IExpense>({
userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
goalId: { type: Schema.Types.ObjectId, ref: 'IncomeGoal', required: true },
name: { type: String, required: true, maxlength: 150 },
totalAmount: { type: Number, required: true },
date: { type: Date, required: true },
categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
typeId: { type: Schema.Types.ObjectId, ref: 'ExpenditureType', required: true },
splitType: { type: String, required: true, default: 'EQUAL' },
notes: { type: String, default: null },
createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Expense as mongoose.Model<IExpense> || model<IExpense>('Expense', ExpenseSchema);

/\* src/models/ExpenseShare.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { IExpenseShare } from '../types';

const ExpenseShareSchema = new Schema<IExpenseShare>({
expenseId: { type: Schema.Types.ObjectId, ref: 'Expense', required: true },
userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
shareAmount: { type: Number, required: true },
paidAmount: { type: Number, required: true, default: 0.00 },
settled: { type: Boolean, required: true, default: false },
settledAt: { type: Date, default: null }
});

ExpenseShareSchema.index({ expenseId: 1, userId: 1 });

export default mongoose.models.ExpenseShare as mongoose.Model<IExpenseShare> || model<IExpenseShare>('ExpenseShare', ExpenseShareSchema);

/\* src/models/Income.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { IIncome } from '../types';

const IncomeSchema = new Schema<IIncome>({
user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
name: { type: String, required: true, maxlength: 150 },
amount: { type: Number, required: true },
source: { type: Schema.Types.ObjectId, ref: 'IncomeSource', required: true },
date: { type: Date, required: true },
notes: { type: String, default: null },
destAccount: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
incomeGoal: { type: Schema.Types.ObjectId, ref: 'IncomeGoal', required: true }
});

export default mongoose.models.Income as mongoose.Model<IIncome> || model<IIncome>('Income', IncomeSchema);

/\* src/models/IncomeAllocation.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { IIncomeAllocation } from '../types';

const IncomeAllocationSchema = new Schema<IIncomeAllocation>({
income: { type: Schema.Types.ObjectId, ref: 'Income', required: true },
goal: { type: Schema.Types.ObjectId, ref: 'IncomeGoal', required: true },
amount: { type: Number, required: true },
allocatedAt: { type: Date, default: Date.now }
});

// fix index keys
IncomeAllocationSchema.index({ income: 1, goal: 1 });

export default mongoose.models.IncomeAllocation as mongoose.Model<IIncomeAllocation> || model<IIncomeAllocation>('IncomeAllocation', IncomeAllocationSchema);

/\* src/models/IncomeGoal.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { IIncomeGoal } from '../types';

const IncomeGoalSchema = new Schema<IIncomeGoal>({
user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
name: { type: String, required: true, maxlength: 50 },
targetAmount: { type: Number, required: false },
targetDate: { type: Date, required: false },
balance: { type: Number, required: false },
allocationRate: { type: Number, required: true },
account: { type: Schema.Types.ObjectId, ref: 'Account', required: true }
});

export default mongoose.models.IncomeGoal as mongoose.Model<IIncomeGoal> || model<IIncomeGoal>('IncomeGoal', IncomeGoalSchema);

/\* src/models/IncomeSource.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { IIncomeSource } from '../types';

const IncomeSourceSchema = new Schema<IIncomeSource>({
user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
name: { type: String, required: true, maxlength: 50 }
});

export default mongoose.models.IncomeSource as mongoose.Model<IIncomeSource> || model<IIncomeSource>('IncomeSource', IncomeSourceSchema);

/\* src/models/Loan.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { ILoan } from '../types';

const LoanSchema = new Schema<ILoan>({
lender: { type: Schema.Types.ObjectId, ref: 'People', required: true },
borrower: { type: Schema.Types.ObjectId, ref: 'People', required: true },
amount: { type: Number, required: true },
date: { type: Date, required: true },
notes: { type: String, default: null },
settled: { type: Boolean, default: false },
expense: { type: Schema.Types.ObjectId, ref: 'Expense', required: false },
account: { type: Schema.Types.ObjectId, ref: 'Account', required: false },
user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
});

export default mongoose.models.Loan as mongoose.Model<ILoan> || model<ILoan>('Loan', LoanSchema);

/\* src/models/People.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { IPeople } from '../types';

const PeopleSchema = new Schema<IPeople>({
user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
name: { type: String, required: true, trim: true, maxlength: 100 },
email: { type: String, trim: true, maxlength: 150, default: null },
phone: { type: String, default: null },
image: { type: String, default: null },
createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.People as mongoose.Model<IPeople> || model<IPeople>('People', PeopleSchema);

/\* src/models/User.ts \*/
import mongoose, { Schema, model } from 'mongoose';
import { IUser } from '../types';

const UserSchema = new Schema<IUser>({
name: { type: String, required: true, trim: true, maxlength: 100 },
email: { type: String, required: true, unique: true, trim: true, maxlength: 150 },
password: { type: String, required: true, select: false },
createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User as mongoose.Model<IUser> || model<IUser>('User', UserSchema);
