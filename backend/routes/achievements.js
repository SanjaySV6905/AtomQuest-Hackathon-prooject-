const router = require('express').Router();
const Achievement = require('../models/Achievement');
const Goal = require('../models/Goal');
const { auth } = require('../middleware/auth');
const { computeScore, computeWeightedScore } = require('../utils/scoreUtils');

// GET /api/achievements
router.get('/', auth, async (req, res) => {
  try {
    const { employeeId, quarter } = req.query;
    const filter = {};

    if (req.user.role === 'employee') filter.employeeId = req.user._id;
    else if (employeeId) filter.employeeId = employeeId;

    if (quarter) filter.quarter = quarter;

    const achievements = await Achievement.find(filter)
      .populate('goalId', 'title thrustArea uom target weightage')
      .sort({ createdAt: -1 });

    res.json(achievements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/achievements - upsert actual + status
router.put('/', auth, async (req, res) => {
  try {
    const { goalId, quarter, actual, status } = req.body;

    const goal = await Goal.findById(goalId);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    if (goal.status !== 'approved') return res.status(400).json({ error: 'Can only enter achievements for approved goals' });

    const isOwner = goal.employeeId.toString() === req.user._id.toString();
    const isManager = req.user.role === 'manager';
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isManager && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const ach = await Achievement.findOneAndUpdate(
      { goalId, quarter },
      { goalId, employeeId: goal.employeeId, quarter, actual: parseFloat(actual), status },
      { upsert: true, new: true }
    );

    const score = computeScore(goal.uom, goal.target, parseFloat(actual));
    res.json({ achievement: ach, score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/achievements/scores/:employeeId/:quarter
router.get('/scores/:employeeId/:quarter', auth, async (req, res) => {
  try {
    const { employeeId, quarter } = req.params;
    const cycleYear = req.query.cycleYear || new Date().getFullYear();

    const goals = await Goal.find({ employeeId, status: 'approved', cycleYear: parseInt(cycleYear) });
    const achievements = await Achievement.find({ employeeId, quarter });

    const breakdown = goals.map(g => {
      const ach = achievements.find(a => a.goalId.toString() === g._id.toString());
      const score = ach ? computeScore(g.uom, g.target, ach.actual) : null;
      return {
        goalId: g._id,
        title: g.title,
        thrustArea: g.thrustArea,
        uom: g.uom,
        target: g.target,
        actual: ach ? ach.actual : null,
        weightage: g.weightage,
        score,
        weightedScore: score !== null ? (score * g.weightage / 100) : null,
        status: ach ? ach.status : 'not_started'
      };
    });

    const overallScore = computeWeightedScore(goals, achievements);

    res.json({ breakdown, overallScore, quarter, employeeId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/achievements/all-quarters/:employeeId - QoQ data
router.get('/all-quarters/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const cycleYear = req.query.cycleYear || new Date().getFullYear();

    const goals = await Goal.find({ employeeId, status: 'approved', cycleYear: parseInt(cycleYear) });
    const allAchievements = await Achievement.find({ employeeId });

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const qoq = quarters.map(q => {
      const qAchs = allAchievements.filter(a => a.quarter === q);
      const score = parseFloat(computeWeightedScore(goals, qAchs));
      return { quarter: q, score: isNaN(score) ? 0 : score };
    });

    res.json(qoq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
