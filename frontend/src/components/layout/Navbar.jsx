import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  Inbox,
  MessageSquare,
  User,
  LogOut,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import Logo from '../ui/Logo';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api, getSocket } from '../../api/client';

const links = [
  { to: '/app/marketplace', label: 'Marketplace', icon: Compass },
  { to: '/app/requests', label: 'Requests', icon: Inbox },
  { to: '/app/sessions', label: 'Sessions', icon: MessageSquare },
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { notifications: list } = await api('/notifications');
        setNotifications(list);
      } catch {
        /* ignore */
      }
    })();

    const socket = getSocket();
    const onNew = (n) => setNotifications((prev) => [n, ...prev].slice(0, 50));
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [user]);

  const unread = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore */
    }
  }

  async function onLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="sr-nav">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Logo />
          {user ? (
            <nav className="hidden lg:flex items-center gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `sr-btn sr-btn-ghost ${isActive ? 'text-white bg-white/5' : ''}`
                  }
                >
                  <l.icon size={16} />
                  {l.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="sr-btn sr-btn-ghost !p-2"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <>
              <div className="relative">
                <button
                  onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
                  className="sr-btn sr-btn-ghost !p-2 relative"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unread > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  ) : null}
                </button>
                {notifOpen ? (
                  <div className="absolute right-0 mt-2 w-80 sr-card p-2 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="font-semibold text-sm">Notifications</span>
                      {unread > 0 ? (
                        <button onClick={markAllRead} className="text-xs sr-link">Mark all read</button>
                      ) : null}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 15).map((n) => (
                        <div
                          key={n.id}
                          className={`p-2 rounded-lg text-sm ${!n.read ? 'bg-indigo-500/10' : ''}`}
                        >
                          <div className="font-medium">{n.title}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{n.body}</div>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
                  className="flex items-center gap-2 rounded-full p-0.5 hover:bg-white/5 border border-transparent hover:border-white/10 transition"
                >
                  <Avatar name={user.name} src={user.avatarUrl} size={32} />
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 mt-2 w-56 sr-card p-1.5">
                    <div className="px-3 py-2">
                      <div className="font-semibold text-sm">{user.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{user.email}</div>
                    </div>
                    <div className="sr-divider my-1" />
                    <Link to="/app/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5">
                      <User size={14} /> Profile
                    </Link>
                    <Link to="/app/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5">
                      <LayoutDashboard size={14} /> Dashboard
                    </Link>
                    <button onClick={onLogout} className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 text-red-400">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                className="lg:hidden sr-btn sr-btn-ghost !p-2"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Open menu"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {user && menuOpen ? (
        <div className="lg:hidden border-t px-4 py-3 flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `sr-btn sr-btn-ghost !justify-start ${isActive ? 'bg-white/5 text-white' : ''}`
              }
            >
              <l.icon size={16} /> {l.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </header>
  );
}
