import { useEffect, useMemo, useState, useRef } from 'react';
import {
  changePassword,
  createStaff,
  deactivateStaff,
  deleteStaffPermanently,
  getAllStaff,
  updateStaff,
} from '../services/staffService';
import { canManageStaff, normalizeRole } from '../utils/permissions';
import { PageHeader } from './PageHeader';
import {
  validateFullName,
  validateUsername,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateBranch,
  validateRole,
  validatePhone,
  sanitizePhoneInput,
  blockInvalidPhoneKeys,
  validateAddress,
  validateDeactivationReason,
  validateCurrentPassword,
  validateNewPasswordDifferent,
  getPasswordStrength,
  VALID_BRANCHES_LIST,
} from '../utils/validationHelpers';

const C = {
  primary: "var(--primary)",
  primaryDk: "var(--primary-hover)",
  primaryLt: "var(--primary-light)",
  primarySoft: "var(--primary-soft)",
  primaryMid: "var(--primary-subtle)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  danger: "var(--danger)",
  dangerSoft: "var(--danger-soft)",
  warn: "var(--warning)",
  warnSoft: "var(--warning-soft)",
  success: "var(--success)",
  successSoft: "var(--success-soft)",
  purple: "#7C3AED",
  purpleSoft: "#EDE9FE",
  ink: "var(--text)",
  inkMid: "var(--text-muted)",
  inkLight: "var(--text-light)",
  border: "var(--border)",
  borderMid: "var(--border-strong)",
  surface: "var(--surface)",
  surfaceAlt: "var(--surface-2)",
  surfaceDeep: "var(--surface-3)",
};

const EMPTY_FORM = {
  fullName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  role: 'officer',
  branch: '',
  phone: '',
  address: '',
  errors: {},
};

const BRANCH_OPTIONS = [
  "Colombo",
  "Kandy",
  "Galle",
  "Matara",
  "Jaffna",
  "Kurunegala",
  "Anuradhapura"
];

const EMPTY_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  errors: {},
};

function isOnline(lastLogin) {
  if (!lastLogin) return false;
  return Date.now() - new Date(lastLogin).getTime() < 5 * 60 * 1000;
}

function getStatus(staff) {
  if (!staff.active) return 'Suspended';
  return isOnline(staff.lastLogin) ? 'Online' : 'Offline';
}

function fmtTime(dateValue) {
  if (!dateValue) return 'Never';
  const diff = Date.now() - new Date(dateValue).getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(dateValue).toLocaleString();
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

function canDelete(currentRole, targetRole) {
  const tr = normalizeRole(targetRole);
  // CHANGED: staff management is ADMIN-only
  return canManageStaff(currentRole) && tr !== 'ADMIN';
}

function canEdit(currentRole) {
  // CHANGED: staff management is ADMIN-only
  return canManageStaff(currentRole);
}

// Count-up hook for smooth number animations
function useCountUp(target, duration = 950, delay = 0) {
  const [count, setCount] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }

    const timeout = setTimeout(() => {
      let start = null;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const easing = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
        setCount(Math.floor(easing * target));
        if (progress < 1) {
          raf.current = requestAnimationFrame(step);
        } else {
          setCount(target);
        }
      };
      raf.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration, delay]);

  return count;
}

