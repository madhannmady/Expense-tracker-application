const mongoose = require('mongoose');

const noteEntrySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  type: {
    type: String,
    enum: ['lending', 'general'],
    default: 'general',
  },
  personName: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  amount: {
    type: Number,
    min: 0,
  },
});

const monthlyNotesSchema = new mongoose.Schema(
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
    notes: [noteEntrySchema],
  },
  { timestamps: true }
);

// Ensure one record per user per month/year
monthlyNotesSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

monthlyNotesSchema.set('toJSON', { virtuals: true });
monthlyNotesSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MonthlyNotes', monthlyNotesSchema);
