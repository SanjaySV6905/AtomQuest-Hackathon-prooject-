import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Spinner, EmptyState, Badge, Modal } from '../../components/common/UI';

export default function TeamGoals() {
  const [members, setMembers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [returnModal, setReturnModal] = useState(null);
  const [returnComment, setReturnComment] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [mRes, gRes] = await Promise.all([
        api.get('/api/admin/team-members'),
        api.get('/api/goals')
      ]);
      setMembers(mRes.data);
      setGoals(gRes.data);
    } catch {}
    setLoading(false);
  }

  async function approve(goalId) {
    try {
      await api.post(`/api/goals/${goalId}/approve`);
      setMsg('✅ Goal approved');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
    }
  }

  async function approveAll(empId) {
    try {
      await api.post(`/api/goals/approve-all/${empId}`);
      setMsg('✅ All goals approved');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
    }
  }

  async function returnGoal() {
    if (!returnComment.trim()) return;
    try {
      await api.post(`/api/goals/${returnModal._id}/return`, { comment: returnComment });
      setMsg('↩ Goal returned');
      setReturnModal(null); setReturnComment('');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
    }
  }

  if (loading) return <Spinner />;

  const filteredGoals = filter === 'all' ? goals : goals.filter(g => g.status === filter);
  const byEmployee = members.map(m => ({
    member: m,
    goals: filteredGoals.filter(g =>
      (g.employeeId?._id || g.employeeId)?.toString() === m._id.toString()
    )
  })).filter(e => e.goals.length > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Team Goals</h1>
        <p className="text-gray-400 text-sm mt-1">Review and approve employee goal submissions</p>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.startsWith('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'}`}>
          {msg}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'returned', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-accent text-white' : 'bg-card border border-border text-gray-400 hover:text-white'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">
              {s === 'all' ? goals.length : goals.filter(g => g.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {byEmployee.length === 0 ? (
        <EmptyState icon="✅" title="Nothing here" message={`No ${filter} goals to review`} />
      ) : (
        byEmployee.map(({ member, goals: empGoals }) => {
          const totalWeight = empGoals.reduce((s, g) => s + g.weightage, 0);
          const pendingGoals = empGoals.filter(g => g.status === 'pending');
          const allPendingWeight = goals.filter(g => (g.employeeId?._id || g.employeeId)?.toString() === member._id.toString() && g.status === 'pending')
            .reduce((s, g) => s + g.weightage, 0);

          return (
            <div key={member._id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold">
                    {member.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.department} · Total weight: <span className={`font-mono font-bold ${Math.abs(allPendingWeight - 100) < 0.01 ? 'text-green-400' : 'text-yellow-400'}`}>{allPendingWeight}%</span></div>
                  </div>
                </div>
                {pendingGoals.length > 0 && Math.abs(allPendingWeight - 100) < 0.01 && (
                  <button onClick={() => approveAll(member._id)} className="btn-primary text-sm">✅ Approve All ({pendingGoals.length})</button>
                )}
                {pendingGoals.length > 0 && Math.abs(allPendingWeight - 100) > 0.01 && (
                  <span className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 px-2 py-1 rounded">⚠ Weight ≠ 100%</span>
                )}
              </div>

              <div className="space-y-3">
                {empGoals.map(goal => (
                  <div key={goal._id} className="bg-[#1a1a2e] rounded-lg p-4 border border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge status={goal.status} />
                          <span className="text-xs text-gray-500">{goal.thrustArea}</span>
                          <span className="text-xs text-accent font-mono">{goal.weightage}%</span>
                        </div>
                        <p className="font-medium text-white text-sm">{goal.title}</p>
                        {goal.description && <p className="text-xs text-gray-500 mt-1">{goal.description}</p>}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Target: <span className="font-mono text-gray-300">{goal.target}</span></span>
                          <span>UoM: <span className="font-mono text-gray-300">{goal.uom}</span></span>
                        </div>
                      </div>

                      {goal.status === 'pending' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => approve(goal._id)} className="btn-primary text-xs px-3 py-1.5">✅ Approve</button>
                          <button onClick={() => setReturnModal(goal)} className="btn-danger text-xs px-3 py-1.5">↩ Return</button>
                        </div>
                      )}
                    </div>

                    {goal.status === 'returned' && goal.returnComment && (
                      <div className="mt-3 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
                        <p className="text-xs text-red-400">Your comment: {goal.returnComment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Return modal */}
      <Modal open={!!returnModal} onClose={() => { setReturnModal(null); setReturnComment(''); }} title="Return Goal with Comment">
        {returnModal && (
          <div className="space-y-4">
            <div className="bg-[#1a1a2e] rounded-lg p-3">
              <p className="text-sm font-semibold text-white">{returnModal.title}</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Comment (required) *</label>
              <textarea
                value={returnComment}
                onChange={e => setReturnComment(e.target.value)}
                className="input resize-none" rows={4}
                placeholder="Explain what needs to be changed…"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setReturnModal(null); setReturnComment(''); }} className="btn-secondary">Cancel</button>
              <button onClick={returnGoal} disabled={!returnComment.trim()} className="btn-danger">↩ Return Goal</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