// Enhanced StatCard component with gradient design matching ApplicantsPage
function StatCard({ title, value, subtitle, gradient, lineGradient, icon, onClick, clickable = false, isActive = false, index = 0 }) {
  const [isHovered, setIsHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const animated = useCountUp(value, 950, index * 90 + 180);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 80 + 60);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        cursor: clickable ? 'pointer' : 'default',
        background: C.surface,
        border: isActive
          ? '1.5px solid rgba(255,255,255,0)'
          : '1px solid rgba(0,0,0,0.06)',
        outline: isActive ? `3px solid ${gradient.match(/#[0-9a-f]{6}/i)?.[0] ?? C.primary}` : 'none',
        outlineOffset: '2px',
        boxShadow: isHovered
          ? '0 12px 28px rgba(0,0,0,0.12), 0 3px 8px rgba(0,0,0,0.06)'
          : '0 3px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)',
        transform: visible
          ? isHovered
            ? 'translateY(-3px) scale(1.01)'
            : 'translateY(0) scale(1)'
          : 'translateY(12px) scale(0.98)',
        opacity: visible ? 1 : 0,
        transition: `
          opacity 0.38s ease ${index * 0.06}s,
          transform 0.32s cubic-bezier(0.34, 1.4, 0.64, 1) ${index * 0.06}s,
          box-shadow 0.2s ease,
          outline 0.2s ease
        `,
        flex: '1 1 0',
        minWidth: 0,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={clickable ? onClick : undefined}
    >
      {/* Gradient Top Section */}
      <div
        style={{
          background: gradient,
          padding: '14px 14px 12px',
          minHeight: 85,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative Circles */}
        <div style={{
          position: 'absolute',
          right: -16,
          top: -16,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.12)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          right: 14,
          bottom: -18,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          pointerEvents: 'none',
        }} />

        {/* Icon Pill + Live Dot */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.22)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'transform 0.24s cubic-bezier(0.34, 1.4, 0.64, 1)',
            transform: isHovered ? 'scale(1.08) rotate(-5deg)' : 'scale(1) rotate(0deg)',
            fontSize: 16,
          }}>
            {icon}
          </div>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.6)',
            marginTop: 3,
          }} />
        </div>

        {/* Big Number */}
        <div style={{
          fontSize: 28,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-1.2px',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
        }}>
          {animated.toLocaleString()}
        </div>
      </div>

      {/* White Label Section */}
      <div style={{
        padding: '10px 14px 0',
        background: C.surface
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.ink,
          lineHeight: 1.3,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 10.5,
          color: C.inkMid,
          marginTop: 2,
          fontWeight: 400,
          letterSpacing: '0.01em',
        }}>
          {subtitle}
        </div>
      </div>

      {/* Gradient Accent Line */}
      <div style={{
        height: isHovered ? 4 : 3,
        background: lineGradient,
        borderRadius: '0 0 16px 16px',
        marginTop: 10,
        opacity: isHovered ? 1 : 0.85,
        transition: 'height 0.2s ease, opacity 0.2s ease',
      }} />
    </div>
  );
}

