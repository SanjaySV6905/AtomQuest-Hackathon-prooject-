export function computeScore(uom, target, actual) {
  if (actual === null || actual === undefined || actual === '') return null;
  const a = parseFloat(actual);
  const t = parseFloat(target);

  switch (uom) {
    case 'numeric_min':
    case 'percent_min':
      if (t === 0) return a === 0 ? 100 : 0;
      return Math.min((t / a) * 100, 150);
    case 'numeric_max':
    case 'percent_max':
      if (t === 0) return 100;
      return Math.min((a / t) * 100, 150);
    case 'timeline':
      if (a <= 0) return 100;
      return Math.max(100 - a * 2, 0);
    case 'zero':
      return a === 0 ? 100 : 0;
    default:
      return null;
  }
}

export function scoreColor(score) {
  if (score === null) return 'text-gray-400';
  if (score >= 100) return 'text-green-400';
  if (score >= 80) return 'text-yellow-400';
  return 'text-red-400';
}

export function scoreLabel(score) {
  if (score === null) return 'N/A';
  return `${score.toFixed(1)}%`;
}

export const THRUST_AREAS = [
  'Revenue Growth', 'Customer Success', 'Process Excellence',
  'People Development', 'Innovation', 'Operational Efficiency', 'Quality'
];

export const UOM_OPTIONS = [
  { value: 'numeric_max', label: 'Numeric (Higher is Better)' },
  { value: 'numeric_min', label: 'Numeric (Lower is Better)' },
  { value: 'percent_max', label: 'Percentage (Higher is Better)' },
  { value: 'percent_min', label: 'Percentage (Lower is Better)' },
  { value: 'timeline', label: 'Timeline (Days Late)' },
  { value: 'zero', label: 'Zero Target (No Incidents)' },
];

export const GOAL_SUGGESTIONS = {
  'Revenue Growth': [
    'Increase monthly recurring revenue by 15%',
    'Acquire 50 new enterprise customers',
    'Reduce churn rate to below 2%'
  ],
  'Customer Success': [
    'Achieve NPS score of 70+',
    'Resolve 95% of tickets within SLA',
    'Complete 100% onboarding sessions on time'
  ],
  'Process Excellence': [
    'Reduce deployment time by 40%',
    'Implement CI/CD pipeline for all services',
    'Achieve zero critical production incidents'
  ],
  'People Development': [
    'Complete leadership training program',
    'Mentor 2 junior team members',
    'Obtain cloud certification'
  ],
  'Innovation': [
    'Launch 2 new product features',
    'File 1 patent application',
    'Conduct 10 user research sessions'
  ],
  'Operational Efficiency': [
    'Reduce operational costs by 10%',
    'Automate 5 manual processes',
    'Improve team velocity by 20%'
  ],
  'Quality': [
    'Achieve 80% code coverage',
    'Reduce bug escape rate to <5%',
    'Implement automated regression testing'
  ]
};
