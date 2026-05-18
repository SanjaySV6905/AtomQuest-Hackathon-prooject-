const router = require('express').Router();
const { Escalation } = require('../models/index');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const filter = req.user.role === 'manager' ? { managerId: req.user._id } : {};
    const escalations = await Escalation.find(filter)
      .populate('employeeId', 'name email')
      .populate('managerId', 'name email')
      .sort({ triggeredAt: -1 });
    res.json(escalations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/resolve/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const esc = await Escalation.findByIdAndUpdate(
      req.params.id,
      { resolved: true, resolvedAt: new Date() },
      { new: true }
    );
    if (!esc) return res.status(404).json({ error: 'Escalation not found' });
    res.json(esc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
