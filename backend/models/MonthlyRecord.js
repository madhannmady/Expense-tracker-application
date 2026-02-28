const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  source: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
});

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: [
      'Housing',
      'Food & Dining',
      'Transportation',
      'Utilities',
      'Healthcare',
      'Entertainment',
      'Shopping',
      'Education',
      'Insurance',
      'Savings & Investments',
      'Debt Payments',
      'Personal Care',
      'Travel',
      'Gifts & Donations',
      'Subscriptions',
      'Other',
    ],
  },
  description: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },
});

const monthlyRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
    },
    incomes: [incomeSchema],
    expenses: [expenseSchema],
    savingsGoal: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Ensure one record per user per month/year
monthlyRecordSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

// Virtual: total income
monthlyRecordSchema.virtual('totalIncome').get(function () {
  return this.incomes.reduce((sum, i) => sum + i.amount, 0);
});

// Virtual: total expense
monthlyRecordSchema.virtual('totalExpense').get(function () {
  return this.expenses.reduce((sum, e) => sum + e.amount, 0);
});

// Virtual: savings
monthlyRecordSchema.virtual('savings').get(function () {
  return this.totalIncome - this.totalExpense;
});

monthlyRecordSchema.set('toJSON', { virtuals: true });
monthlyRecordSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MonthlyRecord', monthlyRecordSchema);