function Btn({ children, onClick, variant = 'outline', disabled = false, style = {}, type = 'button' }) {
  const [hover, setHover] = useState(false);
  const variants = {
    filled: {
      background: hover ? C.primaryDk : C.primary,
      color: '#fff',
      border: 'none',
      boxShadow: `0 6px 18px ${C.primary}33`,
    },
    outline: {
      background: hover ? C.surfaceDeep : 'transparent',
      color: C.inkMid,
      border: `1px solid ${C.border}`,
    },
    danger: {
      background: hover ? '#b91c1c' : C.danger,
      color: '#fff',
      border: 'none',
    },
    darkred: {
      background: hover ? '#6b1111' : '#7f1d1d',
      color: '#fff',
      border: 'none',
    },
  };

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        borderRadius: 10,
        padding: '10px 18px',
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: '0.15s ease',
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function IconBtn({ title, onClick, children, color }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${hover ? C.borderMid : C.border}`,
        background: hover ? C.surfaceDeep : 'transparent',
        color,
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

function Input({ label, hint, error, ...props }) {
  const hasError = Boolean(error);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: hasError ? C.danger : C.inkMid, letterSpacing: '0.05em' }}>{label}</label>}
      <input
        {...props}
        style={{
          border: `1.5px solid ${hasError ? C.danger : C.border}`,
          borderRadius: 10,
          padding: '10px 12px',
          background: C.surfaceAlt,
          color: hasError ? C.danger : C.ink,
          outline: 'none',
          width: '100%',
          boxShadow: hasError ? `0 0 0 3px ${C.danger}15` : 'none',
          transition: 'all 0.2s ease',
          ...props.style,
        }}
      />
      {error && <span style={{ fontSize: 11, color: C.danger, fontWeight: 600 }}>✕ {error}</span>}
      {!error && hint && <span style={{ fontSize: 11, color: C.inkLight }}>{hint}</span>}
    </div>
  );
}

function SelectField({ label, value, onChange, children, error }) {
  const hasError = Boolean(error);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: hasError ? C.danger : C.inkMid,
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        style={{
          border: `1.5px solid ${hasError ? C.danger : C.border}`,
          borderRadius: 10,
          padding: '10px 12px',
          background: C.surfaceAlt,
          color: hasError ? C.danger : C.ink,
          outline: 'none',
          width: '100%',
          boxShadow: hasError ? `0 0 0 3px ${C.danger}15` : 'none',
        }}
      >
        {children}
      </select>
      {error && (
        <span style={{ fontSize: 11, color: C.danger, fontWeight: 600 }}>
          ✕ {error}
        </span>
      )}
    </div>
  );
}

function Textarea({ label, error, ...props }) {
  const hasError = Boolean(error);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: hasError ? C.danger : C.inkMid,
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </label>
      )}
      <textarea
        {...props}
        style={{
          border: `1.5px solid ${hasError ? C.danger : C.border}`,
          borderRadius: 10,
          padding: '10px 12px',
          background: C.surfaceAlt,
          color: hasError ? C.danger : C.ink,
          outline: 'none',
          width: '100%',
          resize: 'vertical',
          boxShadow: hasError ? `0 0 0 3px ${C.danger}15` : 'none',
          ...props.style,
        }}
      />
      {error && (
        <span style={{ fontSize: 11, color: C.danger, fontWeight: 600 }}>
          ✕ {error}
        </span>
      )}
    </div>
  );
}

function Alert({ type = 'warn', children }) {
  const cfg = {
    warn: { bg: C.warnSoft, border: '#FDE68A', color: '#78350f' },
    error: { bg: C.dangerSoft, border: '#FCA5A5', color: '#7f1d1d' },
    success: { bg: C.successSoft, border: '#86EFAC', color: '#166534' },
    info: { bg: C.primarySoft, border: '#BFDBFE', color: C.primaryDk },
  }[type];

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        borderRadius: 10,
        padding: '11px 12px',
        fontSize: 12,
      }}
    >
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, titleColor = C.ink, children, footer }) {
  if (!open) return null;

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 18,
          border: `1px solid ${C.border}`,
          width: '100%',
          maxWidth: 560,
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 22px 70px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: titleColor }}>{title}</div>
        </div>
        <div style={{ padding: 22, overflowY: 'auto', flex: 1, minHeight: 0 }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '16px 22px',
              borderTop: `1px solid ${C.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ name }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: C.primarySoft,
        color: C.primary,
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.05em',
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

function RoleBadge({ role }) {
  const config = {
    admin: { bg: C.dangerSoft, color: C.danger, label: 'Admin' },
    manager: { bg: C.warnSoft, color: C.warn, label: 'Manager' },
    officer: { bg: C.primarySoft, color: C.primaryDk, label: 'Officer' },
  }[(role || '').toLowerCase()] || { bg: C.surfaceDeep, color: C.inkMid, label: role };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 999,
        background: config.bg,
        color: config.color,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '0.04em',
      }}
    >
      {config.label}
    </span>
  );
}

function apiRoleToFormRole(role) {
  const normalized = normalizeRole(role || 'LOAN_OFFICER');
  if (normalized === 'ADMIN') return 'admin';
  if (normalized === 'BANK_MANAGER') return 'manager';
  return 'officer';
}

function formRoleToApiRole(role) {
  const normalized = (role || '').trim().toLowerCase();
  if (normalized === 'admin') return 'ADMIN';
  if (normalized === 'manager') return 'BANK_MANAGER';
  return 'LOAN_OFFICER';
}

