const router = require('express').Router();
const { AuditLog } = require('../models/index');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { search, limit = 100 } = req.query;
    const filter = {};
    if (search) filter.goalTitle = { $regex: search, $options: 'i' };

    const logs = await AuditLog.find(filter)
      .populate('changedBy', 'name email')
      .populate('goalId', 'title')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:goalId', auth, async (req, res) => {
  try {
    const logs = await AuditLog.find({ goalId: req.params.goalId })
      .populate('changedBy', 'name email')
      .sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
