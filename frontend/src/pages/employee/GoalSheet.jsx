import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { THRUST_AREAS, UOM_OPTIONS, GOAL_SUGGESTIONS } from '../../utils/scoreUtils';
import { Spinner, ProgressBar } from '../../components/common/UI';

const empty = () => ({ thrustArea: '', title: '', description: '', uom: 'numeric_max', target: '', weightage: '' });

export default function GoalSheet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([empty()]);
  const [existingGoals, setExistingGoals] = useState([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadExisting(); }, []);

  async function loadExisting() {
    try {
      const res = await api.get('/api/goals');
      const editable = res.data.filter(g => ['draft', 'returned'].includes(g.status));
      setExistingGoals(res.data);
    } catch {}
    setLoading(false);
  }

  const cycleYear = new Date().getFullYear();
  const nonReturnedExisting = existingGoals.filter(g => g.status !== 'returned');
  const existingWeight = nonReturnedExisting.reduce((s, g) => s + g.weightage, 0);
  const newWeight = goals.reduce((s, g) => s + (parseFloat(g.weightage) || 0), 0);
  const totalWeight = existingWeight + newWeight;
  const totalGoalCount = nonReturnedExisting.length + goals.length;

  function updateGoal(i, field, val) {
    const updated = [...goals];
    updated[i] = { ...updated[i], [field]: val };
    setGoals(updated);
    setErrors(prev => ({ ...prev, [`${i}_${field}`]: '' }));
  }

  function addGoal() {
    if (totalGoalCount >= 8) {
      setGlobalError('Max 8 goals allowed per cycle');
      return;
    }
    setGoals([...goals, empty()]);
  }

  function removeGoal(i) {
    if (goals.length === 1) return;
    setGoals(goals.filter((_, idx) => idx !== i));
  }

  function validate() {
    const errs = {};
    goals.forEach((g, i) => {
      if (!g.thrustArea) errs[`${i}_thrustArea`] = 'Required';
      if (!g.title) errs[`${i}_title`] = 'Required';
      if (!g.target) errs[`${i}_target`] = 'Required';
      if (!g.weightage) errs[`${i}_weightage`] = 'Required';
      if (parseFloat(g.weightage) < 10) errs[`${i}_weightage`] = 'Min 10%';
    });
    return errs;
  }

  async function saveGoals() {
    setGlobalError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      for (const g of goals) {
        await api.post('/api/goals', { ...g, cycleYear });
      }
      setSuccess('Goals saved as draft!');
      setTimeout(() => navigate('/employee/goals'), 1500);
    } catch (err) {
      setGlobalError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function submitGoals() {
    setGlobalError('');
    if (Math.abs(totalWeight - 100) > 0.01) {
      setGlobalError(`Total weightage must be 100%. Currently ${totalWeight}%`);
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      // Save first then submit
      let firstGoalId;
      for (const g of goals) {
        const res = await api.post('/api/goals', { ...g, cycleYear });
        if (!firstGoalId) firstGoalId = res.data._id;
      }
      await api.post(`/api/goals/${firstGoalId}/submit`);
      setSuccess('Goals submitted for manager approval! 🎉');
      setTimeout(() => navigate('/employee/goals'), 1500);
    } catch (err) {
      setGlobalError(err.response?.data?.error || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  if (nonReturnedExisting.filter(g => g.status === 'approved').length > 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold text-white">Set Goals</h1>
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="font-heading font-semibold text-white text-lg mb-2">Goals Already Approved</h3>
          <p className="text-gray-400 text-sm mb-4">Your goals are approved and locked. Contact your admin to unlock for editing.</p>
          <button onClick={() => navigate('/employee/goals')} className="btn-primary">View My Goals</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Set Goals — {cycleYear}</h1>
          <p className="text-gray-400 text-sm mt-1">Define up to 8 goals. Total weightage must equal 100%.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">{totalGoalCount}/8 goals</div>
        </div>
      </div>

      {/* Weightage Meter */}
      <div className="card sticky top-0 z-10 border-accent/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-300">Total Weightage</span>
          <span className={`text-lg font-heading font-bold font-mono ${totalWeight === 100 ? 'text-green-400' : totalWeight > 100 ? 'text-red-400' : 'text-yellow-400'}`}>
            {totalWeight}%
          </span>
        </div>
        <ProgressBar value={totalWeight} max={100} color={totalWeight === 100 ? 'bg-green-500' : totalWeight > 100 ? 'bg-red-500' : 'bg-accent'} />
        {totalWeight !== 100 && (
          <p className="text-xs mt-1 text-gray-500">
            {totalWeight > 100 ? `⚠ Over by ${(totalWeight - 100).toFixed(0)}%` : `Need ${(100 - totalWeight).toFixed(0)}% more`}
          </p>
        )}
        {existingWeight > 0 && (
          <p className="text-xs mt-1 text-gray-600">Existing goals: {existingWeight}% | New goals: {newWeight}%</p>
        )}
      </div>

      {/* Existing goals info */}
      {nonReturnedExisting.length > 0 && (
        <div className="card bg-[#1a1a2e] border-yellow-800/50">
          <p className="text-sm text-yellow-300">ℹ You have {nonReturnedExisting.length} existing goal(s) using {existingWeight}% weightage. Adding new goals below.</p>
        </div>
      )}

      {globalError && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">{globalError}</div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-lg px-4 py-3 text-sm">{success}</div>
      )}

      {/* Goal forms */}
      {goals.map((g, i) => (
        <GoalForm
          key={i} index={i} goal={g} errors={errors}
          onUpdate={(f, v) => updateGoal(i, f, v)}
          onRemove={() => removeGoal(i)}
          canRemove={goals.length > 1}
        />
      ))}

      <div className="flex items-center gap-3 flex-wrap">
        {totalGoalCount < 8 && (
          <button onClick={addGoal} className="btn-secondary">+ Add Another Goal</button>
        )}
        <div className="flex-1"></div>
        <button onClick={saveGoals} disabled={saving} className="btn-secondary">
          {saving ? '⏳ Saving…' : '💾 Save Draft'}
        </button>
        <button
          onClick={submitGoals}
          disabled={submitting || Math.abs(totalWeight - 100) > 0.01}
          className="btn-primary"
          title={Math.abs(totalWeight - 100) > 0.01 ? 'Total weightage must be 100%' : ''}
        >
          {submitting ? '⏳ Submitting…' : '📤 Submit for Approval'}
        </button>
      </div>
    </div>
  );
}

function GoalForm({ index, goal, errors, onUpdate, onRemove, canRemove }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = GOAL_SUGGESTIONS[goal.thrustArea] || [];

  return (
    <div className="card border border-border hover:border-accent/30 transition-colors animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-white">Goal #{index + 1}</h3>
        {canRemove && (
          <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-sm transition-colors">Remove</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Thrust Area */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Thrust Area *</label>
          <select
            value={goal.thrustArea}
            onChange={e => { onUpdate('thrustArea', e.target.value); setShowSuggestions(true); }}
            className="input"
          >
            <option value="">Select thrust area…</option>
            {THRUST_AREAS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors[`${index}_thrustArea`] && <p className="text-red-400 text-xs mt-1">{errors[`${index}_thrustArea`]}</p>}
        </div>

        {/* UoM */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Unit of Measure *</label>
          <select value={goal.uom} onChange={e => onUpdate('uom', e.target.value)} className="input">
            {UOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Title */}
        <div className="md:col-span-2">
          <label className="text-xs text-gray-400 mb-1 block">Goal Title *</label>
          <input
            type="text" value={goal.title}
            onChange={e => onUpdate('title', e.target.value)}
            className="input" placeholder="e.g. Increase monthly recurring revenue by 15%"
          />
          {errors[`${index}_title`] && <p className="text-red-400 text-xs mt-1">{errors[`${index}_title`]}</p>}

          {/* Smart suggestions */}
          {showSuggestions && suggestions.length > 0 && !goal.title && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(s => (
                  <button key={s} onClick={() => { onUpdate('title', s); setShowSuggestions(false); }}
                    className="text-xs bg-[#1a1a2e] border border-border hover:border-accent text-gray-300 hover:text-white px-2 py-1 rounded-lg transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="text-xs text-gray-400 mb-1 block">Description</label>
          <textarea
            value={goal.description}
            onChange={e => onUpdate('description', e.target.value)}
            className="input resize-none" rows={2} placeholder="Optional description…"
          />
        </div>

        {/* Target */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Target Value *</label>
          <input
            type="number" value={goal.target}
            onChange={e => onUpdate('target', e.target.value)}
            className="input font-mono" placeholder="0"
          />
          {errors[`${index}_target`] && <p className="text-red-400 text-xs mt-1">{errors[`${index}_target`]}</p>}
        </div>

        {/* Weightage */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Weightage (%) * <span className="text-gray-600">min 10%</span></label>
          <input
            type="number" value={goal.weightage} min={10} max={100}
            onChange={e => onUpdate('weightage', e.target.value)}
            className="input font-mono" placeholder="10"
          />
          {errors[`${index}_weightage`] && <p className="text-red-400 text-xs mt-1">{errors[`${index}_weightage`]}</p>}
        </div>
      </div>
    </div>
  );
}
