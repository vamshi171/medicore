import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from './ui.jsx';
import { Cross, Logout, Bell, User as UserIcon } from './Icons.jsx';

const NAV = {
  PATIENT: [
    { to: '/patient', label: 'Dashboard' },
    { to: '/patient/doctors', label: 'Find Doctors' },
    { to: '/patient/appointments', label: 'My Appointments' },
    { to: '/patient/blood-bank', label: 'Blood Bank' },
    { to: '/patient/organ-donation', label: 'Organ Donation' },
    { to: '/patient/profile', label: 'Profile' },
    { to: '/patient/notifications', label: 'Notifications' },
  ],
  DOCTOR: [
    { to: '/doctor', label: 'Dashboard' },
    { to: '/doctor/appointments', label: 'Appointments' },
    { to: '/doctor/blood-bank', label: 'Blood Bank' },
    { to: '/doctor/organ-donation', label: 'Organ Donation' },
    { to: '/doctor/profile', label: 'Profile' },
    { to: '/doctor/notifications', label: 'Notifications' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/blood-bank', label: 'Blood Bank' },
    { to: '/admin/organ-donation', label: 'Organ Donation' },
    { to: '/admin/notifications', label: 'Notifications' },
  ],
  BLOOD_BANK_OFFICER: [
    { to: '/bloodbank', label: 'Dashboard' },
    { to: '/bloodbank/inventory', label: 'Inventory' },
    { to: '/bloodbank/requests', label: 'Requests' },
    { to: '/bloodbank/donors', label: 'Donor Registry' },
    { to: '/bloodbank/notifications', label: 'Notifications' },
  ],
  TRANSPLANT_COORDINATOR: [
    { to: '/transplant', label: 'Dashboard' },
    { to: '/transplant/pledges', label: 'Donor Pledges' },
    { to: '/transplant/waitlist', label: 'Waitlist' },
    { to: '/transplant/matches', label: 'Allocations' },
    { to: '/transplant/notifications', label: 'Notifications' },
  ],
};

/**
 * Where each role's "home" is.
 * The brand link and post-login redirect both go through this — previously the
 * brand linked to "/", which is a PATIENT-only route, so every admin, doctor
 * and operator clicking the logo landed on the "Unauthorized" page.
 */
export const HOME = {
  PATIENT: '/patient',
  DOCTOR: '/doctor',
  ADMIN: '/admin',
  BLOOD_BANK_OFFICER: '/bloodbank',
  TRANSPLANT_COORDINATOR: '/transplant',
};

/** Each role's notification feed path (all roles have a feed). */
export const NOTIF_PATH = {
  PATIENT: '/patient/notifications',
  DOCTOR: '/doctor/notifications',
  ADMIN: '/admin/notifications',
  BLOOD_BANK_OFFICER: '/bloodbank/notifications',
  TRANSPLANT_COORDINATOR: '/transplant/notifications',
};

/**
 * Only roles that actually own a profile record get a "My profile" entry.
 * ADMIN had none, so the menu item used to send admins to /admin/profile,
 * which does not exist (404 -> Unauthorized page).
 */
export const HAS_PROFILE = { PATIENT: true, DOCTOR: true };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const role = user?.role;
  const links = role ? NAV[role] || [] : [];

  // Close the avatar dropdown when clicking anywhere outside it.
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <Link to={role ? HOME[role] || '/' : '/'} className="brand">
          <span className="brand-mark"><Cross size={16} /></span> MediCore
        </Link>
        <nav className="nav-links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === HOME[role]} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-user" ref={menuRef}>
          {user ? (
            <>
              <span className="badge role-badge">{user.role.replace(/_/g, ' ')}</span>
              <button
                type="button"
                className="btn btn-icon btn-outline"
                style={{ position: 'relative' }}
                onClick={() => navigate(NOTIF_PATH[role] || '/login')}
                aria-label="Notifications"
              >
                <Bell size={16} />
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px' }}
                  onClick={() => setMenuOpen((o) => !o)}
                >
                  <Avatar name={user.email} size="sm" />
                  <span className="user-email">{user.email}</span>
                </button>
                {menuOpen ? (
                  <div
                    className="card"
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      minWidth: 220, padding: 8, zIndex: 50, marginBottom: 0,
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
                      <Avatar name={user.email} size="md" ring />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.email}</div>
                        <span className="badge role-badge" style={{ marginTop: 4 }}>{user.role.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
                    {HAS_PROFILE[role] ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm btn-block"
                        style={{ justifyContent: 'flex-start', border: 'none' }}
                        onClick={() => { setMenuOpen(false); navigate(`/${role.toLowerCase()}/profile`); }}
                      >
                        <UserIcon size={15} /> My profile
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm btn-block"
                      style={{ justifyContent: 'flex-start', border: 'none' }}
                      onClick={() => { setMenuOpen(false); navigate(NOTIF_PATH[role] || '/login'); }}
                    >
                      <Bell size={15} /> Notifications
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm btn-block"
                      style={{ justifyContent: 'flex-start', border: 'none', color: 'var(--red)' }}
                      onClick={handleLogout}
                    >
                      <Logout size={15} /> Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </header>
      <main className="page page-enter">{children}</main>
      <footer className="footer">
        <strong>MediCore</strong> — 9 Spring Boot microservices (Gateway · JWT · Eureka · Feign · Resilience4j)
        covering appointments, blood banking and organ donation, + React 18
      </footer>
    </div>
  );
}
