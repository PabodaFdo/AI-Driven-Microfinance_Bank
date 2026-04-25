import { useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import StaffManagement from './components/StaffManagement';
import Login from './components/Login';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import ChangePasswordPage from './components/ChangePasswordPage';
import ProfilePage from './components/ProfilePage';
import ApplicantsPage from './components/ApplicantsPage';
import ApplicationsPage from './components/ApplicationsPage';
import ApplicationDetailsPage from './components/ApplicationDetailsPage';
import RiskAssessmentPage from './components/RiskAssessmentPage';
import RecommendationEnginePage from './components/RecommendationEnginePage';
import RepaymentPage from './components/RepaymentPage';
import PaymentHistoryPage from './components/PaymentHistoryPage';
import DashboardPage from './components/DashboardPage';
import ReportsPage from './components/ReportsPage';
import ThemeToggle from './components/ThemeToggle';
import ProtectedRoute from './components/ProtectedRoute';
import UnauthorizedPage from './components/UnauthorizedPage';
import { useAuth } from './context/AuthContext';
import {
  ROLES,
  canManageStaff,
  formatRoleLabel,
  normalizeRole,
} from './utils/permissions';
import './styles/print.css';

// Theme-aware color system using CSS variables
const C = {
  // Primary Colors (Royal Blue Family)
  royalBlue: 'var(--primary)',
  royalDark: 'var(--primary-hover)',
  royalDeep: 'var(--primary-active)',
  royalLight: 'var(--primary-light)',
  royalSoft: 'var(--primary-soft)',

  // Accent & Base Colors
  accent: 'var(--accent)',
  ink: 'var(--text)',
  inkMid: 'var(--text-muted)',
  inkLight: 'var(--text-light)',
  border: 'var(--border)',
  surface: 'var(--surface)',
  surfaceDeep: 'var(--bg)',

  // Sidebar Colors (Royal Blue Identity)
  sidebarBg: 'var(--sidebar-bg)',
  userCardBg: 'var(--sidebar-card)',
  activeItemBg: 'var(--sidebar-active)',
  hoverItemBg: 'var(--sidebar-hover)',
  brandTitle: 'var(--sidebar-text)',
  brandSub: 'var(--sidebar-text-muted)',
  divider: 'var(--sidebar-divider)',

  // Avatar & User Colors
  avatarBg: 'var(--accent)',
  avatarText: 'var(--text-inverse)',
  userNameText: 'var(--sidebar-text)',
  userRoleText: 'var(--sidebar-text-muted)',

  // Navigation Colors
  navInactive: 'var(--sidebar-text-muted)',
  navActive: 'var(--sidebar-text)',
  activeIndicator: 'var(--primary)',

  // Badge Colors
  badgeBlue: 'var(--primary)',
  badgeAmber: 'var(--warning)',

  // Logout Colors
  logoutHoverBg: 'var(--danger-soft)',
  logoutHoverText: 'var(--danger)',
};

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'Dashboard',
    allowedRoles: [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER],
  },
  {
    label: 'Applicants',
    path: '/applicants',
    icon: 'Applicants',
    allowedRoles: [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER],
  },
  {
    label: 'Applications',
    path: '/applications',
    icon: 'Applications',
    allowedRoles: [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER],
  },
  {
    label: 'Risk Assessment',
    path: '/risk-assessment',
    icon: 'RiskAssessment',
    // CHANGED: LOAN_OFFICER must see/use risk pages
    allowedRoles: [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER],
  },
  {
    label: 'Recommendation Engine',
    path: '/recommendation-engine',
    icon: 'RecommendationEngine',
    // CHANGED: LOAN_OFFICER must see/use recommendation pages
    allowedRoles: [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER],
  },
  {
    label: 'Repayment',
    path: '/repayment',
    icon: 'Repayment',
    allowedRoles: [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: 'Reports',
    allowedRoles: [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER],
  },
];

