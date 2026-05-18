import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Spinner, EmptyState, Badge, GoalTimeline, Modal } from '../../components/common/UI';

export default function MyGoals() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [auditGoal, setAuditGoal] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/api/goals');
      setGoals(res.data);
    } catch {}
    setLoading(false);
  }

  async function submitAll() {
    setMsg('');
    const drafts = goals.filter(g => g.status === 'draft');
    if (drafts.length === 0) return setMsg('No draft goals to submit');

    setSubmitting(true);
    try {
      await api.post(`/api/goals/${drafts[0]._id}/submit`);
      setMsg('✅ Goals submitted for approval!');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.delete(`/api/goals/${id}`);
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Delete failed');
    }
  }

  async function openAudit(goal) {
    setAuditGoal(goal);
    try {
      const res = await api.get(`/api/audit/${goal._id}`);
      setAuditLogs(res.data);
    } catch {}
  }

  if (loading) return <Spinner />;

  const filtered = filter === 'all' ? goals : goals.filter(g => g.status === filter);
  const totalWeight = goals.filter(g => g.status !== 'returned').reduce((s, g) => s + g.weightage, 0);
  const hasDraft = goals.some(g => g.status === 'draft');
  const hasPending = goals.some(g => g.status === 'pending');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">My Goals</h1>
          <p className="text-gray-400 text-sm mt-1">{goals.length} goals · {totalWeight}% weightage used</p>
        </div>
        <div className="flex gap-3">
          {hasDraft && (
            <button onClick={submitAll} disabled={submitting || Math.abs(totalWeight - 100) > 0.01} className="btn-primary" title={Math.abs(totalWeight - 100) > 0.01 ? 'Total must be 100%' : ''}>
              {submitting ? '⏳' : '📤'} Submit for Approval
            </button>
          )}
          <button onClick={() => navigate('/employee/goals/new')} className="btn-secondary">+ Add Goal</button>
        </div>
      </div>

      {msg && <div className={`rounded-lg px-4 py-3 text-sm ${msg.startsWith('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'}`}>{msg}</div>}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'pending', 'approved', 'returned'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-accent text-white' : 'bg-card border border-border text-gray-400 hover:text-white'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">
              {s === 'all' ? goals.length : goals.filter(g => g.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🎯" title="No goals found" message="Create your first goal to start tracking performance" action={<button onClick={() => navigate('/employee/goals/new')} className="btn-primary">Set Goals</button>} />
      ) : (
        <div className="space-y-4">
          {filtered.map(goal => (
            <div key={goal._id} className="card hover:border-accent/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge status={goal.status} />
                    {goal.isShared && <span className="badge bg-purple-900 text-purple-300">🔗 Shared</span>}
                    {goal.status === 'approved' && <span className="text-xs text-gray-500">🔒 Locked</span>}
                    <span className="text-xs text-gray-500 bg-[#1a1a2e] px-2 py-0.5 rounded">{goal.thrustArea}</span>
                  </div>
                  <h3 className="font-semibold text-white text-base">{goal.title}</h3>
                  {goal.description && <p className="text-sm text-gray-400 mt-1">{goal.description}</p>}

                  {goal.status === 'returned' && goal.returnComment && (
                    <div className="mt-2 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-red-400 font-semibold mb-1">↩ Manager Comment</p>
                      <p className="text-sm text-red-300">{goal.returnComment}</p>
                    </div>
                  )}

                  <div className="flex gap-4 mt-3 text-xs text-gray-500">
                    <span>UoM: <span className="text-gray-300 font-mono">{goal.uom}</span></span>
                    <span>Target: <span className="text-gray-300 font-mono">{goal.target}</span></span>
                    <span>Weight: <span className="text-accent font-mono font-bold">{goal.weightage}%</span></span>
                  </div>

                  <div className="mt-3">
                    <GoalTimeline goal={goal} />
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {['draft', 'returned'].includes(goal.status) && !goal.isShared && (
                    <button onClick={() => navigate('/employee/goals/new')} className="btn-secondary text-xs px-2 py-1">Edit</button>
                  )}
                  {['draft', 'returned'].includes(goal.status) && (
                    <button onClick={() => deleteGoal(goal._id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 border border-red-800/50 rounded-lg transition-colors">Delete</button>
                  )}
                  <button onClick={() => openAudit(goal)} className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 border border-border rounded-lg transition-colors">History</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit modal */}
      <Modal open={!!auditGoal} onClose={() => setAuditGoal(null)} title={`History: ${auditGoal?.title}`} size="lg">
        {auditLogs.length === 0 ? (
          <p className="text-gray-500 text-sm">No audit history for this goal</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map(log => (
              <div key={log._id} className="bg-[#1a1a2e] rounded-lg p-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-accent">{log.changeType}</span>
                  <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-400">By: {log.changedBy?.name}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Before:</span>
                    <pre className="text-red-300 mt-1 bg-red-900/10 p-2 rounded overflow-x-auto">{JSON.stringify(log.oldValue, null, 2)}</pre>
                  </div>
                  <div>
                    <span className="text-gray-500">After:</span>
                    <pre className="text-green-300 mt-1 bg-green-900/10 p-2 rounded overflow-x-auto">{JSON.stringify(log.newValue, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
