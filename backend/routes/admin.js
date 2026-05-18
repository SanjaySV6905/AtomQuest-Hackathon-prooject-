const router = require('express').Router();
const User = require('../models/User');
const Goal = require('../models/Goal');
const Achievement = require('../models/Achievement');
const { Checkin, AuditLog, Escalation, Cycle } = require('../models/index');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/admin/dashboard
router.get('/dashboard', auth, requireRole('admin'), async (req, res) => {
  try {
    const [totalUsers, totalGoals, pendingGoals, auditCount, escalations] = await Promise.all([
      User.countDocuments(),
      Goal.countDocuments(),
      Goal.countDocuments({ status: 'pending' }),
      AuditLog.countDocuments(),
      Escalation.countDocuments({ resolved: false })
    ]);

    const goalsByStatus = await Goal.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const recentAudit = await AuditLog.find()
      .populate('changedBy', 'name')
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({ totalUsers, totalGoals, pendingGoals, auditCount, activeEscalations: escalations, goalsByStatus, recentAudit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/completion-matrix
router.get('/completion-matrix', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const filter = req.user.role === 'manager' ? { managerId: req.user._id } : {};
    const employees = await User.find({ ...filter, role: 'employee' });

    const checkins = await Checkin.find();
    const goals = await Goal.find({ status: 'approved' });

    const matrix = employees.map(emp => {
      const empCheckins = checkins.filter(c => c.employeeId.toString() === emp._id.toString());
      const empGoals = goals.filter(g => g.employeeId.toString() === emp._id.toString());

      const quarters = {};
      ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
        const hasCheckin = empCheckins.some(c => c.quarter === q);
        const hasGoals = empGoals.length > 0;
        quarters[q] = hasCheckin ? 'green' : hasGoals ? 'amber' : 'red';
      });

      return { employee: { _id: emp._id, name: emp.name, email: emp.email, department: emp.department }, quarters };
    });

    res.json(matrix);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/unlock/:goalId
router.post('/unlock/:goalId', auth, requireRole('admin'), async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.goalId);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    goal.status = 'draft';
    goal.approvedBy = null;
    goal.approvedAt = null;
    await goal.save();

    await AuditLog.create({
      goalId: goal._id,
      goalTitle: goal.title,
      changedBy: req.user._id,
      changeType: 'admin_unlock',
      oldValue: { status: 'approved' },
      newValue: { status: 'draft' }
    });

    res.json({ message: 'Goal unlocked', goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/cycle
router.get('/cycle', auth, async (req, res) => {
  try {
    let cycle = await Cycle.findOne({ isActive: true });
    if (!cycle) {
      const year = new Date().getFullYear();
      cycle = await Cycle.create({
        year,
        activeQuarter: 'Q1',
        windows: {
          Q1: { open: new Date(year, 0, 1), close: new Date(year, 2, 31) },
          Q2: { open: new Date(year, 3, 1), close: new Date(year, 5, 30) },
          Q3: { open: new Date(year, 6, 1), close: new Date(year, 8, 30) },
          Q4: { open: new Date(year, 9, 1), close: new Date(year, 11, 31) }
        }
      });
    }
    res.json(cycle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/cycle
router.put('/cycle', auth, requireRole('admin'), async (req, res) => {
  try {
    const cycle = await Cycle.findOneAndUpdate(
      { isActive: true },
      req.body,
      { new: true, upsert: true }
    );
    res.json(cycle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/team-members (for manager to get their direct reports)
router.get('/team-members', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'manager'
      ? { managerId: req.user._id, role: 'employee' }
      : { role: 'employee' };

    const members = await User.find(filter).select('-passwordHash');
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
