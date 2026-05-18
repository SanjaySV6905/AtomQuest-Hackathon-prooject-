import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { computeScore, scoreColor } from '../../utils/scoreUtils';
import { Spinner, EmptyState, ProgressBar } from '../../components/common/UI';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function Checkins() {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [goals, setGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [comment, setComment] = useState('');
  const [prevCheckins, setPrevCheckins] = useState([]);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMembers(); }, []);
  useEffect(() => { if (selectedMember) loadGoalData(); }, [selectedMember, selectedQuarter]);

  async function loadMembers() {
    try {
      const res = await api.get('/api/admin/team-members');
      setMembers(res.data);
      if (res.data.length > 0) setSelectedMember(res.data[0]._id);
    } catch {}
    setLoading(false);
  }

  async function loadGoalData() {
    try {
      const [gRes, aRes, cRes] = await Promise.all([
        api.get(`/api/goals?employeeId=${selectedMember}`),
        api.get(`/api/achievements?employeeId=${selectedMember}&quarter=${selectedQuarter}`),
        api.get(`/api/checkins?employeeId=${selectedMember}`)
      ]);
      setGoals(gRes.data.filter(g => g.status === 'approved'));
      setAchievements(aRes.data);
      setPrevCheckins(cRes.data);
    } catch {}
  }

  async function saveCheckin() {
    if (!comment.trim()) return setMsg('Comment required');
    setSaving(true); setMsg('');

    const snapshots = goals.map(g => {
      const ach = achievements.find(a => (a.goalId?._id || a.goalId)?.toString() === g._id.toString());
      const score = ach ? computeScore(g.uom, g.target, ach.actual) : null;
      return { goalId: g._id, title: g.title, actual: ach?.actual, target: g.target, score };
    });

    try {
      await api.post('/api/checkins', { employeeId: selectedMember, quarter: selectedQuarter, comment, goalSnapshots: snapshots });
      setMsg('✅ Check-in saved!');
      setComment('');
      loadGoalData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error saving');
    } finally {
      setSaving(false);
    }
  }

  async function generateAISuggestion() {
    setAiLoading(true);
    const member = members.find(m => m._id === selectedMember);
    const data = goals.map(g => {
      const ach = achievements.find(a => (a.goalId?._id || a.goalId)?.toString() === g._id.toString());
      const score = ach ? computeScore(g.uom, g.target, ach.actual) : null;
      return { title: g.title, target: g.target, actual: ach?.actual || 'N/A', score: score ? score.toFixed(1) + '%' : 'N/A', status: ach?.status || 'not_started' };
    });

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: 'You are an experienced manager writing a performance check-in comment. Be specific, constructive, and encouraging. Keep it to 3-4 sentences. Focus on actual performance data provided.',
          messages: [{
            role: 'user',
            content: `Write a manager check-in comment for ${member?.name || 'the employee'} for ${selectedQuarter}. Their goal performance: ${JSON.stringify(data)}`
          }]
        })
      });
      const json = await res.json();
      const text = json.content?.[0]?.text;
      if (text) setComment(text);
      else setMsg('AI suggestion unavailable — add your own comment');
    } catch {
      setMsg('AI unavailable — CLAUDE_API_KEY not configured in browser. Write your comment manually.');
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Check-ins</h1>
        <p className="text-gray-400 text-sm mt-1">Review performance and leave feedback</p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Team Member</label>
          <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} className="input">
            {members.map(m => <option key={m._id} value={m._id}>{m.name} ({m.department})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Quarter</label>
          <div className="flex gap-2">
            {QUARTERS.map(q => (
              <button key={q} onClick={() => setSelectedQuarter(q)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedQuarter === q ? 'bg-accent text-white' : 'bg-card border border-border text-gray-400 hover:text-white'}`}>
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Goals table */}
      {goals.length === 0 ? (
        <EmptyState icon="🎯" title="No approved goals" message="This employee has no approved goals for check-in" />
      ) : (
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">{selectedQuarter} Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-border">
                  <th className="text-left py-2 pr-4">Goal</th>
                  <th className="text-right py-2 pr-4">Target</th>
                  <th className="text-right py-2 pr-4">Actual</th>
                  <th className="text-right py-2 pr-4">Score</th>
                  <th className="py-2">Progress</th>
                </tr>
              </thead>
              <tbody>
                {goals.map(g => {
                  const ach = achievements.find(a => (a.goalId?._id || a.goalId)?.toString() === g._id.toString());
                  const score = ach ? computeScore(g.uom, g.target, ach.actual) : null;
                  return (
                    <tr key={g._id} className="border-b border-border/50">
                      <td className="py-3 pr-4">
                        <div className="text-white font-medium">{g.title}</div>
                        <div className="text-xs text-gray-500">{g.thrustArea} · {g.weightage}%</div>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-gray-400">{g.target}</td>
                      <td className="py-3 pr-4 text-right font-mono text-gray-300">{ach?.actual ?? '—'}</td>
                      <td className={`py-3 pr-4 text-right font-mono font-bold ${scoreColor(score)}`}>
                        {score !== null ? `${score.toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="py-3 w-32">
                        <ProgressBar value={score || 0} max={150} color={score >= 100 ? 'bg-green-500' : score >= 80 ? 'bg-yellow-500' : 'bg-red-500'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comment */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-white">Check-in Comment</h2>
          <button onClick={generateAISuggestion} disabled={aiLoading || goals.length === 0}
            className="btn-secondary text-xs">
            {aiLoading ? '⏳ Generating…' : '✨ AI Suggest'}
          </button>
        </div>
        <textarea
          value={comment} onChange={e => setComment(e.target.value)}
          className="input resize-none mb-3" rows={5}
          placeholder="Write your check-in comment here…"
        />
        {msg && <p className={`text-sm mb-3 ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
        <button onClick={saveCheckin} disabled={saving || !comment.trim()} className="btn-primary">
          {saving ? '⏳ Saving…' : '💾 Save Check-in'}
        </button>
      </div>

      {/* Previous check-ins */}
      {prevCheckins.length > 0 && (
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">Previous Check-ins</h2>
          <div className="space-y-3">
            {prevCheckins.slice(0, 5).map(c => (
              <div key={c._id} className="bg-[#1a1a2e] rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-accent">{c.quarter}</span>
                  <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-300">{c.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
