const router = require('express').Router();
const { Checkin } = require('../models/index');
const { auth, requireRole } = require('../middleware/auth');
const { createNotification } = require('../utils/notifyUtils');

router.get('/', auth, async (req, res) => {
  try {
    const { employeeId, quarter } = req.query;
    const filter = {};

    if (req.user.role === 'manager') filter.managerId = req.user._id;
    else if (req.user.role === 'employee') filter.employeeId = req.user._id;

    if (employeeId) filter.employeeId = employeeId;
    if (quarter) filter.quarter = quarter;

    const checkins = await Checkin.find(filter)
      .populate('managerId', 'name email')
      .populate('employeeId', 'name email')
      .sort({ createdAt: -1 });

    res.json(checkins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { employeeId, quarter, comment, goalSnapshots } = req.body;

    const checkin = await Checkin.create({
      managerId: req.user._id,
      employeeId,
      quarter,
      comment,
      goalSnapshots: goalSnapshots || []
    });

    await createNotification(
      employeeId,
      'checkin_received',
      'Manager Check-in',
      `Your manager completed a check-in for ${quarter}`,
      '/employee/dashboard'
    );

    res.status(201).json(checkin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/checkins/completion - who completed which quarter
router.get('/completion', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const checkins = await Checkin.find(
      req.user.role === 'manager' ? { managerId: req.user._id } : {}
    ).populate('employeeId', 'name email department');

    const map = {};
    checkins.forEach(c => {
      const empId = c.employeeId._id.toString();
      if (!map[empId]) {
        map[empId] = { employee: c.employeeId, quarters: {} };
      }
      map[empId].quarters[c.quarter] = true;
    });

    res.json(Object.values(map));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
