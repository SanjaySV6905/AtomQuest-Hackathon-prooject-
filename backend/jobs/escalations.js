const cron = require('node-cron');
const User = require('../models/User');
const Goal = require('../models/Goal');
const { Escalation, Checkin } = require('../models/index');
const { createNotification } = require('../utils/notifyUtils');

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

async function runEscalationCheck() {
  try {
    const employees = await User.find({ role: 'employee' });
    const currentYear = new Date().getFullYear();

    for (const emp of employees) {
      // Rule 1: Employee hasn't submitted goals within 14 days of cycle open
      const goals = await Goal.find({ employeeId: emp._id, cycleYear: currentYear });
      const hasSubmitted = goals.some(g => ['pending', 'approved'].includes(g.status));

      if (!hasSubmitted) {
        const existing = await Escalation.findOne({
          employeeId: emp._id,
          type: 'goal_not_submitted',
          resolved: false
        });

        const days = daysSince(new Date(currentYear, 0, 1)); // days since Jan 1

        if (!existing && days > 14) {
          await Escalation.create({
            type: 'goal_not_submitted',
            employeeId: emp._id,
            managerId: emp.managerId,
            daysOverdue: days - 14
          });

          await createNotification(emp._id, 'escalation', 'Goals Not Submitted',
            `You have not submitted goals for ${currentYear}. Please submit ASAP.`, '/employee/goals');

          if (emp.managerId) {
            await createNotification(emp.managerId, 'escalation', 'Team Member Goals Overdue',
              `${emp.name} has not submitted goals for ${currentYear}.`, '/manager/goals');
          }
        } else if (existing) {
          existing.daysOverdue = days - 14;
          await existing.save();
        }
      }

      // Rule 2: Manager hasn't approved within 7 days of submission
      const pendingGoals = await Goal.find({ employeeId: emp._id, status: 'pending' });
      for (const goal of pendingGoals) {
        const days = daysSince(goal.updatedAt);
        if (days > 7 && emp.managerId) {
          const existing = await Escalation.findOne({
            employeeId: emp._id,
            type: 'approval_pending',
            resolved: false
          });

          if (!existing) {
            await Escalation.create({
              type: 'approval_pending',
              employeeId: emp._id,
              managerId: emp.managerId,
              daysOverdue: days - 7
            });

            await createNotification(emp.managerId, 'escalation', 'Goals Awaiting Approval',
              `${emp.name}'s goals have been pending approval for ${days} days.`, '/manager/goals');
          }
        }
      }
    }

    console.log('[CRON] Escalation check complete:', new Date().toISOString());
  } catch (err) {
    console.error('[CRON] Escalation error:', err.message);
  }
}

function startEscalationJobs() {
  // Run every hour
  cron.schedule('0 * * * *', runEscalationCheck);
  console.log('[CRON] Escalation jobs scheduled');
}

module.exports = { startEscalationJobs, runEscalationCheck };
