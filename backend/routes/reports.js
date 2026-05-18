const router = require('express').Router();
const Goal = require('../models/Goal');
const Achievement = require('../models/Achievement');
const { AuditLog, Checkin } = require('../models/index');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { computeScore } = require('../utils/scoreUtils');
const XLSX = require('xlsx');

function toCSV(rows, headers) {
  const lines = [headers.join(',')];
  rows.forEach(r => lines.push(headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')));
  return lines.join('\n');
}

// GET /api/reports/achievement-csv
router.get('/achievement-csv', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { quarter, cycleYear } = req.query;
    const goalFilter = { status: 'approved' };
    if (cycleYear) goalFilter.cycleYear = parseInt(cycleYear);

    const goals = await Goal.find(goalFilter)
      .populate('employeeId', 'name email department')
      .populate('managerId', 'name');

    const rows = [];
    for (const goal of goals) {
      const ach = quarter
        ? await Achievement.findOne({ goalId: goal._id, quarter })
        : null;

      const score = ach ? computeScore(goal.uom, goal.target, ach.actual) : null;

      rows.push({
        Employee: goal.employeeId?.name || '',
        Email: goal.employeeId?.email || '',
        Department: goal.employeeId?.department || '',
        Manager: goal.managerId?.name || '',
        ThrustArea: goal.thrustArea,
        Title: goal.title,
        UoM: goal.uom,
        Target: goal.target,
        Weightage: goal.weightage,
        Quarter: quarter || 'All',
        Actual: ach?.actual ?? '',
        Score: score !== null ? score?.toFixed(2) : '',
        Status: ach?.status || 'not_started'
      });
    }

    const csv = toCSV(rows, ['Employee', 'Email', 'Department', 'Manager', 'ThrustArea', 'Title', 'UoM', 'Target', 'Weightage', 'Quarter', 'Actual', 'Score', 'Status']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=achievement-report.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/achievement-xlsx
router.get('/achievement-xlsx', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { quarter, cycleYear } = req.query;
    const goalFilter = { status: 'approved' };
    if (cycleYear) goalFilter.cycleYear = parseInt(cycleYear);

    const goals = await Goal.find(goalFilter)
      .populate('employeeId', 'name email department')
      .populate('managerId', 'name');

    const rows = [['Employee', 'Email', 'Department', 'Manager', 'Thrust Area', 'Title', 'UoM', 'Target', 'Weightage', 'Quarter', 'Actual', 'Score', 'Status']];

    for (const goal of goals) {
      const ach = quarter ? await Achievement.findOne({ goalId: goal._id, quarter }) : null;
      const score = ach ? computeScore(goal.uom, goal.target, ach.actual) : null;

      rows.push([
        goal.employeeId?.name || '', goal.employeeId?.email || '',
        goal.employeeId?.department || '', goal.managerId?.name || '',
        goal.thrustArea, goal.title, goal.uom, goal.target, goal.weightage,
        quarter || 'All', ach?.actual ?? '', score !== null ? parseFloat(score.toFixed(2)) : '',
        ach?.status || 'not_started'
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows[0].map(() => ({ wch: 20 }));
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = { fill: { fgColor: { rgb: 'F97316' } }, font: { bold: true, color: { rgb: 'FFFFFF' } } };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Achievement Report');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=achievement-report.xlsx');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/completion-csv
router.get('/completion-csv', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' });
    const checkins = await Checkin.find();

    const rows = employees.map(emp => {
      const empCheckins = checkins.filter(c => c.employeeId.toString() === emp._id.toString());
      return {
        Employee: emp.name,
        Email: emp.email,
        Department: emp.department,
        Q1: empCheckins.some(c => c.quarter === 'Q1') ? 'Yes' : 'No',
        Q2: empCheckins.some(c => c.quarter === 'Q2') ? 'Yes' : 'No',
        Q3: empCheckins.some(c => c.quarter === 'Q3') ? 'Yes' : 'No',
        Q4: empCheckins.some(c => c.quarter === 'Q4') ? 'Yes' : 'No'
      };
    });

    const csv = toCSV(rows, ['Employee', 'Email', 'Department', 'Q1', 'Q2', 'Q3', 'Q4']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=completion-report.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/analytics/qoq
router.get('/analytics/qoq', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const cycleYear = req.query.cycleYear || new Date().getFullYear();
    const employees = await User.find({ role: 'employee' });
    const goals = await Goal.find({ status: 'approved', cycleYear: parseInt(cycleYear) });
    const allAchievements = await Achievement.find();

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const result = quarters.map(q => {
      const qData = { quarter: q };
      let totalScore = 0, count = 0;

      employees.forEach(emp => {
        const empGoals = goals.filter(g => g.employeeId.toString() === emp._id.toString());
        const empAchs = allAchievements.filter(a => a.employeeId.toString() === emp._id.toString() && a.quarter === q);

        if (empGoals.length > 0 && empAchs.length > 0) {
          let ws = 0;
          empGoals.forEach(g => {
            const ach = empAchs.find(a => a.goalId.toString() === g._id.toString());
            if (ach && ach.actual !== null) {
              ws += computeScore(g.uom, g.target, ach.actual) * (g.weightage / 100);
            }
          });
          totalScore += ws;
          count++;
        }
      });

      qData.avgScore = count > 0 ? parseFloat((totalScore / count).toFixed(2)) : 0;
      return qData;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/analytics/thrust
router.get('/analytics/thrust', auth, requireRole('admin'), async (req, res) => {
  try {
    const data = await Goal.aggregate([
      { $group: { _id: '$thrustArea', count: { $sum: 1 }, avgWeight: { $avg: '$weightage' } } },
      { $sort: { count: -1 } }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/analytics/uom
router.get('/analytics/uom', auth, requireRole('admin'), async (req, res) => {
  try {
    const data = await Goal.aggregate([
      { $group: { _id: '$uom', count: { $sum: 1 } } }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