function PresenceDot({ status }) {
  const config = {
    Online: { color: C.success },
    Offline: { color: C.inkLight },
    Suspended: { color: C.danger },
  }[status] || { color: C.inkLight };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: config.color }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: config.color }}>{status}</span>
    </span>
  );
}

function StaffTable({ rows, currentUserRole, onEdit, onDeactivate, onDelete, onPassword }) {
  const thStyle = {
    padding: '12px 14px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: C.inkMid,
    background: C.surfaceAlt,
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '12px 14px',
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'middle',
    fontSize: 13,
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
        <thead>
          <tr>
            {['Full Name', 'Email', 'Username', 'Role', 'Branch', 'Last Login', 'Status', 'Actions'].map((header) => (
              <th key={header} style={thStyle}>
                {header.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} style={{ ...tdStyle, padding: '36px 14px', textAlign: 'center', color: C.inkMid }}>
                No staff records found.
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr key={row.id} style={{ background: index % 2 === 0 ? C.surface : C.surfaceAlt }}>
              <td style={tdStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={row.fullName} />
                  <span style={{ fontWeight: 700 }}>{row.fullName}</span>
                </div>
              </td>
              <td style={{ ...tdStyle, color: C.inkMid }}>{row.email}</td>
              <td style={tdStyle}>
                <span style={{ fontFamily: 'monospace' }}>{row.username}</span>
              </td>
              <td style={tdStyle}>
                <RoleBadge role={row.role} />
              </td>
              <td style={{ ...tdStyle, color: C.inkMid }}>{row.branch || '-'}</td>
              <td style={{ ...tdStyle, color: C.inkMid }}>{fmtTime(row.lastLogin)}</td>
              <td style={tdStyle}>
                <PresenceDot status={getStatus(row)} />
              </td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {canEdit(currentUserRole) && (
                    <>
                      <IconBtn title="Edit" onClick={() => onEdit(row)} color={C.primary}>
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </IconBtn>
                      <IconBtn title="Change Password" onClick={() => onPassword(row)} color={C.warn}>
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        >
                          <rect x="3" y="11" width="18" height="10" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </IconBtn>
                    </>
                  )}
                  {canEdit(currentUserRole) && row.active && (
                    <IconBtn title="Deactivate" onClick={() => onDeactivate(row)} color={C.danger}>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M4.9 4.9l14.2 14.2" />
                      </svg>
                    </IconBtn>
                  )}
                  {canDelete(currentUserRole, row.role) && (
                    <IconBtn title="Delete Permanently" onClick={() => onDelete(row)} color="#7f1d1d">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </IconBtn>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StaffManagement({ currentUser }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeactivate, setOpenDeactivate] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formError, setFormError] = useState(''); // Modal-specific error

  const currentUserRole = normalizeRole(currentUser?.role || 'LOAN_OFFICER');

  const loadStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllStaff();
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(''), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  const rows = useMemo(() => {
    return staffList.filter((staff) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [staff.fullName, staff.email, staff.username, staff.branch, staff.role]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));

      const matchesRole = roleFilter === 'all' || normalizeRole(staff.role) === normalizeRole(roleFilter);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && staff.active) ||
        (statusFilter === 'inactive' && !staff.active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [search, staffList, roleFilter, statusFilter]);

  const totalActive = staffList.filter((staff) => staff.active).length;
  const totalInactive = staffList.filter((staff) => !staff.active).length;
  const totalManagers = staffList.filter((staff) => normalizeRole(staff.role) === 'BANK_MANAGER').length;
  const totalOfficers = staffList.filter((staff) => normalizeRole(staff.role) === 'LOAN_OFFICER').length;
  const totalAdmins = staffList.filter((staff) => normalizeRole(staff.role) === 'ADMIN').length;

  const onFieldChange = (key) => ({
    value: form[key],
    onChange: (e) => {
      let newValue = e.target.value;

      // Sanitize phone input - keep only digits, max 10
      if (key === 'phone') {
        newValue = sanitizePhoneInput(newValue);
      }

      setForm((prev) => ({ ...prev, [key]: newValue }));

      // Validate on change
      let error = '';
      switch (key) {
        case 'fullName':
          error = validateFullName(newValue);
          break;
        case 'username':
          error = validateUsername(newValue);
          break;
        case 'email':
          error = validateEmail(newValue);
          break;
        case 'password':
          error = validatePassword(newValue);
          break;
        case 'confirmPassword':
          error = validatePasswordMatch(form.password, newValue);
          break;
        case 'branch':
          error = validateBranch(newValue);
          break;
        case 'role':
          error = validateRole(newValue);
          break;
        case 'phone':
          error = validatePhone(newValue);
          break;
        case 'address':
          error = validateAddress(newValue);
          break;
        default:
          break;
      }

      setForm((prev) => ({
        ...prev,
        errors: { ...prev.errors, [key]: error }
      }));
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setError('');
    setOpenDialog(true);
  };

  const openEdit = (staff) => {
    setEditing(staff);
    setForm({
      fullName: staff.fullName || '',
      email: staff.email || '',
      username: staff.username || '',
      password: '',
      confirmPassword: '',
      role: apiRoleToFormRole(staff.role),
      branch: staff.branch || '',
      phone: staff.phone || '',
      address: staff.address || '',
      errors: {},
    });
    setFormError('');
    setError('');
    setOpenDialog(true);
  };

  const handleSave = async () => {
    setFormError('');
    setSuccess('');

    // Validate all fields
    const validations = {
      fullName: validateFullName(form.fullName),
      email: validateEmail(form.email),
      username: validateUsername(form.username),
      role: validateRole(form.role),
      branch: validateBranch(form.branch),
      phone: validatePhone(form.phone),
      address: validateAddress(form.address),
    };

    if (!editing) {
      validations.password = validatePassword(form.password);
      validations.confirmPassword = validatePasswordMatch(form.password, form.confirmPassword);
    }

    setForm((prev) => ({ ...prev, errors: validations }));

    // Check if any errors exist
    const hasErrors = Object.values(validations).some((err) => err);
    if (hasErrors) {
      setFormError('Please fix all validation errors before saving.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateStaff(editing.id, {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          role: formRoleToApiRole(form.role),
          branch: form.branch.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
        });
        setSuccess('Staff member updated successfully.');
      } else {
        await createStaff({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          password: form.password,
          role: formRoleToApiRole(form.role),
          branch: form.branch.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
        });
        setSuccess('Staff member created successfully.');
      }

      setOpenDialog(false);
      setForm(EMPTY_FORM);
      setEditing(null);
      setFormError('');
      await loadStaff();
    } catch (err) {
      // Map backend error messages to field-level errors
      const errorMessage = err.message || 'An error occurred';
      const fieldErrors = { ...form.errors };
      let hasFieldError = false;

      if (errorMessage.includes('already exists')) {
        if (errorMessage.includes('Username')) {
          fieldErrors.username = 'Username already exists';
          hasFieldError = true;
        } else if (errorMessage.includes('Email')) {
          fieldErrors.email = 'Email already exists';
          hasFieldError = true;
        }
      }

      if (errorMessage.includes('This phone number is already registered')) {
        fieldErrors.phone = 'This phone number is already registered';
        hasFieldError = true;
      }

      // If we mapped to field errors, update form errors
      if (hasFieldError) {
        setForm((prev) => ({ ...prev, errors: fieldErrors }));
      } else {
        // If no field mapping, show as general form error inside modal
        setFormError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedStaff) return;

    const reasonError = validateDeactivationReason(deactivateReason);
    if (reasonError) {
      setError(reasonError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await deactivateStaff(selectedStaff.id, deactivateReason.trim());
      setOpenDeactivate(false);
      setSelectedStaff(null);
      setDeactivateReason('');
      setSuccess('Staff member deactivated successfully.');
      await loadStaff();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      await deleteStaffPermanently(deleteTarget.id);
      setOpenDelete(false);
      setDeleteTarget(null);
      setSuccess('Staff member permanently deleted.');
      await loadStaff();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!selectedStaff) return;

    // Validate all password fields
    const validations = {};
    validations.currentPassword = validateCurrentPassword(passwordForm.currentPassword);
    validations.newPassword = validatePassword(passwordForm.newPassword || '') || validateNewPasswordDifferent(passwordForm.newPassword, passwordForm.currentPassword);
    validations.confirmPassword = validatePasswordMatch(passwordForm.newPassword, passwordForm.confirmPassword);

    setPasswordForm((prev) => ({ ...prev, errors: validations }));

    const hasErrors = Object.values(validations).some((err) => err);
    if (hasErrors) {
      setError('Please fix all validation errors in the password form.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await changePassword(selectedStaff.id, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setOpenPassword(false);
      setSelectedStaff(null);
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setSuccess('Password changed successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: 24 }}>
      <style>{`
        .dark-search-input::placeholder {
          color: var(--text-muted) !important;
          opacity: 1;
        }
      `}</style>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <PageHeader
          title="Staff Management & Access Control"
          subtitle="Manage staff accounts, roles, permissions, and account status"
        />

        {/* Error and Success Messages */}
        {error && (
          <div style={{ marginBottom: 16 }}>
            <Alert type="error">
              <strong>Error:</strong> {error}
            </Alert>
          </div>
        )}
        {success && (
          <div style={{ marginBottom: 16 }}>
            <Alert type="success">
              <strong>Success:</strong> {success}
            </Alert>
          </div>
        )}

        {/* Enhanced Gradient Summary Cards - Match ApplicantsPage style */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}>
          <StatCard
            title="Total Staff"
            value={staffList.length}
            subtitle="All registered staff"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            lineGradient="linear-gradient(90deg, #3b82f6, #60a5fa)"
            icon={(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            )}
            clickable={false}
            index={0}
          />
          <StatCard
            title="Active Staff"
            value={totalActive}
            subtitle="Currently active accounts"
            gradient="linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
            lineGradient="linear-gradient(90deg, #22c55e, #4ade80)"
            icon={(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
            clickable={false}
            index={1}
          />
          <StatCard
            title="Inactive Staff"
            value={totalInactive}
            subtitle="Suspended accounts"
            gradient="linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
            lineGradient="linear-gradient(90deg, #ef4444, #f87171)"
            icon={(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/>
              </svg>
            )}
            clickable={false}
            index={2}
          />
          <StatCard
            title="Managers"
            value={totalManagers}
            subtitle="Management level"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            lineGradient="linear-gradient(90deg, #f59e0b, #fbbf24)"
            icon={(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            )}
            clickable={false}
            index={3}
          />
          <StatCard
            title="Officers"
            value={totalOfficers}
            subtitle="Officer level staff"
            gradient="linear-gradient(135deg, #0ea5e9 0%, #0891b2 100%)"
            lineGradient="linear-gradient(90deg, #38bdf8, #22d3ee)"
            icon={(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
            )}
            clickable={false}
            index={4}
          />
          <StatCard
            title="Admins"
            value={totalAdmins}
            subtitle="Administrator access"
            gradient="linear-gradient(135deg, #9333ea 0%, #6d28d9 100%)"
            lineGradient="linear-gradient(90deg, #9333ea, #c084fc)"
            icon={(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            )}
            clickable={false}
            index={5}
          />
        </div>

        {/* Search and Add - Match ApplicantsPage style */}
        <div
          style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: 20,
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ flex: 1, marginRight: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="dark-search-input"
              placeholder="Search staff by name, email, username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: 250,
                padding: '12px 16px',
                background: C.surfaceAlt,
                color: C.ink,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                fontSize: 14,
                minHeight: 48,
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = C.primary;
                e.target.style.boxShadow = '0 0 0 3px rgba(110,168,255,0.18)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = C.border;
                e.target.style.boxShadow = 'none';
              }}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                background: C.surfaceAlt,
                color: C.ink,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                fontSize: 14,
                minHeight: 48,
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = C.primary;
                e.target.style.boxShadow = '0 0 0 3px rgba(110,168,255,0.18)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = C.border;
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="officer">Officer</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                background: C.surfaceAlt,
                color: C.ink,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                fontSize: 14,
                minHeight: 48,
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = C.primary;
                e.target.style.boxShadow = '0 0 0 3px rgba(110,168,255,0.18)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = C.border;
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={loadStaff}
              disabled={loading}
              style={{
                background: 'transparent',
                color: C.primary,
                border: `1px solid ${C.primary}`,
                borderRadius: 8,
                padding: '10px 20px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          {canEdit(currentUserRole) && (
            <button
              onClick={openCreate}
              style={{
                background: C.primary,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
              }}
            >
              + Register New Staff
            </button>
          )}
        </div>

        {/* Staff Directory Table - Match ApplicantsPage table style */}
        <div
          style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading staff records...</div>
          ) : (
            <StaffTable
              rows={rows}
              currentUserRole={currentUserRole}
              onEdit={openEdit}
              onDeactivate={(staff) => {
                setSelectedStaff(staff);
                setDeactivateReason('');
                setOpenDeactivate(true);
              }}
              onDelete={(staff) => {
                setDeleteTarget(staff);
                setOpenDelete(true);
              }}
              onPassword={(staff) => {
                setSelectedStaff(staff);
                setPasswordForm(EMPTY_PASSWORD_FORM);
                setOpenPassword(true);
              }}
            />
          )}
        </div>
      </div>

      <Modal
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setFormError('');
        }}
        title={editing ? 'Edit Staff Account' : 'Create Staff Account'}
        footer={
          <>
            <Btn onClick={() => {
              setOpenDialog(false);
              setFormError('');
            }}>Cancel</Btn>
            <Btn variant="filled" onClick={handleSave} disabled={saving || Object.values(form.errors || {}).some(Boolean)}>
              {saving ? 'Saving...' : editing ? 'Update Staff' : 'Create Staff'}
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 14 }}>
          {formError && (
            <Alert type="error">
              {formError}
            </Alert>
          )}
          <Input label="FULL NAME *" placeholder="e.g. Kamal Perera" error={form.errors?.fullName} {...onFieldChange('fullName')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="USERNAME *"
              placeholder="e.g. kamal01"
              error={form.errors?.username}
              {...onFieldChange('username')}
            />
            <SelectField
              label="BRANCH *"
              value={form.branch}
              error={form.errors?.branch}
              onChange={(e) => {
                const newValue = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  branch: newValue,
                  errors: { ...prev.errors, branch: validateBranch(newValue) }
                }));
              }}
            >
              <option value="">Select Branch</option>
              {BRANCH_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </SelectField>
          </div>
          <Input
            label="EMAIL *"
            type="email"
            placeholder="kamal@microfinance.lk"
            error={form.errors?.email}
            {...onFieldChange('email')}
          />
          {!editing && (
            <>
              <Input label="PASSWORD *" type="password" placeholder="Min 6 chars, 1 letter + 1 digit" error={form.errors?.password} {...onFieldChange('password')} />
              <Input label="CONFIRM PASSWORD *" type="password" placeholder="Re-enter password" error={form.errors?.confirmPassword} {...onFieldChange('confirmPassword')} />
            </>
          )}
          <SelectField
            label="ROLE *"
            value={form.role}
            error={form.errors?.role}
            onChange={(e) => {
              const newValue = e.target.value;
              setForm((prev) => ({
                ...prev,
                role: newValue,
                errors: { ...prev.errors, role: validateRole(newValue) }
              }));
            }}
          >
            <option value="officer">Officer</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </SelectField>
          <Input label="PHONE" placeholder="0771234567" type="text" maxLength="10" inputMode="numeric" error={form.errors?.phone} {...onFieldChange('phone')} onKeyDown={blockInvalidPhoneKeys} />
          <Textarea
            label="ADDRESS"
            rows={3}
            placeholder="Optional address"
            error={form.errors?.address}
            value={form.address}
            onChange={(e) => {
              const newValue = e.target.value;
              setForm((prev) => ({ ...prev, address: newValue, errors: { ...prev.errors, address: validateAddress(newValue) } }));
            }}
          />
        </div>
      </Modal>

      <Modal
        open={openDeactivate}
        onClose={() => setOpenDeactivate(false)}
        title="Deactivate Staff Account"
        titleColor={C.danger}
        footer={
          <>
            <Btn onClick={() => setOpenDeactivate(false)}>Cancel</Btn>
            <Btn variant="danger" onClick={handleDeactivate} disabled={saving || !deactivateReason.trim()}>
              {saving ? 'Saving...' : 'Deactivate'}
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14, color: C.ink }}>
            You are about to deactivate <strong>{selectedStaff?.fullName}</strong>.
          </p>
          <Alert type="warn">This performs a soft delete by setting the account to inactive.</Alert>
          <Textarea
            label="REASON *"
            rows={3}
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
            placeholder="e.g. Resigned / Leave / Access suspended"
          />
        </div>
      </Modal>

      <Modal
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        title="Permanently Delete Staff"
        titleColor="#7f1d1d"
        footer={
          <>
            <Btn onClick={() => setOpenDelete(false)}>Cancel</Btn>
            <Btn variant="darkred" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete Permanently'}
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14, color: C.ink }}>
            You are about to permanently delete <strong>{deleteTarget?.fullName}</strong>.
          </p>
          <Alert type="error">This action is irreversible and will remove the record from the database.</Alert>
        </div>
      </Modal>

      <Modal
        open={openPassword}
        onClose={() => setOpenPassword(false)}
        title="Change Staff Password"
        titleColor={C.warn}
        footer={
          <>
            <Btn onClick={() => setOpenPassword(false)}>Cancel</Btn>
            <Btn variant="filled" onClick={handlePasswordChange} disabled={saving || Object.values(passwordForm.errors || {}).some(Boolean)}>
              {saving ? 'Saving...' : 'Change Password'}
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 14, color: C.ink }}>
            Changing password for <strong>{selectedStaff?.fullName}</strong>.
          </p>
          <Input
            label="CURRENT PASSWORD *"
            type="password"
            error={passwordForm.errors?.currentPassword}
            value={passwordForm.currentPassword}
            onChange={(e) => {
              const newValue = e.target.value;
              setPasswordForm((prev) => ({
                ...prev,
                currentPassword: newValue,
                errors: { ...prev.errors, currentPassword: validateCurrentPassword(newValue) }
              }));
            }}
          />
          <Input
            label="NEW PASSWORD *"
            type="password"
            error={passwordForm.errors?.newPassword}
            value={passwordForm.newPassword}
            placeholder="Min 6 chars, 1 letter + 1 digit"
            onChange={(e) => {
              const newValue = e.target.value;
              let error = validatePassword(newValue) || validateNewPasswordDifferent(newValue, passwordForm.currentPassword);
              setPasswordForm((prev) => ({
                ...prev,
                newPassword: newValue,
                errors: { ...prev.errors, newPassword: error }
              }));
            }}
          />
          <Input
            label="CONFIRM NEW PASSWORD *"
            type="password"
            error={passwordForm.errors?.confirmPassword}
            value={passwordForm.confirmPassword}
            onChange={(e) => {
              const newValue = e.target.value;
              setPasswordForm((prev) => ({
                ...prev,
                confirmPassword: newValue,
                errors: { ...prev.errors, confirmPassword: validatePasswordMatch(prev.newPassword, newValue) }
              }));
            }}
          />
          {passwordForm.newPassword && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
                <span style={{ fontWeight: 600, color: C.inkMid }}>PASSWORD STRENGTH</span>
                <span style={{ fontWeight: 700, color: getPasswordStrength(passwordForm.newPassword).color }}>
                  {getPasswordStrength(passwordForm.newPassword).label}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
