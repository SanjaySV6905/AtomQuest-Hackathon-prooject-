import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { StatCard, Spinner, EmptyState, ProgressBar } from '../../components/common/UI';

export default function EmpDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [scores, setScores] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [gRes, cRes] = await Promise.all([
        api.get('/api/goals'),
        api.get('/api/checkins')
      ]);
      setGoals(gRes.data);
      setCheckins(cRes.data);

      const approvedGoals = gRes.data.filter(g => g.status === 'approved');
      if (approvedGoals.length > 0) {
        try {
          const sRes = await api.get(`/api/achievements/scores/${user._id}/Q1`);
          setScores(sRes.data);
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Spinner />;

  const approved = goals.filter(g => g.status === 'approved').length;
  const pending = goals.filter(g => g.status === 'pending').length;
  const draft = goals.filter(g => g.status === 'draft').length;
  const returned = goals.filter(g => g.status === 'returned').length;
  const totalWeight = goals.filter(g => g.status !== 'returned').reduce((s, g) => s + g.weightage, 0);

  const pieData = [
    { name: 'Approved', value: approved, color: '#22c55e' },
    { name: 'Pending', value: pending, color: '#eab308' },
    { name: 'Draft', value: draft, color: '#6b7280' },
    { name: 'Returned', value: returned, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const avgScore = scores?.overallScore ? parseFloat(scores.overallScore) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Welcome back, {user.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Here's your performance snapshot</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Goals" value={goals.length} sub={`${approved} approved`} icon="🎯" />
        <StatCard title="Approved" value={approved} sub="locked goals" accent icon="✅" />
        <StatCard title="Q1 Score" value={avgScore ? `${avgScore.toFixed(1)}%` : 'N/A'} sub="overall weighted" icon="📊" />
        <StatCard title="Weightage Used" value={`${totalWeight}%`} sub={totalWeight === 100 ? '✓ Complete' : `${100 - totalWeight}% remaining`} icon="⚖️" />
      </div>

      {/* Weightage meter */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-white">Weightage Allocation</h2>
          <span className={`text-sm font-mono font-bold ${totalWeight === 100 ? 'text-green-400' : totalWeight > 100 ? 'text-red-400' : 'text-yellow-400'}`}>
            {totalWeight}% / 100%
          </span>
        </div>
        <ProgressBar
          value={totalWeight}
          max={100}
          color={totalWeight === 100 ? 'bg-green-500' : totalWeight > 100 ? 'bg-red-500' : 'bg-accent'}
        />
        {totalWeight !== 100 && (
          <p className="text-xs text-yellow-400 mt-2">
            {totalWeight > 100 ? `⚠ Over by ${totalWeight - 100}% — adjust before submitting` : `ℹ Add ${100 - totalWeight}% more to submit`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">Goal Status Breakdown</h2>
          {goals.length === 0 ? (
            <EmptyState icon="🎯" title="No goals yet" message="Create your first goal to get started" action={<button onClick={() => navigate('/employee/goals/new')} className="btn-primary">Set Goals</button>} />
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#111118', border: '1px solid #2c2c3d', borderRadius: '8px', color: '#e2e2f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }}></div>
                    <span className="text-sm text-gray-300">{d.name}</span>
                    <span className="text-sm font-mono font-bold text-white ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent check-ins */}
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">Recent Manager Comments</h2>
          {checkins.length === 0 ? (
            <EmptyState icon="💬" title="No check-ins yet" message="Your manager hasn't done a check-in yet" />
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {checkins.slice(0, 5).map(c => (
                <div key={c._id} className="bg-[#1a1a2e] rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-accent">{c.quarter}</span>
                    <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-300">{c.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="font-heading font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/employee/goals/new')} className="btn-primary">+ Set Goals</button>
          <button onClick={() => navigate('/employee/goals')} className="btn-secondary">View Goals</button>
          <button onClick={() => navigate('/employee/achievements')} className="btn-secondary">Enter Achievements</button>
          <button onClick={() => navigate('/employee/analytics')} className="btn-secondary">View Analytics</button>
        </div>
      </div>
    </div>
  );
}
