const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  thrustArea: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  uom: {
    type: String,
    enum: ['numeric_min', 'numeric_max', 'percent_min', 'percent_max', 'timeline', 'zero'],
    required: true
  },
  target: { type: Number, required: true },
  weightage: { type: Number, required: true, min: 10 },
  status: { type: String, enum: ['draft', 'pending', 'approved', 'returned'], default: 'draft' },
  isShared: { type: Boolean, default: false },
  sharedOwner: { type: String, default: '' },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  returnComment: { type: String, default: '' },
  returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  cycleYear: { type: Number, default: new Date().getFullYear() }
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
