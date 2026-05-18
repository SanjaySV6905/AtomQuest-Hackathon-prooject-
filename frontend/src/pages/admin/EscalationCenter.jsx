import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Spinner, EmptyState } from '../../components/common/UI';

export default function EscalationCenter() {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/api/escalations');
      setEscalations(res.data);
    } catch {}
    setLoading(false);
  }

  async function resolve(id) {
    try {
      await api.post(`/api/escalations/resolve/${id}`);
      setMsg('✅ Escalation resolved');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
    }
  }

  if (loading) return <Spinner />;

  const typeLabel = {
    goal_not_submitted: '📋 Goals Not Submitted',
    approval_pending: '⏳ Approval Pending',
    checkin_missing: '💬 Check-in Missing'
  };

  const typeColor = {
    goal_not_submitted: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50',
    approval_pending: 'text-orange-400 bg-orange-900/20 border-orange-800/50',
    checkin_missing: 'text-red-400 bg-red-900/20 border-red-800/50'
  };

  const filtered = filter === 'active' ? escalations.filter(e => !e.resolved) : filter === 'resolved' ? escalations.filter(e => e.resolved) : escalations;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Escalation Center</h1>
        <p className="text-gray-400 text-sm mt-1">Monitor and resolve performance escalations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-heading font-bold text-red-400">{escalations.filter(e => !e.resolved).length}</div>
          <div className="text-xs text-gray-500 mt-1">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-heading font-bold text-green-400">{escalations.filter(e => e.resolved).length}</div>
          <div className="text-xs text-gray-500 mt-1">Resolved</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-heading font-bold text-white">{escalations.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total</div>
        </div>
      </div>

      {msg && <div className={`rounded-lg px-4 py-3 text-sm ${msg.startsWith('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'}`}>{msg}</div>}

      {/* Filter */}
      <div className="flex gap-2">
        {['active', 'resolved', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-accent text-white' : 'bg-card border border-border text-gray-400 hover:text-white'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="✅" title="No escalations" message={filter === 'active' ? 'All escalations resolved!' : 'No escalations found'} />
      ) : (
        <div className="space-y-3">
          {filtered.map(esc => (
            <div key={esc._id} className={`card border ${esc.resolved ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded border ${typeColor[esc.type]}`}>
                      {typeLabel[esc.type]}
                    </span>
                    {esc.resolved && <span className="badge bg-green-900 text-green-300">✓ Resolved</span>}
                    {!esc.resolved && esc.daysOverdue > 0 && (
                      <span className="badge bg-red-900 text-red-300">{esc.daysOverdue}d overdue</span>
                    )}
                  </div>
                  <div className="text-sm text-white font-medium">{esc.employeeId?.name || 'Unknown Employee'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Manager: {esc.managerId?.name || 'Unassigned'} ·
                    Triggered: {new Date(esc.triggeredAt).toLocaleDateString()}
                    {esc.resolved && ` · Resolved: ${new Date(esc.resolvedAt).toLocaleDateString()}`}
                  </div>
                  {esc.notificationsSent?.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">{esc.notificationsSent.length} notification(s) sent</div>
                  )}
                </div>
                {!esc.resolved && (
                  <button onClick={() => resolve(esc._id)} className="btn-secondary text-xs flex-shrink-0">
                    ✓ Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule info */}
      <div className="card bg-[#1a1a2e] border-border/50">
        <h3 className="font-heading font-semibold text-white mb-3 text-sm">Active Escalation Rules</h3>
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 flex-shrink-0">Rule 1</span>
            <span>Employee hasn't submitted goals within 14 days → notify employee. After 7 more days → notify manager.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-orange-400 flex-shrink-0">Rule 2</span>
            <span>Manager hasn't approved within 7 days of submission → notify manager → escalate to admin.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 flex-shrink-0">Rule 3</span>
            <span>Check-in not completed within active window → notify manager.</span>
          </div>
          <p className="text-gray-600 mt-2">Cron job runs every hour to evaluate rules.</p>
        </div>
      </div>
    </div>
  );
}
