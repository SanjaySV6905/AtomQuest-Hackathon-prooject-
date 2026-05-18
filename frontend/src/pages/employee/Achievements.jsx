import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { computeScore, scoreColor } from '../../utils/scoreUtils';
import { Spinner, EmptyState, ProgressBar, Modal } from '../../components/common/UI';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function Achievements() {
  const { user } = useAuth();
  const [quarter, setQuarter] = useState('Q1');
  const [goals, setGoals] = useState([]);
  const [actuals, setActuals] = useState({});
  const [statuses, setStatuses] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [scoreModal, setScoreModal] = useState(null);

  useEffect(() => { load(); }, [quarter]);

  async function load() {
    setLoading(true);
    try {
      const [gRes, aRes] = await Promise.all([
        api.get('/api/goals'),
        api.get(`/api/achievements?quarter=${quarter}`)
      ]);
      const approved = gRes.data.filter(g => g.status === 'approved');
      setGoals(approved);

      const newActuals = {}, newStatuses = {};
      aRes.data.forEach(a => {
        newActuals[a.goalId?._id || a.goalId] = a.actual ?? '';
        newStatuses[a.goalId?._id || a.goalId] = a.status || 'not_started';
      });
      setActuals(newActuals);
      setStatuses(newStatuses);
    } catch {}
    setLoading(false);
  }

  async function saveAll() {
    setSaving(true); setMsg('');
    try {
      for (const goal of goals) {
        const actual = actuals[goal._id];
        if (actual === '' || actual === undefined) continue;
        await api.put('/api/achievements', {
          goalId: goal._id,
          quarter,
          actual: parseFloat(actual),
          status: statuses[goal._id] || 'on_track'
        });
      }
      setMsg('✅ Achievements saved!');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  const overallScore = goals.length > 0
    ? goals.reduce((sum, g) => {
        const s = computeScore(g.uom, g.target, actuals[g._id]);
        return sum + (s !== null ? s * (g.weightage / 100) : 0);
      }, 0)
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Achievement Entry</h1>
          <p className="text-gray-400 text-sm mt-1">Enter actuals for approved goals</p>
        </div>
        {overallScore !== null && (
          <div className="text-right">
            <div className="text-xs text-gray-500">Overall Score</div>
            <div className={`text-2xl font-heading font-bold font-mono ${scoreColor(overallScore)}`}>
              {overallScore.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Quarter tabs */}
      <div className="flex gap-2">
        {QUARTERS.map(q => (
          <button key={q} onClick={() => setQuarter(q)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${quarter === q ? 'bg-accent text-white' : 'bg-card border border-border text-gray-400 hover:text-white'}`}>
            {q}
          </button>
        ))}
      </div>

      {msg && <div className={`rounded-lg px-4 py-3 text-sm ${msg.startsWith('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'}`}>{msg}</div>}

      {goals.length === 0 ? (
        <EmptyState icon="🎯" title="No approved goals" message="You need approved goals before entering achievements" />
      ) : (
        <>
          <div className="space-y-4">
            {goals.map(goal => {
              const actual = actuals[goal._id];
              const score = computeScore(goal.uom, goal.target, actual);
              const scorePct = score !== null ? score : 0;

              return (
                <div key={goal._id} className="card">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-[#1a1a2e] text-gray-400 px-2 py-0.5 rounded">{goal.thrustArea}</span>
                        <span className="text-xs text-accent font-mono">{goal.weightage}%</span>
                      </div>
                      <h3 className="font-semibold text-white">{goal.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">Target: <span className="font-mono text-gray-300">{goal.target}</span> · UoM: <span className="font-mono text-gray-300">{goal.uom}</span></p>
                    </div>
                    {score !== null && (
                      <button
                        onClick={() => setScoreModal({ goal, actual, score })}
                        className={`text-xl font-heading font-bold font-mono cursor-pointer hover:opacity-80 transition-opacity ${scoreColor(score)}`}
                        title="Click for score breakdown"
                      >
                        {score.toFixed(1)}%
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Actual Value</label>
                      <input
                        type="number"
                        value={actual ?? ''}
                        onChange={e => setActuals(prev => ({ ...prev, [goal._id]: e.target.value }))}
                        className="input font-mono"
                        placeholder="Enter actual…"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Status</label>
                      <select
                        value={statuses[goal._id] || 'not_started'}
                        onChange={e => setStatuses(prev => ({ ...prev, [goal._id]: e.target.value }))}
                        className="input"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="on_track">On Track</option>
                        <option value="completed">Completed</option>
                        <option value="at_risk">At Risk</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Progress</label>
                      <div className="pt-2">
                        <ProgressBar value={scorePct} max={150} color={score >= 100 ? 'bg-green-500' : score >= 80 ? 'bg-yellow-500' : 'bg-red-500'} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button onClick={saveAll} disabled={saving} className="btn-primary">
              {saving ? '⏳ Saving…' : '💾 Save All Achievements'}
            </button>
          </div>
        </>
      )}

      {/* Score breakdown modal */}
      <Modal open={!!scoreModal} onClose={() => setScoreModal(null)} title="Score Breakdown" size="md">
        {scoreModal && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-white mb-1">{scoreModal.goal.title}</h4>
              <p className="text-xs text-gray-500">UoM: {scoreModal.goal.uom}</p>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-4 space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Target</span><span className="text-white">{scoreModal.goal.target}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Actual</span><span className="text-white">{scoreModal.actual}</span></div>
              <div className="border-t border-border pt-2 mt-2">
                <p className="text-xs text-gray-500 mb-2">Formula:</p>
                {scoreModal.goal.uom.includes('max') && <p className="text-gray-300">min(Actual / Target × 100, 150)</p>}
                {scoreModal.goal.uom.includes('min') && <p className="text-gray-300">min(Target / Actual × 100, 150)</p>}
                {scoreModal.goal.uom === 'timeline' && <p className="text-gray-300">100 if days_late ≤ 0, else max(100 − days_late × 2, 0)</p>}
                {scoreModal.goal.uom === 'zero' && <p className="text-gray-300">100 if actual === 0, else 0</p>}
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Raw Score</span>
                  <span className={`font-bold ${scoreColor(scoreModal.score)}`}>{scoreModal.score.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-400">Weightage</span>
                  <span className="text-accent">{scoreModal.goal.weightage}%</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-400">Contribution</span>
                  <span className="text-white">{(scoreModal.score * scoreModal.goal.weightage / 100).toFixed(2)} pts</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
