import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import api from '../../utils/api';
import { Spinner, EmptyState } from '../../components/common/UI';

const CS = { background: '#111118', border: '1px solid #2c2c3d', borderRadius: '8px', color: '#e2e2f0' };

export default function AdminAnalytics() {
  const [qoq, setQoq] = useState([]);
  const [thrust, setThrust] = useState([]);
  const [uom, setUom] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [qRes, tRes, uRes] = await Promise.all([
        api.get('/api/reports/analytics/qoq'),
        api.get('/api/reports/analytics/thrust'),
        api.get('/api/reports/analytics/uom')
      ]);
      setQoq(qRes.data);
      setThrust(tRes.data.map(d => ({ name: d._id, count: d.count, avgWeight: Math.round(d.avgWeight) })));
      setUom(uRes.data.map(d => ({ subject: d._id, value: d.count })));
    } catch {}
    setLoading(false);
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Admin Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Organization-wide performance insights</p>
      </div>

      {/* Org QoQ */}
      <div className="card">
        <h2 className="font-heading font-semibold text-white mb-4">Org-Wide QoQ Performance</h2>
        {qoq.every(q => q.avgScore === 0) ? (
          <EmptyState icon="📈" title="No performance data yet" message="Scores appear after employees enter achievements" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={qoq}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c3d" />
              <XAxis dataKey="quarter" stroke="#6b7280" />
              <YAxis domain={[0, 150]} stroke="#6b7280" />
              <Tooltip contentStyle={CS} formatter={v => [`${v?.toFixed(1)}%`, 'Avg Score']} />
              <Line type="monotone" dataKey="avgScore" stroke="#f97316" strokeWidth={2.5} dot={{ fill: '#f97316', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thrust area bar */}
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">Goals by Thrust Area</h2>
          {thrust.length === 0 ? (
            <EmptyState icon="🎯" title="No data" message="Goals will appear here" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={thrust} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c3d" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis type="category" dataKey="name" stroke="#6b7280" width={130} fontSize={11} />
                <Tooltip contentStyle={CS} />
                <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* UoM radar */}
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">UoM Distribution</h2>
          {uom.length === 0 ? (
            <EmptyState icon="📊" title="No data" message="UoM distribution will appear here" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={uom}>
                <PolarGrid stroke="#2c2c3d" />
                <PolarAngleAxis dataKey="subject" stroke="#6b7280" fontSize={10} />
                <Radar name="Count" dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                <Tooltip contentStyle={CS} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
