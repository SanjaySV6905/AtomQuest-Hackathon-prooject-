const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
  actual: { type: Number, default: null },
  status: { type: String, enum: ['not_started', 'on_track', 'completed', 'at_risk'], default: 'not_started' }
}, {
  timestamps: true,
  indexes: [{ unique: true, fields: ['goalId', 'quarter'] }]
});

achievementSchema.index({ goalId: 1, quarter: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);
