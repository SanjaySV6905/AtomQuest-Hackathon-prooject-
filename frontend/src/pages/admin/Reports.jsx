import React, { useState } from 'react';
import api from '../../utils/api';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function Reports() {
  const [quarter, setQuarter] = useState('Q1');
  const [cycleYear, setCycleYear] = useState(new Date().getFullYear().toString());
  const [downloading, setDownloading] = useState('');

  async function download(type) {
    setDownloading(type);
    try {
      const params = new URLSearchParams({ quarter, cycleYear });
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/${type}?${params}`;

      // Fetch with credentials
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = type.replace('/', '-') + (type.endsWith('xlsx') ? '.xlsx' : '.csv');
      link.click();
    } catch (err) {
      alert('Download failed: ' + err.message);
    } finally {
      setDownloading('');
    }
  }

  const reports = [
    {
      id: 'achievement-csv',
      title: 'Achievement Report',
      desc: 'All employee goals with actual vs target scores',
      icon: '📊',
      format: 'CSV'
    },
    {
      id: 'achievement-xlsx',
      title: 'Achievement Report',
      desc: 'Formatted Excel with colored headers and auto-width columns',
      icon: '📗',
      format: 'XLSX'
    },
    {
      id: 'completion-csv',
      title: 'Completion Report',
      desc: 'Employee × Quarter check-in completion matrix',
      icon: '✅',
      format: 'CSV'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Reports</h1>
        <p className="text-gray-400 text-sm mt-1">Export performance data for review cycles</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Quarter</label>
            <div className="flex gap-2">
              {QUARTERS.map(q => (
                <button key={q} onClick={() => setQuarter(q)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${quarter === q ? 'bg-accent text-white' : 'bg-[#1a1a2e] border border-border text-gray-400 hover:text-white'}`}>
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Cycle Year</label>
            <select value={cycleYear} onChange={e => setCycleYear(e.target.value)} className="input">
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.id} className="card hover:border-accent/40 transition-colors">
            <div className="text-3xl mb-3">{r.icon}</div>
            <h3 className="font-heading font-semibold text-white mb-1">{r.title}</h3>
            <span className={`text-xs font-mono px-2 py-0.5 rounded mb-2 inline-block ${r.format === 'XLSX' ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'}`}>
              {r.format}
            </span>
            <p className="text-xs text-gray-500 mb-4">{r.desc}</p>
            <button
              onClick={() => download(r.id)}
              disabled={downloading === r.id}
              className="btn-primary w-full justify-center text-sm"
            >
              {downloading === r.id ? '⏳ Downloading…' : `⬇ Download ${r.format}`}
            </button>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="card bg-[#1a1a2e] border-border/50">
        <h3 className="font-heading font-semibold text-white mb-2 text-sm">Report Notes</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Achievement report filters by selected quarter and cycle year</li>
          <li>• XLSX report includes colored headers (orange), frozen top row, auto-width columns</li>
          <li>• Completion report shows all employees × quarters regardless of filter</li>
          <li>• Scores calculated using official UoM formulas (capped at 150%)</li>
        </ul>
      </div>
    </div>
  );
}
