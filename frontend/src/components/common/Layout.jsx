import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const navConfig = {
  employee: [
    { to: '/employee/dashboard', icon: '⊞', label: 'Dashboard' },
    { to: '/employee/goals/new', icon: '✦', label: 'Set Goals' },
    { to: '/employee/goals', icon: '◈', label: 'My Goals' },
    { to: '/employee/achievements', icon: '◎', label: 'Achievements' },
    { to: '/employee/analytics', icon: '◑', label: 'Analytics' },
  ],
  manager: [
    { to: '/manager/dashboard', icon: '⊞', label: 'Dashboard' },
    { to: '/manager/goals', icon: '◈', label: 'Team Goals' },
    { to: '/manager/checkins', icon: '◎', label: 'Check-ins' },
    { to: '/manager/analytics', icon: '◑', label: 'Analytics' },
  ],
  admin: [
    { to: '/admin/dashboard', icon: '⊞', label: 'Dashboard' },
    { to: '/admin/goals', icon: '◈', label: 'Goals' },
    { to: '/admin/escalations', icon: '⚠', label: 'Escalations' },
    { to: '/admin/audit', icon: '⊙', label: 'Audit Trail' },
    { to: '/admin/reports', icon: '⊟', label: 'Reports' },
    { to: '/admin/analytics', icon: '◑', label: 'Analytics' },
    { to: '/admin/cycle', icon: '⟳', label: 'Cycle Mgmt' },
  ]
};

export default function Layout() {
  const { user, logout, allUsers, switchToUser } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => { fetchNotifs(); }, []);

  async function fetchNotifs() {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data.notifications);
      setUnread(res.data.unread);
    } catch {}
  }

  async function markRead(id) {
    await api.patch(`/api/notifications/${id}/read`);
    fetchNotifs();
  }

  async function clearAll() {
    await api.delete('/api/notifications/clear');
    setNotifications([]); setUnread(0);
  }

  async function markAllRead() {
    await api.patch('/api/notifications/read-all');
    fetchNotifs();
  }

  const navItems = navConfig[user?.role] || [];
  const roleColors = { employee: 'text-blue-400', manager: 'text-purple-400', admin: 'text-accent' };

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-card border-r border-border flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sidebarOpen && <span className="font-heading font-bold text-xl text-accent">GoalPortal</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white p-1 rounded">
            {sidebarOpen ? '◁' : '▷'}
          </button>
        </div>

        {/* User info */}
        {sidebarOpen && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                <div className={`text-xs capitalize ${roleColors[user?.role]}`}>{user?.role}</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 text-sm font-medium ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a2e]'
                }`
              }
            >
              <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Role Switcher */}
        {sidebarOpen && (
          <div className="p-3 border-t border-border">
            <div className="relative">
              <button
                onClick={() => setSwitcherOpen(!switcherOpen)}
                className="w-full text-xs text-gray-400 hover:text-accent py-1.5 px-2 rounded border border-border hover:border-accent transition-colors text-left"
              >
                🎭 Switch Role (Demo)
              </button>
              {switcherOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg overflow-hidden shadow-xl z-50">
                  {allUsers.map(u => (
                    <button
                      key={u._id}
                      onClick={() => { switchToUser(u._id); setSwitcherOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-[#1a1a2e] text-gray-300 hover:text-white transition-colors"
                    >
                      <span className={roleColors[u.role]}>●</span> {u.name} <span className="text-gray-500">({u.role})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full text-xs text-gray-500 hover:text-red-400 py-1.5 mt-1 transition-colors"
            >
              ⎋ Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <div className="text-gray-400 text-sm">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifs(); }}
              className="relative p-2 text-gray-400 hover:text-white transition-colors"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-mono">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          <Outlet />
        </main>
      </div>

      {/* Notification Drawer */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setNotifOpen(false)}>
          <div
            className="w-96 bg-card border-l border-border h-full flex flex-col shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-semibold text-white">Notifications</h3>
              <div className="flex gap-2">
                <button onClick={markAllRead} className="text-xs text-accent hover:underline">Mark all read</button>
                <button onClick={clearAll} className="text-xs text-red-400 hover:underline">Clear all</button>
                <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-white ml-2">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <span className="text-3xl mb-2">🔔</span>
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n._id}
                    onClick={() => markRead(n._id)}
                    className={`p-4 border-b border-border cursor-pointer hover:bg-[#1a1a2e] transition-colors ${!n.read ? 'bg-[#1a1a2e]' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {!n.read && <div className="w-2 h-2 bg-accent rounded-full mt-1.5 flex-shrink-0"></div>}
                      <div className={!n.read ? '' : 'ml-5'}>
                        <div className="text-sm font-medium text-white">{n.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{n.message}</div>
                        <div className="text-xs text-gray-600 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
