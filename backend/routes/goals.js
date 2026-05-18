const router = require('express').Router();
const Goal = require('../models/Goal');
const { AuditLog, Notification } = require('../models/index');
const { auth, requireRole } = require('../middleware/auth');
const { createNotification } = require('../utils/notifyUtils');

// GET /api/goals
router.get('/', auth, async (req, res) => {
  try {
    const { employeeId, managerId, status, cycleYear } = req.query;
    const filter = {};

    if (req.user.role === 'employee') {
      filter.employeeId = req.user._id;
    } else if (req.user.role === 'manager') {
      if (employeeId) filter.employeeId = employeeId;
      else filter.managerId = req.user._id;
    } else {
      if (employeeId) filter.employeeId = employeeId;
      if (managerId) filter.managerId = managerId;
    }

    if (status) filter.status = status;
    if (cycleYear) filter.cycleYear = parseInt(cycleYear);

    const goals = await Goal.find(filter)
      .populate('employeeId', 'name email department')
      .populate('managerId', 'name email')
      .populate('approvedBy', 'name')
      .populate('returnedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals
router.post('/', auth, requireRole('employee'), async (req, res) => {
  try {
    const { thrustArea, title, description, uom, target, weightage, cycleYear } = req.body;

    const existingGoals = await Goal.find({
      employeeId: req.user._id,
      cycleYear: cycleYear || new Date().getFullYear(),
      status: { $ne: 'returned' }
    });

    if (existingGoals.length >= 8) {
      return res.status(400).json({ error: 'Max 8 goals allowed per cycle' });
    }

    if (weightage < 10) {
      return res.status(400).json({ error: 'Min weightage per goal is 10%' });
    }

    const totalWeight = existingGoals.reduce((s, g) => s + g.weightage, 0);
    if (totalWeight + weightage > 100) {
      return res.status(400).json({ error: `Total weightage would exceed 100%. Currently at ${totalWeight}%` });
    }

    const goal = await Goal.create({
      employeeId: req.user._id,
      managerId: req.user.managerId,
      thrustArea, title, description, uom,
      target: parseFloat(target),
      weightage: parseFloat(weightage),
      cycleYear: cycleYear || new Date().getFullYear()
    });

    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/goals/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const isOwner = goal.employeeId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });
    if (goal.status === 'approved' && !isAdmin) {
      return res.status(400).json({ error: 'Cannot edit approved goal. Request admin unlock.' });
    }

    const allowedFields = ['thrustArea', 'title', 'description', 'uom', 'target', 'weightage'];
    const oldValue = {};
    const newValue = {};

    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) {
        oldValue[f] = goal[f];
        newValue[f] = req.body[f];
        goal[f] = req.body[f];
      }
    });

    if (goal.status === 'approved') {
      await AuditLog.create({
        goalId: goal._id,
        goalTitle: goal.title,
        changedBy: req.user._id,
        changeType: 'post_lock_edit',
        oldValue, newValue
      });
    }

    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/goals/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const isOwner = goal.employeeId.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    if (goal.status === 'approved') return res.status(400).json({ error: 'Cannot delete approved goal' });

    await goal.deleteOne();
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals/:id/submit
router.post('/:id/submit', auth, requireRole('employee'), async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    if (goal.employeeId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Forbidden' });

    const allGoals = await Goal.find({
      employeeId: req.user._id,
      cycleYear: goal.cycleYear,
      status: { $ne: 'returned' }
    });
    const total = allGoals.reduce((s, g) => s + g.weightage, 0);
    if (Math.abs(total - 100) > 0.01) {
      return res.status(400).json({ error: `Total weightage must be 100%. Current: ${total}%` });
    }

    await Goal.updateMany(
      { employeeId: req.user._id, cycleYear: goal.cycleYear, status: 'draft' },
      { status: 'pending' }
    );

    if (req.user.managerId) {
      await createNotification(
        req.user.managerId,
        'goal_submitted',
        'New Goals Submitted',
        `${req.user.name} has submitted goals for approval`,
        '/manager/goals'
      );
    }

    res.json({ message: 'Goals submitted for approval' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals/:id/approve
router.post('/:id/approve', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const empGoals = await Goal.find({
      employeeId: goal.employeeId,
      cycleYear: goal.cycleYear,
      status: 'pending'
    });

    const total = empGoals.reduce((s, g) => s + g.weightage, 0);
    if (Math.abs(total - 100) > 0.01) {
      return res.status(400).json({ error: `Employee total weightage is ${total}%, must be 100%` });
    }

    goal.status = 'approved';
    goal.approvedBy = req.user._id;
    goal.approvedAt = new Date();
    await goal.save();

    await AuditLog.create({
      goalId: goal._id,
      goalTitle: goal.title,
      changedBy: req.user._id,
      changeType: 'approved',
      oldValue: { status: 'pending' },
      newValue: { status: 'approved' }
    });

    await createNotification(
      goal.employeeId,
      'goal_approved',
      'Goal Approved',
      `Your goal "${goal.title}" has been approved!`,
      '/employee/goals'
    );

    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals/:id/approve-all (approve all pending goals for an employee)
router.post('/approve-all/:employeeId', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const goals = await Goal.find({ employeeId: req.params.employeeId, status: 'pending' });
    const total = goals.reduce((s, g) => s + g.weightage, 0);

    if (Math.abs(total - 100) > 0.01) {
      return res.status(400).json({ error: `Total weightage is ${total}%, must be 100%` });
    }

    await Goal.updateMany(
      { employeeId: req.params.employeeId, status: 'pending' },
      { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() }
    );

    await createNotification(
      req.params.employeeId,
      'goal_approved',
      'All Goals Approved',
      'All your submitted goals have been approved!',
      '/employee/goals'
    );

    res.json({ message: 'All goals approved', count: goals.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals/:id/return
router.post('/:id/return', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ error: 'Return comment required' });

    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    goal.status = 'returned';
    goal.returnComment = comment;
    goal.returnedBy = req.user._id;
    await goal.save();

    await createNotification(
      goal.employeeId,
      'goal_returned',
      'Goal Returned',
      `Your goal "${goal.title}" was returned: ${comment}`,
      '/employee/goals'
    );

    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals/shared - admin pushes shared KPI
router.post('/shared', auth, requireRole('admin'), async (req, res) => {
  try {
    const { thrustArea, title, description, uom, target, employeeIds, defaultWeightage, cycleYear } = req.body;

    const created = [];
    for (const empId of employeeIds) {
      const g = await Goal.create({
        employeeId: empId,
        thrustArea, title, description, uom,
        target: parseFloat(target),
        weightage: parseFloat(defaultWeightage) || 10,
        isShared: true,
        sharedOwner: title,
        sharedBy: req.user._id,
        cycleYear: cycleYear || new Date().getFullYear(),
        status: 'draft'
      });
      created.push(g);

      await createNotification(empId, 'shared_goal', 'Shared Goal Assigned', `Admin assigned a shared goal: ${title}`, '/employee/goals');
    }

    res.status(201).json({ message: `Shared goal pushed to ${created.length} employees`, goals: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/goals/validate-weight/:employeeId
router.get('/validate-weight/:employeeId', auth, async (req, res) => {
  try {
    const cycleYear = req.query.cycleYear || new Date().getFullYear();
    const goals = await Goal.find({
      employeeId: req.params.employeeId,
      cycleYear: parseInt(cycleYear),
      status: { $ne: 'returned' }
    });
    const total = goals.reduce((s, g) => s + g.weightage, 0);
    res.json({ total, valid: Math.abs(total - 100) <= 0.01, goals: goals.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
