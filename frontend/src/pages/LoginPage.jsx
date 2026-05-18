import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_USERS = [
  { label: 'Admin — Neha Kapoor', email: 'neha@goalportal.com', role: 'admin' },
  { label: 'Manager — Ankit Mehta', email: 'ankit@goalportal.com', role: 'manager' },
  { label: 'Employee — Priya Sharma', email: 'priya@goalportal.com', role: 'employee' },
  { label: 'Employee — Rahul Verma', email: 'rahul@goalportal.com', role: 'employee' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(demoEmail) {
    setEmail(demoEmail);
    setPassword('password123');
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-bold text-accent mb-2">GoalPortal</h1>
          <p className="text-gray-400 text-sm">Enterprise Performance Management</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="font-heading text-xl font-semibold text-white mb-6">Sign In</h2>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@company.com" required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" placeholder="••••••••" required
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo quick-login */}
        <div className="mt-4 card">
          <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">Quick Demo Login</p>
          <div className="space-y-2">
            {DEMO_USERS.map(u => (
              <button
                key={u.email}
                onClick={() => quickLogin(u.email)}
                className="w-full text-left px-3 py-2 rounded-lg bg-[#1a1a2e] hover:bg-[#2a2a3e] transition-colors text-sm"
              >
                <span className={`text-xs font-semibold mr-2 ${u.role === 'admin' ? 'text-accent' : u.role === 'manager' ? 'text-purple-400' : 'text-blue-400'}`}>
                  {u.role.toUpperCase()}
                </span>
                <span className="text-gray-300">{u.label.split('—')[1]?.trim()}</span>
                <span className="text-gray-600 text-xs ml-2">{u.email}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">All passwords: <span className="font-mono text-gray-400">password123</span></p>
        </div>
      </div>
    </div>
  );
}
