import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import api from '../../utils/api';
import { Spinner } from '../../components/common/UI';

const CHART_STYLE = { background: '#111118', border: '1px solid #2c2c3d', borderRadius: '8px', color: '#e2e2f0' };
const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#eab308'];

export default function ManagerAnalytics() {
  const [members, setMembers] = useState([]);
  const [qoqData, setQoqData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [mRes, orgQoQ] = await Promise.all([
        api.get('/api/admin/team-members'),
        api.get('/api/reports/analytics/qoq')
      ]);
      setMembers(mRes.data);

      // Fetch individual QoQ per member
      const memberQoQ = await Promise.all(
        mRes.data.map(m => api.get(`/api/achievements/all-quarters/${m._id}`).then(r => ({ member: m, data: r.data })).catch(() => null))
      );

      // Build combined chart: each quarter has org avg + each member
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const combined = quarters.map((q, i) => {
        const pt = { quarter: q, 'Org Avg': orgQoQ.data[i]?.avgScore || 0 };
        memberQoQ.filter(Boolean).forEach(m => {
          pt[m.member.name] = m.data[i]?.score || 0;
        });
        return pt;
      });
      setQoqData(combined);
    } catch {}
    setLoading(false);
  }

  if (loading) return <Spinner />;

  const lineKeys = ['Org Avg', ...members.map(m => m.name)];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Team Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Team performance comparison</p>
      </div>

      <div className="card">
        <h2 className="font-heading font-semibold text-white mb-4">Team QoQ Performance vs Org Average</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={qoqData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c2c3d" />
            <XAxis dataKey="quarter" stroke="#6b7280" />
            <YAxis domain={[0, 150]} stroke="#6b7280" />
            <Tooltip contentStyle={CHART_STYLE} formatter={v => [`${v?.toFixed(1)}%`]} />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }} />
            {lineKeys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k}
                stroke={i === 0 ? '#ffffff' : COLORS[i % COLORS.length]}
                strokeWidth={i === 0 ? 2 : 1.5}
                strokeDasharray={i === 0 ? '5 5' : undefined}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {members.length > 0 && (
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">Q1 Individual Scores</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={qoqData.filter(d => d.quarter === 'Q1')}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c3d" />
              <XAxis dataKey="quarter" stroke="#6b7280" />
              <YAxis domain={[0, 150]} stroke="#6b7280" />
              <Tooltip contentStyle={CHART_STYLE} formatter={v => [`${v?.toFixed(1)}%`]} />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }} />
              {members.map((m, i) => (
                <Bar key={m._id} dataKey={m.name} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
