import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Spinner, EmptyState, Badge, Modal } from '../../components/common/UI';
import { THRUST_AREAS, UOM_OPTIONS } from '../../utils/scoreUtils';

export default function GoalManagement() {
  const [goals, setGoals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', employee: '', thrust: '' });
  const [msg, setMsg] = useState('');
  const [sharedModal, setSharedModal] = useState(false);
  const [sharedForm, setSharedForm] = useState({ thrustArea: '', title: '', description: '', uom: 'numeric_max', target: '', defaultWeightage: '10', employeeIds: [] });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [gRes, uRes] = await Promise.all([api.get('/api/goals'), api.get('/api/auth/users')]);
      setGoals(gRes.data);
      setUsers(uRes.data);
    } catch {}
    setLoading(false);
  }

  async function unlock(goalId) {
    if (!confirm('Unlock this goal for editing?')) return;
    try {
      await api.post(`/api/admin/unlock/${goalId}`);
      setMsg('✅ Goal unlocked');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
    }
  }

  async function pushShared() {
    try {
      await api.post('/api/goals/shared', { ...sharedForm, target: parseFloat(sharedForm.target), defaultWeightage: parseFloat(sharedForm.defaultWeightage) });
      setMsg(`✅ Shared goal pushed to ${sharedForm.employeeIds.length} employees`);
      setSharedModal(false);
      setSharedForm({ thrustArea: '', title: '', description: '', uom: 'numeric_max', target: '', defaultWeightage: '10', employeeIds: [] });
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
    }
  }

  if (loading) return <Spinner />;

  const employees = users.filter(u => u.role === 'employee');
  let filtered = goals;
  if (filter.status) filtered = filtered.filter(g => g.status === filter.status);
  if (filter.employee) filtered = filtered.filter(g => (g.employeeId?._id || g.employeeId) === filter.employee);
  if (filter.thrust) filtered = filtered.filter(g => g.thrustArea === filter.thrust);

  const toggleEmp = (id) => {
    setSharedForm(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(id)
        ? prev.employeeIds.filter(e => e !== id)
        : [...prev.employeeIds, id]
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Goal Management</h1>
          <p className="text-gray-400 text-sm mt-1">{goals.length} total goals across all employees</p>
        </div>
        <button onClick={() => setSharedModal(true)} className="btn-primary">+ Push Shared KPI</button>
      </div>

      {msg && <div className={`rounded-lg px-4 py-3 text-sm ${msg.startsWith('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'}`}>{msg}</div>}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))} className="input text-sm">
          <option value="">All Statuses</option>
          {['draft', 'pending', 'approved', 'returned'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.employee} onChange={e => setFilter(p => ({ ...p, employee: e.target.value }))} className="input text-sm">
          <option value="">All Employees</option>
          {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
        <select value={filter.thrust} onChange={e => setFilter(p => ({ ...p, thrust: e.target.value }))} className="input text-sm">
          <option value="">All Thrust Areas</option>
          {THRUST_AREAS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🎯" title="No goals found" message="Try adjusting filters" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-border">
                <th className="text-left py-3 pr-4">Employee</th>
                <th className="text-left py-3 pr-4">Goal</th>
                <th className="text-left py-3 pr-4">Thrust Area</th>
                <th className="text-right py-3 pr-4">Weight</th>
                <th className="text-center py-3 pr-4">Status</th>
                <th className="text-right py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g._id} className="border-b border-border/30 hover:bg-[#1a1a2e] transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-white text-sm">{g.employeeId?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{g.employeeId?.department}</div>
                  </td>
                  <td className="py-3 pr-4 max-w-xs">
                    <div className="text-gray-200 truncate">{g.title}</div>
                    {g.isShared && <span className="text-xs text-purple-400">🔗 Shared</span>}
                  </td>
                  <td className="py-3 pr-4 text-gray-400 text-xs">{g.thrustArea}</td>
                  <td className="py-3 pr-4 text-right font-mono text-accent">{g.weightage}%</td>
                  <td className="py-3 pr-4 text-center"><Badge status={g.status} /></td>
                  <td className="py-3 text-right">
                    {g.status === 'approved' && (
                      <button onClick={() => unlock(g._id)} className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-800/50 px-2 py-1 rounded transition-colors">
                        🔓 Unlock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Push Shared KPI modal */}
      <Modal open={sharedModal} onClose={() => setSharedModal(false)} title="Push Shared KPI to Employees" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Thrust Area *</label>
              <select value={sharedForm.thrustArea} onChange={e => setSharedForm(p => ({ ...p, thrustArea: e.target.value }))} className="input">
                <option value="">Select…</option>
                {THRUST_AREAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">UoM *</label>
              <select value={sharedForm.uom} onChange={e => setSharedForm(p => ({ ...p, uom: e.target.value }))} className="input">
                {UOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Title *</label>
            <input value={sharedForm.title} onChange={e => setSharedForm(p => ({ ...p, title: e.target.value }))} className="input" placeholder="Shared goal title…" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description</label>
            <textarea value={sharedForm.description} onChange={e => setSharedForm(p => ({ ...p, description: e.target.value }))} className="input resize-none" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Target *</label>
              <input type="number" value={sharedForm.target} onChange={e => setSharedForm(p => ({ ...p, target: e.target.value }))} className="input font-mono" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Default Weightage (%)</label>
              <input type="number" min={10} value={sharedForm.defaultWeightage} onChange={e => setSharedForm(p => ({ ...p, defaultWeightage: e.target.value }))} className="input font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Select Recipients *</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {employees.map(e => (
                <label key={e._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a2e] cursor-pointer">
                  <input type="checkbox" checked={sharedForm.employeeIds.includes(e._id)} onChange={() => toggleEmp(e._id)} className="accent-accent" />
                  <span className="text-sm text-gray-300">{e.name} <span className="text-gray-500">({e.department})</span></span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setSharedModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={pushShared} disabled={!sharedForm.title || !sharedForm.thrustArea || sharedForm.employeeIds.length === 0} className="btn-primary">
              Push to {sharedForm.employeeIds.length} Employees
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
