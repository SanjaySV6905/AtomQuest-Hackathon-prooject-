const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema({
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
  comment: { type: String, default: '' },
  goalSnapshots: { type: Array, default: [] }
}, { timestamps: true });

const auditLogSchema = new mongoose.Schema({
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
  goalTitle: { type: String },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changeType: { type: String },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

const escalationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['goal_not_submitted', 'approval_pending', 'checkin_missing'],
    required: true
  },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  triggeredAt: { type: Date, default: Date.now },
  daysOverdue: { type: Number, default: 0 },
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date, default: null },
  notificationsSent: { type: Array, default: [] }
});

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String, default: '' }
}, { timestamps: true });

const cycleSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  activeQuarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], default: 'Q1' },
  windows: {
    Q1: { open: Date, close: Date },
    Q2: { open: Date, close: Date },
    Q3: { open: Date, close: Date },
    Q4: { open: Date, close: Date }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = {
  Checkin: mongoose.model('Checkin', checkinSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  Escalation: mongoose.model('Escalation', escalationSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Cycle: mongoose.model('Cycle', cycleSchema)
};
