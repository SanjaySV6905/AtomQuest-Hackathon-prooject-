require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Goal = require('./models/Goal');
const Achievement = require('./models/Achievement');
const { Checkin, AuditLog, Escalation, Notification, Cycle } = require('./models/index');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Goal.deleteMany({}),
    Achievement.deleteMany({}),
    Checkin.deleteMany({}),
    AuditLog.deleteMany({}),
    Escalation.deleteMany({}),
    Notification.deleteMany({}),
    Cycle.deleteMany({})
  ]);
  console.log('Cleared old data');

  const hash = await bcrypt.hash('password123', 10);

  // Users
  const admin = await User.create({
    name: 'Neha Kapoor', email: 'neha@goalportal.com', passwordHash: hash,
    role: 'admin', department: 'HR'
  });

  const manager = await User.create({
    name: 'Ankit Mehta', email: 'ankit@goalportal.com', passwordHash: hash,
    role: 'manager', department: 'Engineering'
  });

  const priya = await User.create({
    name: 'Priya Sharma', email: 'priya@goalportal.com', passwordHash: hash,
    role: 'employee', department: 'Engineering', managerId: manager._id
  });

  const rahul = await User.create({
    name: 'Rahul Verma', email: 'rahul@goalportal.com', passwordHash: hash,
    role: 'employee', department: 'Engineering', managerId: manager._id
  });

  console.log('Users created');

  const year = new Date().getFullYear();

  // Priya's goals - approved
  const g1 = await Goal.create({
    employeeId: priya._id, managerId: manager._id,
    thrustArea: 'Revenue Growth', title: 'Increase API response time efficiency',
    description: 'Reduce average API response time by optimizing queries and caching',
    uom: 'numeric_min', target: 200, weightage: 30,
    status: 'approved', approvedBy: manager._id, approvedAt: new Date(),
    cycleYear: year
  });

  const g2 = await Goal.create({
    employeeId: priya._id, managerId: manager._id,
    thrustArea: 'Customer Success', title: 'Achieve 95% uptime SLA',
    description: 'Maintain 95% or above uptime for all production services',
    uom: 'percent_max', target: 95, weightage: 25,
    status: 'approved', approvedBy: manager._id, approvedAt: new Date(),
    cycleYear: year
  });

  const g3 = await Goal.create({
    employeeId: priya._id, managerId: manager._id,
    thrustArea: 'People Development', title: 'Complete AWS certification',
    description: 'Obtain AWS Solutions Architect Associate certification',
    uom: 'zero', target: 0, weightage: 20,
    status: 'approved', approvedBy: manager._id, approvedAt: new Date(),
    cycleYear: year
  });

  const g4 = await Goal.create({
    employeeId: priya._id, managerId: manager._id,
    thrustArea: 'Process Excellence', title: 'Deliver Q2 migration on schedule',
    description: 'Complete database migration project by June 30',
    uom: 'timeline', target: 0, weightage: 25,
    status: 'approved', approvedBy: manager._id, approvedAt: new Date(),
    cycleYear: year
  });

  // Rahul's goals - mix of pending and draft
  const g5 = await Goal.create({
    employeeId: rahul._id, managerId: manager._id,
    thrustArea: 'Revenue Growth', title: 'Build new payment gateway integration',
    description: 'Integrate Razorpay payment gateway into the platform',
    uom: 'numeric_max', target: 100, weightage: 30,
    status: 'pending', cycleYear: year
  });

  const g6 = await Goal.create({
    employeeId: rahul._id, managerId: manager._id,
    thrustArea: 'Customer Success', title: 'Reduce bug backlog by 50%',
    description: 'Close 50% of open bug tickets in Jira',
    uom: 'percent_max', target: 50, weightage: 30,
    status: 'pending', cycleYear: year
  });

  const g7 = await Goal.create({
    employeeId: rahul._id, managerId: manager._id,
    thrustArea: 'Process Excellence', title: 'Implement automated testing',
    description: 'Achieve 80% code coverage with unit tests',
    uom: 'percent_max', target: 80, weightage: 25,
    status: 'draft', cycleYear: year
  });

  const g8 = await Goal.create({
    employeeId: rahul._id, managerId: manager._id,
    thrustArea: 'People Development', title: 'Mentor 2 junior developers',
    description: 'Conduct weekly 1:1 with 2 junior developers',
    uom: 'numeric_max', target: 24, weightage: 15,
    status: 'returned', returnComment: 'Please clarify what "mentoring" outcomes look like. Add measurable KPIs.',
    returnedBy: manager._id, cycleYear: year
  });

  console.log('Goals created');

  // Q1 achievements for Priya
  await Achievement.create({ goalId: g1._id, employeeId: priya._id, quarter: 'Q1', actual: 180, status: 'completed' });
  await Achievement.create({ goalId: g2._id, employeeId: priya._id, quarter: 'Q1', actual: 97.5, status: 'completed' });
  await Achievement.create({ goalId: g3._id, employeeId: priya._id, quarter: 'Q1', actual: 0, status: 'completed' });
  await Achievement.create({ goalId: g4._id, employeeId: priya._id, quarter: 'Q1', actual: 5, status: 'on_track' });

  // Q2 partial
  await Achievement.create({ goalId: g1._id, employeeId: priya._id, quarter: 'Q2', actual: 170, status: 'on_track' });
  await Achievement.create({ goalId: g2._id, employeeId: priya._id, quarter: 'Q2', actual: 96, status: 'on_track' });

  console.log('Achievements created');

  // Check-ins
  await Checkin.create({
    managerId: manager._id, employeeId: priya._id, quarter: 'Q1',
    comment: 'Priya is performing exceptionally well. API performance improvement is ahead of target. Keep up the great work! Focus on the migration timeline for Q2.',
    goalSnapshots: [{ goalId: g1._id, title: g1.title, actual: 180, target: g1.target, score: 111.1 }]
  });

  await Checkin.create({
    managerId: manager._id, employeeId: priya._id, quarter: 'Q2',
    comment: 'Good progress on Q2. API performance continues to improve. Uptime is consistently above target. Please ensure the migration is completed on schedule.',
    goalSnapshots: [{ goalId: g1._id, title: g1.title, actual: 170, target: g1.target, score: 117.6 }]
  });

  console.log('Check-ins created');

  // Audit log
  await AuditLog.create({
    goalId: g1._id, goalTitle: g1.title, changedBy: manager._id,
    changeType: 'approved', oldValue: { status: 'pending' }, newValue: { status: 'approved' }
  });

  await AuditLog.create({
    goalId: g8._id, goalTitle: g8.title, changedBy: manager._id,
    changeType: 'returned', oldValue: { status: 'pending' }, newValue: { status: 'returned', comment: g8.returnComment }
  });

  await AuditLog.create({
    goalId: g2._id, goalTitle: g2.title, changedBy: manager._id,
    changeType: 'approved', oldValue: { status: 'pending' }, newValue: { status: 'approved' }
  });

  console.log('Audit log created');

  // Escalations
  await Escalation.create({
    type: 'goal_not_submitted', employeeId: rahul._id, managerId: manager._id,
    daysOverdue: 5, resolved: false,
    notificationsSent: [{ to: rahul.email, sentAt: new Date() }]
  });

  await Escalation.create({
    type: 'approval_pending', employeeId: rahul._id, managerId: manager._id,
    daysOverdue: 3, resolved: false,
    notificationsSent: [{ to: manager.email, sentAt: new Date() }]
  });

  console.log('Escalations created');

  // Notifications
  await Notification.create({ userId: priya._id, type: 'goal_approved', title: 'Goal Approved', message: 'Your goal "Increase API response time efficiency" has been approved!', link: '/employee/goals' });
  await Notification.create({ userId: priya._id, type: 'checkin_received', title: 'Manager Check-in', message: 'Your manager completed a check-in for Q1', link: '/employee/dashboard' });
  await Notification.create({ userId: manager._id, type: 'goal_submitted', title: 'New Goals Submitted', message: 'Rahul Verma has submitted goals for approval', link: '/manager/goals' });
  await Notification.create({ userId: manager._id, type: 'escalation', title: 'Approval Overdue', message: 'Rahul Verma goals have been pending approval for 3 days.', link: '/manager/goals', read: false });
  await Notification.create({ userId: admin._id, type: 'escalation', title: 'Goals Not Submitted', message: 'Some employees have not submitted goals yet.', link: '/admin/escalations', read: false });

  console.log('Notifications created');

  // Cycle
  await Cycle.create({
    year,
    activeQuarter: 'Q2',
    windows: {
      Q1: { open: new Date(year, 0, 1), close: new Date(year, 2, 31) },
      Q2: { open: new Date(year, 3, 1), close: new Date(year, 5, 30) },
      Q3: { open: new Date(year, 6, 1), close: new Date(year, 8, 30) },
      Q4: { open: new Date(year, 9, 1), close: new Date(year, 11, 31) }
    },
    isActive: true
  });

  console.log('Cycle created');
  console.log('\n✅ Seed complete!\n');
  console.log('Demo credentials (all use password: password123):');
  console.log('  Admin:    neha@goalportal.com');
  console.log('  Manager:  ankit@goalportal.com');
  console.log('  Employee: priya@goalportal.com');
  console.log('  Employee: rahul@goalportal.com');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
