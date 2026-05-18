import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Spinner } from '../../components/common/UI';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function CycleManagement() {
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/api/admin/cycle');
      setCycle(res.data);
    } catch {}
    setLoading(false);
  }

  async function save() {
    setSaving(true); setMsg('');
    try {
      await api.put('/api/admin/cycle', cycle);
      setMsg('✅ Cycle saved');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (!cycle) return <div className="text-gray-400">No cycle found</div>;

  function updateWindow(q, field, val) {
    setCycle(prev => ({
      ...prev,
      windows: {
        ...prev.windows,
        [q]: { ...prev.windows[q], [field]: val }
      }
    }));
  }

  const qColors = { Q1: 'border-blue-700/50', Q2: 'border-green-700/50', Q3: 'border-yellow-700/50', Q4: 'border-purple-700/50' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Cycle Management</h1>
        <p className="text-gray-400 text-sm mt-1">Configure performance cycle and check-in windows</p>
      </div>

      {msg && <div className={`rounded-lg px-4 py-3 text-sm ${msg.startsWith('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'}`}>{msg}</div>}

      <div className="card">
        <h2 className="font-heading font-semibold text-white mb-4">Current Cycle</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Cycle Year</label>
            <input
              type="number" value={cycle.year}
              onChange={e => setCycle(p => ({ ...p, year: parseInt(e.target.value) }))}
              className="input font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Active Quarter</label>
            <div className="flex gap-2">
              {QUARTERS.map(q => (
                <button key={q} onClick={() => setCycle(p => ({ ...p, activeQuarter: q }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${cycle.activeQuarter === q ? 'bg-accent text-white' : 'bg-[#1a1a2e] border border-border text-gray-400 hover:text-white'}`}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <h3 className="font-heading font-semibold text-white mb-3 text-sm">Check-in Windows</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUARTERS.map(q => {
            const win = cycle.windows?.[q] || {};
            const isActive = cycle.activeQuarter === q;
            return (
              <div key={q} className={`bg-[#1a1a2e] rounded-lg p-4 border ${isActive ? 'border-accent/50' : qColors[q] || 'border-border'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-white text-sm">{q}</span>
                  {isActive && <span className="text-xs bg-accent text-white px-2 py-0.5 rounded font-semibold">ACTIVE</span>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Open</label>
                    <input
                      type="date"
                      value={win.open ? new Date(win.open).toISOString().slice(0, 10) : ''}
                      onChange={e => updateWindow(q, 'open', e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Close</label>
                    <input
                      type="date"
                      value={win.close ? new Date(win.close).toISOString().slice(0, 10) : ''}
                      onChange={e => updateWindow(q, 'close', e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline visual */}
      <div className="card">
        <h2 className="font-heading font-semibold text-white mb-4">Cycle Timeline ({cycle.year})</h2>
        <div className="flex items-center gap-0">
          {QUARTERS.map((q, i) => {
            const win = cycle.windows?.[q];
            const isActive = cycle.activeQuarter === q;
            return (
              <React.Fragment key={q}>
                <div className={`flex-1 text-center p-3 rounded-lg border ${isActive ? 'bg-accent/20 border-accent' : 'bg-[#1a1a2e] border-border'}`}>
                  <div className={`font-heading font-bold text-sm ${isActive ? 'text-accent' : 'text-gray-400'}`}>{q}</div>
                  {win?.open && <div className="text-xs text-gray-500 mt-1">{new Date(win.open).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>}
                  {win?.close && <div className="text-xs text-gray-600">— {new Date(win.close).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>}
                </div>
                {i < 3 && <div className="w-4 h-0.5 bg-border flex-shrink-0"></div>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? '⏳ Saving…' : '💾 Save Cycle'}
        </button>
      </div>
    </div>
  );
}
