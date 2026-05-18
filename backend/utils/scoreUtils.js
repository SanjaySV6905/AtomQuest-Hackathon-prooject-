/**
 * Score formulas per UoM type
 */
function computeScore(uom, target, actual) {
  if (actual === null || actual === undefined) return null;

  switch (uom) {
    case 'numeric_min':
    case 'percent_min':
      // Higher actual = better (minimize target: score if actual <= target)
      if (target === 0) return actual === 0 ? 100 : 0;
      return Math.min((target / actual) * 100, 150);

    case 'numeric_max':
    case 'percent_max':
      // Higher actual = better (maximize target)
      if (target === 0) return 100;
      return Math.min((actual / target) * 100, 150);

    case 'timeline':
      // actual = days_late (0 means on time)
      if (actual <= 0) return 100;
      return Math.max(100 - actual * 2, 0);

    case 'zero':
      return actual === 0 ? 100 : 0;

    default:
      return null;
  }
}

function computeWeightedScore(goals, achievements) {
  let totalWeight = 0;
  let weightedScore = 0;

  goals.forEach(goal => {
    const ach = achievements.find(a => a.goalId.toString() === goal._id.toString());
    if (!ach || ach.actual === null) return;

    const score = computeScore(goal.uom, goal.target, ach.actual);
    if (score === null) return;

    weightedScore += score * (goal.weightage / 100);
    totalWeight += goal.weightage;
  });

  if (totalWeight === 0) return 0;
  return (weightedScore / (totalWeight / 100)).toFixed(2);
}

module.exports = { computeScore, computeWeightedScore };