const Icon = ({ children, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {children}
  </svg>
);

const Icons = {
  Dashboard: () => (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  ),
  Applicants: () => (
    <Icon>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-1a7 7 0 0114 0v1" />
    </Icon>
  ),
  Applications: () => (
    <Icon>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </Icon>
  ),
  Repayment: () => (
    <Icon>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="9" y2="15" />
      <line x1="12" y1="15" x2="16" y2="15" />
    </Icon>
  ),
  Reports: () => (
    <Icon>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </Icon>
  ),
  RiskAssessment: () => (
    <Icon>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <circle cx="12" cy="17" r="0.5" />
    </Icon>
  ),
  RecommendationEngine: () => (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6" />
      <path d="m4.93 4.93 4.24 4.24m5.66 5.66 4.24 4.24" />
      <path d="M1 12h6m6 0h6" />
      <path d="m4.93 19.07 4.24-4.24m5.66-5.66 4.24-4.24" />
    </Icon>
  ),
  StaffManagement: () => (
    <Icon>
      <circle cx="8" cy="7" r="4" />
      <path d="M2 21v-1a6 6 0 0112 0v1" />
      <path d="M17 11l2 2 4-4" />
    </Icon>
  ),
  Logout: () => (
    <Icon>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Icon>
  ),
};

function NavItem({ item, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const IconComponent = Icons[item.icon];
  const bg = isActive ? C.activeItemBg : hovered ? C.hoverItemBg : 'transparent';
  const color = isActive || hovered ? C.navActive : C.navInactive;

  return (
    <div
      onClick={() => onClick(item.path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '9px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        background: bg,
        marginBottom: '2px',
        transition: 'background 0.15s',
        userSelect: 'none',
        borderLeft: isActive ? `3px solid ${C.activeIndicator}` : '3px solid transparent',
      }}
    >
      <span style={{ color, transition: 'color 0.15s', display: 'flex' }}>
        <IconComponent />
      </span>
      <span
        style={{
          fontSize: '13.5px',
          color,
          fontWeight: isActive ? 600 : 400,
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.label}
      </span>
      {item.badge != null && (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            background: item.badgeType === 'warn' ? C.badgeAmber : C.badgeBlue,
            color: '#fff',
            padding: '2px 7px',
            borderRadius: '20px',
            flexShrink: 0,
          }}
        >
          {item.badge}
        </span>
      )}
    </div>
  );
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Sidebar({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutHovered, setLogoutHovered] = useState(false);

  const items = useMemo(() => {
    const role = normalizeRole(user?.role);
    const baseItems = NAV_ITEMS.filter((item) => item.allowedRoles.includes(role));

    if (canManageStaff(role)) {
      return [
        ...baseItems,
        {
          label: 'Staff Management',
          path: '/staff',
          icon: 'StaffManagement',
          allowedRoles: [ROLES.ADMIN],
        },
      ];
    }

    return baseItems;
  }, [user?.role]);

  const currentUser = {
    name: user?.fullName || 'Ravi Jayawardena',
    role: `${formatRoleLabel(user?.role)} - ${user?.branch || 'Colombo'}`,
    initials: initials(user?.fullName || 'Ravi Jayawardena'),
  };

  return (
    <div
      className="portal-sidebar"
      style={{
        width: '232px',
        minWidth: '232px',
        height: '100vh',
        background: C.sidebarBg,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <div className="portal-sidebar-bg-layer" aria-hidden="true">
        <span className="portal-sidebar-orb portal-sidebar-orb-a" />
        <span className="portal-sidebar-orb portal-sidebar-orb-b" />
        <span className="portal-sidebar-orb portal-sidebar-orb-c" />
        <span className="portal-sidebar-grid" />
        <span className="portal-sidebar-particles" />
      </div>

      <div style={{ padding: '24px 20px 14px' }}>
        <div style={{ fontSize: '17px', fontWeight: 700, color: C.brandTitle, letterSpacing: '-0.01em' }}>MicroFinance</div>
        <div style={{ fontSize: '11px', color: C.brandSub, marginTop: '3px' }}>Staff Web Portal</div>
      </div>

      <div
        onClick={() => navigate('/profile')}
        style={{
          margin: '0 10px 16px',
          background: C.userCardBg,
          borderRadius: '10px',
          padding: '10px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: C.avatarBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            color: C.avatarText,
            flexShrink: 0,
          }}
        >
          {currentUser.initials}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.userNameText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser.name}
          </div>
          <div style={{ fontSize: '11px', color: C.userRoleText, marginTop: '1px' }}>
            {currentUser.role}
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '0 10px' }}>
        {items.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            isActive={location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)}
            onClick={(path) => navigate(path)}
          />
        ))}
      </nav>

      <div style={{ height: '1px', background: C.divider, margin: '8px 10px' }} />

      {/* Theme Toggle */}
      <div style={{ padding: '0 10px 12px' }}>
        <ThemeToggle className="sidebar" />
      </div>

      <div style={{ padding: '0 10px 22px' }}>
        <div
          onClick={onLogout}
          onMouseEnter={() => setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '9px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            background: logoutHovered ? C.logoutHoverBg : 'transparent',
            transition: 'background 0.15s',
            userSelect: 'none',
            borderLeft: '3px solid transparent',
          }}
        >
          <span style={{ color: logoutHovered ? C.logoutHoverText : C.navInactive, transition: 'color 0.15s', display: 'flex' }}>
            <Icons.Logout />
          </span>
          <span style={{ fontSize: '13.5px', color: logoutHovered ? C.logoutHoverText : C.navInactive, fontWeight: 400 }}>
            Logout
          </span>
        </div>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, description }) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>{title}</div>
        <div style={{ marginTop: 6, fontSize: 13, color: C.inkMid }}>{description}</div>
      </div>
    </div>
  );
}

