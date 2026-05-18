import React from 'react';

export function StatCard({ title, value, sub, accent, icon }) {
  return (
    <div className="card hover:border-accent/40 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</p>
          <p className={`text-3xl font-heading font-bold ${accent ? 'text-accent' : 'text-white'}`}>{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon || '📭'}</div>
      <h3 className="font-heading font-semibold text-white text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-4 max-w-xs">{message}</p>
      {action}
    </div>
  );
}

export function Badge({ status }) {
  const map = {
    draft: 'badge-draft',
    pending: 'badge-pending',
    approved: 'badge-approved',
    returned: 'badge-returned',
  };
  return <span className={map[status] || 'badge bg-gray-700 text-gray-300'}>{status}</span>;
}

export function ScoreDisplay({ score }) {
  if (score === null || score === undefined) return <span className="text-gray-500 font-mono">N/A</span>;
  const cls = score >= 100 ? 'score-green' : score >= 80 ? 'score-amber' : 'score-red';
  return <span className={cls}>{parseFloat(score).toFixed(1)}%</span>;
}

export function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min((value / max) * 100, 100);
  const bg = color || (pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-red-500');
  return (
    <div className="w-full bg-[#1a1a2e] rounded-full h-2">
      <div className={`${bg} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className={`bg-card border border-border rounded-xl w-full ${sizeMap[size]} max-h-[90vh] overflow-y-auto animate-slide-up`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-heading font-semibold text-white text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function GoalTimeline({ goal }) {
  const steps = [
    { label: 'Created', done: true, date: goal.createdAt },
    { label: 'Submitted', done: ['pending', 'approved', 'returned'].includes(goal.status), date: goal.updatedAt },
    { label: 'Approved', done: goal.status === 'approved', date: goal.approvedAt },
    { label: 'Q1', done: false }, { label: 'Q2', done: false },
    { label: 'Q3', done: false }, { label: 'Q4', done: false },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex flex-col items-center">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${s.done ? 'bg-green-500 border-green-500' : 'border-gray-600 bg-transparent'}`}>
              {s.done && <span className="text-white text-xs">✓</span>}
            </div>
            <span className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className={`h-0.5 w-4 mb-4 ${s.done && steps[i+1]?.done ? 'bg-green-500' : 'bg-gray-700'}`}></div>}
        </React.Fragment>
      ))}
    </div>
  );
}
