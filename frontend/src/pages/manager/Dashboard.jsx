import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { StatCard, Spinner, EmptyState } from '../../components/common/UI';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [mRes, gRes, mxRes] = await Promise.all([
        api.get('/api/admin/team-members'),
        api.get('/api/goals'),
        api.get('/api/admin/completion-matrix')
      ]);
      setMembers(mRes.data);
      setGoals(gRes.data);
      setMatrix(mxRes.data);
    } catch {}
    setLoading(false);
  }

  if (loading) return <Spinner />;

  const pending = goals.filter(g => g.status === 'pending').length;
  const approved = goals.filter(g => g.status === 'approved').length;
  const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

  const cellColor = {
    green: 'bg-green-900/50 text-green-300 border-green-800/50',
    amber: 'bg-yellow-900/50 text-yellow-300 border-yellow-800/50',
    red: 'bg-red-900/50 text-red-300 border-red-800/50',
    gray: 'bg-gray-900/50 text-gray-500 border-gray-800/50'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Manager Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Team performance overview</p>
      </div>

      {pending > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-yellow-300">{pending} goal{pending > 1 ? 's' : ''} awaiting your approval</p>
              <p className="text-sm text-yellow-400/70">Review and approve to unblock your team</p>
            </div>
          </div>
          <button onClick={() => navigate('/manager/goals')} className="btn-primary text-sm">Review Now</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Team Members" value={members.length} icon="👥" />
        <StatCard title="Pending Approval" value={pending} accent icon="⏳" />
        <StatCard title="Approved Goals" value={approved} icon="✅" />
        <StatCard title="Total Goals" value={goals.length} icon="🎯" />
      </div>

      {/* Team member cards */}
      <div>
        <h2 className="font-heading font-semibold text-white mb-4">Team Members</h2>
        {members.length === 0 ? (
          <EmptyState icon="👥" title="No team members" message="No employees assigned to you yet" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(m => {
              const empGoals = goals.filter(g => g.employeeId?._id === m._id || g.employeeId === m._id);
              const empPending = empGoals.filter(g => g.status === 'pending').length;
              const empApproved = empGoals.filter(g => g.status === 'approved').length;

              return (
                <div key={m._id} className="card hover:border-accent/40 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold">
                      {m.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{m.name}</div>
                      <div className="text-xs text-gray-500">{m.department}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#1a1a2e] rounded-lg p-2">
                      <div className="text-lg font-heading font-bold text-white">{empGoals.length}</div>
                      <div className="text-xs text-gray-500">Goals</div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg p-2">
                      <div className={`text-lg font-heading font-bold ${empPending > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>{empPending}</div>
                      <div className="text-xs text-gray-500">Pending</div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg p-2">
                      <div className="text-lg font-heading font-bold text-green-400">{empApproved}</div>
                      <div className="text-xs text-gray-500">Approved</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completion heatmap */}
      <div className="card">
        <h2 className="font-heading font-semibold text-white mb-4">Check-in Completion Heatmap</h2>
        {matrix.length === 0 ? (
          <EmptyState icon="🗓️" title="No data" message="Complete check-ins to see heatmap" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-6 text-gray-500 text-xs font-medium">Employee</th>
                  {QUARTERS.map(q => <th key={q} className="text-center py-2 px-4 text-gray-500 text-xs font-medium">{q}</th>)}
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
                      <td key={q} className="py-2 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${cellColor[row.quarters[q]] || cellColor.gray}`}>
                          {row.quarters[q] === 'green' ? '✓' : row.quarters[q] === 'amber' ? '◑' : row.quarters[q] === 'red' ? '✗' : '—'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-800 rounded inline-block"></span> Check-in done</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-800 rounded inline-block"></span> Goals set, no check-in</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-800 rounded inline-block"></span> Nothing done</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate('/manager/goals')} className="btn-primary">Review Goals</button>
        <button onClick={() => navigate('/manager/checkins')} className="btn-secondary">Do Check-ins</button>
      </div>
    </div>
  );
}