function ProtectedApp({ user, onLogout }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: C.surfaceDeep }}>
      <Sidebar user={user} onLogout={onLogout} />
      <main style={{ flex: 1, padding: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/applicants"
            element={
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]}>
                <ApplicantsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]}>
                <ApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications/:applicationId"
            element={
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]}>
                <ApplicationDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk-assessment"
            element={
              // CHANGED: LOAN_OFFICER allowed
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]}>
                <RiskAssessmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk-assessment/:applicationId"
            element={
              // CHANGED: LOAN_OFFICER allowed
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]}>
                <RiskAssessmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendation-engine"
            element={
              // CHANGED: LOAN_OFFICER allowed
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]}>
                <RecommendationEnginePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendation-engine/:applicationId"
            element={
              // CHANGED: LOAN_OFFICER allowed
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]}>
                <RecommendationEnginePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repayment"
            element={
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]}>
                <RepaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repayment/:applicationId"
            element={
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]}>
                <RepaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repayment/:applicationId/history"
            element={
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]}>
                <PaymentHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN]}>
                <div style={{ padding: 18 }}><StaffManagement currentUser={user} /></div>
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<div style={{ padding: 18 }}><ProfilePage currentUser={user} /></div>} />
          <Route path="/change-password" element={<div style={{ padding: 18 }}><ChangePasswordPage /></div>} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { token, user, loginSuccess, logout } = useAuth();

  // CHANGED: centralized login success handler via auth store/context
  const handleLoginSuccess = ({ token: nextToken, user: nextUser }) => {
    loginSuccess({ token: nextToken, user: nextUser });
  };

  const handleLogout = () => logout();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        body { font-family: 'DM Sans', 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 0; }
      `}</style>
      <BrowserRouter>
        {token && user ? (
          <ProtectedApp user={user} onLogout={handleLogout} />
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          </Routes>
        )}
      </BrowserRouter>
    </>
  );
}
