import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { StatCard, Spinner, EmptyState } from '../../components/common/UI';

const CELL_COLORS = { green: '#22c55e', amber: '#eab308', red: '#ef4444', gray: '#374151' };
const STATUS_COLORS = { approved: '#22c55e', pending: '#eab308', draft: '#6b7280', returned: '#ef4444' };
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [sRes, mRes] = await Promise.all([
        api.get('/api/admin/dashboard'),
        api.get('/api/admin/completion-matrix')
      ]);
      setStats(sRes.data);
      setMatrix(mRes.data);
    } catch {}
    setLoading(false);
  }

  if (loading) return <Spinner />;

  const pieData = (stats?.goalsByStatus || []).map(s => ({
    name: s._id, value: s.count, color: STATUS_COLORS[s._id] || '#6b7280'
  }));

  const cellColor = {
    green: 'bg-green-900/60 text-green-300',
    amber: 'bg-yellow-900/60 text-yellow-300',
    red: 'bg-red-900/60 text-red-300',
    gray: 'bg-gray-800/60 text-gray-500'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Organization-wide performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats?.totalUsers || 0} icon="👤" />
        <StatCard title="Total Goals" value={stats?.totalGoals || 0} icon="🎯" />
        <StatCard title="Pending Approval" value={stats?.pendingGoals || 0} accent icon="⏳" />
        <StatCard title="Active Escalations" value={stats?.activeEscalations || 0} icon="⚠" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">Goals by Status</h2>
          {pieData.length === 0 ? (
            <EmptyState icon="🎯" title="No goals yet" message="Goals will appear here once created" />
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={pieData} cx={85} cy={85} innerRadius={50} outerRadius={80} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid #2c2c3d', borderRadius: '8px', color: '#e2e2f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }}></div>
                    <span className="text-sm text-gray-300 capitalize">{d.name}</span>
                    <span className="text-sm font-mono font-bold text-white ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent audit */}
        <div className="card">
          <h2 className="font-heading font-semibold text-white mb-4">Recent Audit Events</h2>
          {(stats?.recentAudit || []).length === 0 ? (
            <EmptyState icon="📋" title="No audit events" message="Changes to goals appear here" />
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats.recentAudit.slice(0, 6).map(log => (
                <div key={log._id} className="flex items-center gap-3 py-2 border-b border-border/30">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-accent font-semibold">{log.changeType}</span>
                    <span className="text-xs text-gray-400 ml-2 truncate">{log.goalTitle}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-500">{log.changedBy?.name}</div>
                    <div className="text-xs text-gray-600">{new Date(log.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completion heatmap */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-white">Org Completion Heatmap</h2>
          <button onClick={() => navigate('/admin/reports')} className="text-xs text-accent hover:underline">Export →</button>
        </div>
        {matrix.length === 0 ? (
          <EmptyState icon="📊" title="No employees" message="Employee completion status will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-6 text-gray-500 text-xs font-medium">Employee</th>
                  {QUARTERS.map(q => <th key={q} className="text-center py-2 px-3 text-gray-500 text-xs font-medium">{q}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.map(row => (
                  <tr key={row.employee._id} className="border-t border-border/30">
                    <td className="py-2 pr-6">
                      <div className="font-medium text-white text-sm">{row.employee.name}</div>
                      <div className="text-xs text-gray-500">{row.employee.department}</div>
                    </td>
                    {QUARTERS.map(q => (
                      <td key={q} className="py-2 px-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${cellColor[row.quarters[q]] || cellColor.gray}`}>
                          {row.quarters[q] === 'green' ? '✓' : row.quarters[q] === 'amber' ? '◑' : row.quarters[q] === 'red' ? '✗' : '—'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-900 rounded"></span> Check-in done</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-900 rounded"></span> Goals set</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-900 rounded"></span> Nothing</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <button onClick={() => navigate('/admin/goals')} className="btn-primary">Manage Goals</button>
        <button onClick={() => navigate('/admin/escalations')} className="btn-secondary">View Escalations</button>
        <button onClick={() => navigate('/admin/reports')} className="btn-secondary">Export Reports</button>
        <button onClick={() => navigate('/admin/audit')} className="btn-secondary">Audit Trail</button>
      </div>
    </div>
  );
}
