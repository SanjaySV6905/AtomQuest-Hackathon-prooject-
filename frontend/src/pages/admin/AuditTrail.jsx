import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Spinner, EmptyState, Modal } from '../../components/common/UI';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailLog, setDetailLog] = useState(null);

  useEffect(() => { load(); }, []);

  async function load(q = '') {
    setLoading(true);
    try {
      const res = await api.get(`/api/audit${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      setLogs(res.data);
    } catch {}
    setLoading(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    load(search);
  }

  function exportCSV() {
    const headers = ['Goal', 'Changed By', 'Type', 'Timestamp'];
    const rows = logs.map(l => [l.goalTitle, l.changedBy?.name, l.changeType, new Date(l.timestamp).toLocaleString()]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit-log.csv'; a.click();
  }

  const changeTypeColor = {
    approved: 'text-green-400 bg-green-900/20',
    returned: 'text-red-400 bg-red-900/20',
    post_lock_edit: 'text-yellow-400 bg-yellow-900/20',
    admin_unlock: 'text-purple-400 bg-purple-900/20',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Audit Trail</h1>
          <p className="text-gray-400 text-sm mt-1">{logs.length} audit events</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-sm">⬇ Export CSV</button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          className="input flex-1" placeholder="Search by goal title…"
        />
        <button type="submit" className="btn-primary">Search</button>
        {search && <button type="button" onClick={() => { setSearch(''); load(); }} className="btn-secondary">Clear</button>}
      </form>

      {loading ? <Spinner /> : logs.length === 0 ? (
        <EmptyState icon="📋" title="No audit events" message="Goal changes will appear here" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-border">
                <th className="text-left py-3 pr-4">Goal</th>
                <th className="text-left py-3 pr-4">Changed By</th>
                <th className="text-left py-3 pr-4">Type</th>
                <th className="text-left py-3 pr-4">Timestamp</th>
                <th className="text-right py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id} className="border-b border-border/30 hover:bg-[#1a1a2e] transition-colors">
                  <td className="py-3 pr-4 text-gray-200 max-w-xs truncate">{log.goalTitle || '—'}</td>
                  <td className="py-3 pr-4 text-gray-400">{log.changedBy?.name || '—'}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${changeTypeColor[log.changeType] || 'text-gray-400 bg-gray-800'}`}>
                      {log.changeType}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-500 text-xs font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => setDetailLog(log)} className="text-xs text-accent hover:underline">View diff</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!detailLog} onClose={() => setDetailLog(null)} title="Change Details" size="lg">
        {detailLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div>Goal: <span className="text-white">{detailLog.goalTitle}</span></div>
              <div>By: <span className="text-white">{detailLog.changedBy?.name}</span></div>
              <div>Type: <span className="text-accent">{detailLog.changeType}</span></div>
              <div>Time: <span className="text-white font-mono">{new Date(detailLog.timestamp).toLocaleString()}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-red-400 font-semibold mb-2">Before</p>
                <pre className="bg-red-900/10 border border-red-800/30 rounded-lg p-3 text-xs text-red-200 overflow-x-auto">
                  {JSON.stringify(detailLog.oldValue, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs text-green-400 font-semibold mb-2">After</p>
                <pre className="bg-green-900/10 border border-green-800/30 rounded-lg p-3 text-xs text-green-200 overflow-x-auto">
                  {JSON.stringify(detailLog.newValue, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
