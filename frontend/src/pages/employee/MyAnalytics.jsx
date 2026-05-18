import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Spinner, EmptyState } from '../../components/common/UI';

const CHART_STYLE = { background: '#111118', border: '1px solid #2c2c3d', borderRadius: '8px', color: '#e2e2f0' };

export default function MyAnalytics() {
  const { user } = useAuth();
  const [qoq, setQoq] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [qRes, q1, q2] = await Promise.all([
        api.get(`/api/achievements/all-quarters/${user._id}`),
        api.get(`/api/achievements/scores/${user._id}/Q1`),
        api.get(`/api/achievements/scores/${user._id}/Q2`),
      ]);
      setQoq(qRes.data);
      setScores({ Q1: q1.data, Q2: q2.data });
    } catch {}
    setLoading(false);
  }

  if (loading) return <Spinner />;

  const radarData = (scores.Q1?.breakdown || []).map(b => ({
    subject: b.title.length > 20 ? b.title.slice(0, 20) + '…' : b.title,
    score: b.score || 0
  }));

  const scoreDistrib = [
    { range: '0–50%', count: 0 }, { range: '50–80%', count: 0 },
    { range: '80–100%', count: 0 }, { range: '100–150%', count: 0 }
  ];
  (scores.Q1?.breakdown || []).forEach(b => {
    if (!b.score) return;
    if (b.score < 50) scoreDistrib[0].count++;
    else if (b.score < 80) scoreDistrib[1].count++;
    else if (b.score < 100) scoreDistrib[2].count++;
    else scoreDistrib[3].count++;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">My Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Performance trends and score breakdown</p>
      </div>

      {/* QoQ trend */}
      <div className="card">
        <h2 className="font-heading font-semibold text-white mb-4">Quarter-on-Quarter Performance</h2>
        {qoq.every(q => q.score === 0) ? (
          <EmptyState icon="📈" title="No data yet" message="Enter achievements to see your trend" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={qoq}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c3d" />
              <XAxis dataKey="quarter" stroke="#6b7280" />
              <YAxis domain={[0, 150]} stroke="#6b7280" />
              <Tooltip contentStyle={CHART_STYLE} formatter={v => [`${v?.toFixed(1)}%`, 'Score']} />
              <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">Score Distribution (Q1)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreDistrib}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c3d" />
              <XAxis dataKey="range" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" allowDecimals={false} />
              <Tooltip contentStyle={CHART_STYLE} />
              <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">Goal Performance Radar (Q1)</h2>
          {radarData.length === 0 ? (
            <EmptyState icon="🕸️" title="No Q1 data" message="Enter Q1 achievements to see radar" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2c2c3d" />
                <PolarAngleAxis dataKey="subject" stroke="#6b7280" fontSize={10} />
                <Radar name="Score" dataKey="score" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                <Tooltip contentStyle={CHART_STYLE} formatter={v => [`${v?.toFixed(1)}%`]} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Q1 breakdown table */}
      {scores.Q1?.breakdown?.length > 0 && (
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">Q1 Goal Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-border">
                  <th className="text-left py-2 pr-4">Goal</th>
                  <th className="text-right py-2 pr-4">Target</th>
                  <th className="text-right py-2 pr-4">Actual</th>
                  <th className="text-right py-2 pr-4">Score</th>
                  <th className="text-right py-2">Weight</th>
                </tr>
              </thead>
              <tbody>
                {scores.Q1.breakdown.map(b => (
                  <tr key={b.goalId} className="border-b border-border/50 hover:bg-[#1a1a2e] transition-colors">
                    <td className="py-2 pr-4 text-gray-300">{b.title}</td>
                    <td className="py-2 pr-4 text-right font-mono text-gray-400">{b.target}</td>
                    <td className="py-2 pr-4 text-right font-mono text-gray-300">{b.actual ?? '—'}</td>
                    <td className={`py-2 pr-4 text-right font-mono font-bold ${b.score >= 100 ? 'text-green-400' : b.score >= 80 ? 'text-yellow-400' : b.score !== null ? 'text-red-400' : 'text-gray-500'}`}>
                      {b.score !== null ? `${b.score.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-2 text-right text-accent font-mono">{b.weightage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
            <span className="text-sm text-gray-400">Overall Score</span>
            <span className={`text-xl font-heading font-bold font-mono ${scores.Q1.overallScore >= 100 ? 'text-green-400' : scores.Q1.overallScore >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
              {parseFloat(scores.Q1.overallScore).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
