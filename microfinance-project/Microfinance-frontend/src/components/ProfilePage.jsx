import { useMemo, useState, useEffect } from 'react';
import { getMyProfile, updateMyProfile, changeMyPassword } from '../services/profileService';
import { PageHeader } from './PageHeader';
import {
  validateFullName,
  validatePhone,
  validateAddress,
  validatePassword,
  validatePasswordMatch,
  validateCurrentPassword,
  validateNewPasswordDifferent,
  getPasswordStrength,
} from '../utils/validationHelpers';

const C = {
  royalBlue: "var(--primary)",
  royalDark: "var(--primary-hover)",
  royalDeep: "var(--primary-active)",
  royalLight: "var(--primary-light)",
  royalSoft: "var(--primary-soft)",
  royalMid: "var(--primary-subtle)",
  accent: "var(--accent)",
  danger: "var(--danger)",
  dangerSoft: "var(--danger-soft)",
  warn: "var(--warning)",
  warnSoft: "var(--warning-soft)",
  success: "var(--success)",
  successSoft: "var(--success-soft)",
  ink: "var(--text)",
  inkMid: "var(--text-muted)",
  inkLight: "var(--text-light)",
  border: "var(--border)",
  borderMid: "var(--border-strong)",
  surface: "var(--surface)",
  surfaceAlt: "var(--surface-2)",
  surfaceDeep: "var(--surface-3)",
};

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function fmtDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function fmtLastLogin(value) {
  if (!value) return 'Unknown';
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return fmtDate(value);
}

function Label({ children }) {
  return <label style={{ fontSize: 11, fontWeight: 700, color: C.inkMid, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{children}</label>;
}

function Field({ label, value, onChange, type = 'text', disabled = false, placeholder, hint, error }) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '10px 13px',
          borderRadius: 10,
          border: `1.5px solid ${hasError ? C.danger : focused ? C.royalBlue : C.border}`,
          background: disabled ? C.surfaceDeep : C.surfaceAlt,
          color: hasError ? C.danger : disabled ? C.inkMid : C.ink,
          fontSize: 13.5,
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'text',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: hasError ? `0 0 0 3px ${C.danger}15` : focused ? `0 0 0 3px ${C.royalBlue}18` : 'none',
        }}
      />
      {error && <p style={{ fontSize: 11, color: C.danger, marginTop: 5, marginBottom: 0, fontWeight: 600 }}>✕ {error}</p>}
      {!error && hint && <p style={{ fontSize: 11, color: C.inkLight, marginTop: 5, marginBottom: 0 }}>{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, children, disabled = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 13px',
          borderRadius: 10,
          border: `1.5px solid ${C.border}`,
          background: disabled ? C.surfaceDeep : C.surfaceAlt,
          color: disabled ? C.inkMid : C.ink,
          fontSize: 13.5,
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {children}
      </select>
    </div>
  );
}

function SectionCard({ title, subtitle, icon, children, accent = C.royalBlue }) {
  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
        boxShadow: '0 1px 8px rgba(19,88,255,0.05)',
      }}
    >
      <div
        style={{
          padding: '1.1rem 1.5rem',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: `linear-gradient(90deg, ${accent}08, transparent)`,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${accent}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: C.inkMid, marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding: '1.5rem' }}>{children}</div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  error,
  visible,
  onToggleVisibility,
  onChange,
  placeholder = '........',
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <Label>{label}</Label>
      <div style={{ position: 'relative' }}>
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px 42px 10px 13px',
            borderRadius: 10,
            border: `1.5px solid ${error ? C.danger : focused ? C.royalBlue : C.border}`,
            background: C.surfaceAlt,
            color: error ? C.danger : C.ink,
            fontSize: 13.5,
            outline: 'none',
            boxShadow: error ? `0 0 0 3px ${C.danger}15` : focused ? `0 0 0 3px ${C.royalBlue}18` : 'none',
            transition: 'all 0.15s',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleVisibility}
          style={{
            position: 'absolute',
            right: 11,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: C.inkLight,
            padding: 0,
            display: 'flex',
          }}
        >
          {visible ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p style={{ fontSize: 11, color: C.danger, marginTop: 5, marginBottom: 0, fontWeight: 600 }}>
          ✕ {error}
        </p>
      )}
    </div>
  );
}

function Toast({ message, type = 'success', onDismiss }) {
  const bg = type === 'success' ? C.successSoft : C.dangerSoft;
  const color = type === 'success' ? '#065f46' : '#7f1d1d';
  const border = type === 'success' ? '#6ee7b7' : '#fca5a5';
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 9999,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        animation: 'slideUp 0.25s ease',
        color,
        fontSize: 13,
        fontWeight: 600,
        maxWidth: 340,
      }}
    >
      {type === 'success' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )}
      {message}
      <button
        type="button"
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color,
          marginLeft: 'auto',
          fontSize: 16,
          lineHeight: 1,
          padding: 2,
          opacity: 0.7,
        }}
      >
        x
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [editProfile, setEditProfile] = useState(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [toast, setToast] = useState(null);

  // Load profile data on component mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await getMyProfile();

      // Transform the data to match the expected format
      const transformedProfile = {
        id: profileData.id,
        fullName: profileData.fullName || '',
        email: profileData.email || '',
        username: profileData.username || '',
        role: (profileData.role || '').toLowerCase(),
        branch: profileData.branch || '',
        address: profileData.address || '',
        phone: profileData.phone || '',
        active: profileData.active !== undefined ? profileData.active : true,
        joinedDate: profileData.createdAt || '',
        lastLogin: profileData.lastLogin || '',
      };

      setProfile(transformedProfile);
      setEditProfile({ ...transformedProfile });
    } catch (err) {
      setError(err.message || 'Failed to load profile');
      showToast('Failed to load profile data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleProfileChange = (key, value) => {
    setEditProfile((prev) => ({ ...prev, [key]: value }));
    setProfileDirty(true);

    // Validate on change
    let error = '';
    switch (key) {
      case 'fullName':
        error = validateFullName(value);
        break;
      case 'phone':
        error = validatePhone(value);
        break;
      case 'address':
        error = validateAddress(value);
        break;
      default:
        break;
    }

    setProfileErrors((prev) => ({ ...prev, [key]: error }));
  };

  const handleProfileSave = async () => {
    setSavingProfile(true);
    setPwError('');

    // Validate all fields
    const validations = {
      fullName: validateFullName(editProfile.fullName),
      phone: validatePhone(editProfile.phone),
      address: validateAddress(editProfile.address),
    };

    setProfileErrors(validations);

    // Check if any errors exist
    const hasErrors = Object.values(validations).some((err) => err);
    if (hasErrors) {
      showToast('Please fix all validation errors', 'error');
      setSavingProfile(false);
      return;
    }

    try {
      const updatedProfile = await updateMyProfile({
        fullName: editProfile.fullName,
        phone: editProfile.phone,
        address: editProfile.address
      });

      // Transform and update the profile state
      const transformedProfile = {
        ...profile,
        fullName: updatedProfile.fullName || '',
        address: updatedProfile.address || '',
        phone: updatedProfile.phone || '',
      };

      setProfile(transformedProfile);
      setEditProfile({ ...transformedProfile });
      setProfileDirty(false);
      setProfileErrors({});
      showToast('Profile updated successfully');
    } catch (error) {
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfileReset = () => {
    setEditProfile({ ...profile });
    setProfileDirty(false);
  };

  const handlePasswordFieldChange = (keyName, newValue) => {
    const nextPw = { ...pw, [keyName]: newValue };
    setPw(nextPw);

    const nextErrors = { ...pwErrors };

    if (keyName === 'current') {
      nextErrors.current = validateCurrentPassword(newValue);
      if (nextPw.newPw) {
        nextErrors.newPw =
          validatePassword(nextPw.newPw) || validateNewPasswordDifferent(nextPw.newPw, newValue);
      }
    }

    if (keyName === 'newPw') {
      nextErrors.newPw =
        validatePassword(newValue) || validateNewPasswordDifferent(newValue, nextPw.current);

      if (nextPw.confirm) {
        nextErrors.confirm = validatePasswordMatch(newValue, nextPw.confirm);
      }
    }

    if (keyName === 'confirm') {
      nextErrors.confirm = validatePasswordMatch(nextPw.newPw, newValue);
    }

    setPwErrors(nextErrors);
  };

  const handlePasswordSave = async () => {
    setPwError('');

    // Validate all passwords
    const validations = {};
    validations.current = validateCurrentPassword(pw.current);
    validations.newPw = validatePassword(pw.newPw || '') || validateNewPasswordDifferent(pw.newPw, pw.current);
    validations.confirm = validatePasswordMatch(pw.newPw, pw.confirm);

    setPwErrors(validations);

    // Check if any errors exist
    const hasErrors = Object.values(validations).some((err) => err);
    if (hasErrors) {
      setPwError('Please fix all validation errors');
      showToast('Please fix all validation errors in password fields', 'error');
      return;
    }

    setSavingPw(true);
    try {
      await changeMyPassword(profile.id, {
        currentPassword: pw.current,
        newPassword: pw.newPw
      });

      setPw({ current: '', newPw: '', confirm: '' });
      setPwErrors({});
      setPwError('');
      showToast('Password changed successfully');
    } catch (error) {
      setPwError(error.message || 'Failed to change password');
      showToast(error.message || 'Failed to change password', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  const roleCfg = profile ? {
    admin: { label: 'System Admin', bg: C.dangerSoft, color: '#7f1d1d' },
    manager: { label: 'Branch Manager', bg: C.warnSoft, color: '#78350f' },
    bank_manager: { label: 'Branch Manager', bg: C.warnSoft, color: '#78350f' },
    officer: { label: 'Field Officer', bg: C.royalSoft, color: C.royalDeep },
    loan_officer: { label: 'Field Officer', bg: C.royalSoft, color: C.royalDeep },
  }[profile.role] || { label: profile.role, bg: C.surfaceDeep, color: C.inkMid } : { label: '', bg: C.surfaceDeep, color: C.inkMid };

  // Loading state
  if (loading) {
    return (
      <div className="profile-page-root">
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${C.royalBlue}, ${C.royalLight})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 1 0-16 0" />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: 0 }}>My Profile</h1>
          </div>
          <p style={{ fontSize: 13, color: C.inkMid, margin: 0 }}>Loading your profile information...</p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: `4px solid ${C.royalBlue}`,
            borderTop: `4px solid transparent`,
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ fontSize: 14, color: C.inkMid }}>Loading your profile data...</p>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="profile-page-root">
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${C.danger}, #DC2626)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: 0 }}>My Profile</h1>
          </div>
          <p style={{ fontSize: 13, color: C.inkMid, margin: 0 }}>Unable to load profile information</p>
        </div>

        <div
          style={{
            background: C.dangerSoft,
            border: `1px solid #FCA5A5`,
            borderRadius: 16,
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h3 style={{ color: '#7f1d1d', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Error Loading Profile</h3>
          <p style={{ color: '#7f1d1d', fontSize: 14, marginBottom: 20 }}>{error}</p>
          <button
            onClick={loadProfile}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: C.danger,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Return null if no profile data
  if (!profile) {
    return null;
  }

  return (
    <div className="profile-page-root">
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal information and account security"
        icon={
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 1 0-16 0" />
          </svg>
        }
      />

      <div
        style={{
          background: `linear-gradient(135deg, ${C.royalDeep} 0%, ${C.royalBlue} 60%, ${C.royalLight} 100%)`,
          borderRadius: 20,
          padding: '2rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            right: 80,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: C.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 800,
                color: '#fff',
                border: '3px solid rgba(255,255,255,0.3)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              {initials(profile?.fullName || '')}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 3,
                right: 3,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: profile?.active ? C.success : C.danger,
                border: '2px solid white',
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>{profile?.fullName || 'Unknown User'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 12px' }}>
              @{profile?.username || 'unknown'} · {profile?.email || 'no-email'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ background: roleCfg.bg, color: roleCfg.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                {roleCfg.label}
              </span>
              <span
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {profile?.branch || 'Unknown Branch'}
              </span>
              <span
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.8)',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Joined {fmtDate(profile?.joinedDate || profile?.createdAt)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            {[
              { val: profile?.active ? 'Active' : 'Inactive', label: 'Status' },
              { val: fmtLastLogin(profile?.lastLogin), label: 'Last Login' },
            ].map((stat) => (
              <div key={stat.label} style={{ padding: '12px 20px', textAlign: 'center' }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{stat.val}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="profile-grid-two-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <SectionCard
            title="Personal Information"
            subtitle="Update your display name and contact details"
            icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 1 0-16 0" />
              </svg>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="FULL NAME" value={editProfile?.fullName || ''} onChange={(e) => handleProfileChange('fullName', e.target.value)} placeholder="Your full name" error={profileErrors?.fullName} />
              <Field label="PHONE NUMBER" value={editProfile?.phone || ''} onChange={(e) => handleProfileChange('phone', e.target.value)} placeholder="+94 77 000 0000" type="tel" error={profileErrors?.phone} />
              <div>
                <Label>ADDRESS</Label>
                <textarea
                  value={editProfile?.address || ''}
                  rows={2}
                  onChange={(e) => handleProfileChange('address', e.target.value)}
                  placeholder="Your residential address"
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    borderRadius: 10,
                    border: `1.5px solid ${profileErrors?.address ? C.danger : C.border}`,
                    background: C.surfaceAlt,
                    color: profileErrors?.address ? C.danger : C.ink,
                    fontSize: 13.5,
                    outline: 'none',
                    resize: 'vertical',
                    boxShadow: profileErrors?.address ? `0 0 0 3px ${C.danger}15` : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
                {profileErrors?.address && <p style={{ fontSize: 11, color: C.danger, marginTop: 5, marginBottom: 0, fontWeight: 600 }}>✕ {profileErrors.address}</p>}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Account Details"
            subtitle="System-assigned and admin-controlled fields"
            accent={C.inkMid}
            icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="USERNAME" value={profile?.username || ''} disabled hint="Cannot be changed after registration" />
              <Field label="EMAIL ADDRESS" type="email" value={profile?.email || ''} disabled hint="Contact admin to update your email" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <SelectField label="ROLE" value={profile?.role || ''} onChange={() => {}} disabled>
                  <option value="officer">Field Officer</option>
                  <option value="manager">Branch Manager</option>
                  <option value="admin">System Admin</option>
                </SelectField>
                <Field label="BRANCH" value={profile?.branch || ''} disabled />
              </div>
            </div>
          </SectionCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <SectionCard
            title="Change Password"
            subtitle="Use a strong password of at least 6 characters"
            accent={C.warn}
            icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {pwError && (
                <div
                  style={{
                    background: C.dangerSoft,
                    border: '1px solid #FCA5A5',
                    borderRadius: 9,
                    padding: '9px 13px',
                    fontSize: 12,
                    color: '#7f1d1d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  {pwError}
                </div>
              )}
              <PasswordField
                label="CURRENT PASSWORD"
                value={pw.current}
                error={pwErrors?.current}
                visible={showPw.current}
                onToggleVisibility={() =>
                  setShowPw((prev) => ({ ...prev, current: !prev.current }))
                }
                onChange={(e) => handlePasswordFieldChange('current', e.target.value)}
              />
              <PasswordField
                label="NEW PASSWORD"
                value={pw.newPw}
                error={pwErrors?.newPw}
                visible={showPw.newPw}
                onToggleVisibility={() =>
                  setShowPw((prev) => ({ ...prev, newPw: !prev.newPw }))
                }
                onChange={(e) => handlePasswordFieldChange('newPw', e.target.value)}
              />
              <PasswordField
                label="CONFIRM NEW PASSWORD"
                value={pw.confirm}
                error={pwErrors?.confirm}
                visible={showPw.confirm}
                onToggleVisibility={() =>
                  setShowPw((prev) => ({ ...prev, confirm: !prev.confirm }))
                }
                onChange={(e) => handlePasswordFieldChange('confirm', e.target.value)}
              />

              {pw.newPw.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: C.inkMid, fontWeight: 600 }}>PASSWORD STRENGTH</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: getPasswordStrength(pw.newPw).color,
                      }}
                    >
                      {getPasswordStrength(pw.newPw).label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 4,
                          background:
                            i === 0
                              ? pw.newPw.length >= 1
                                ? C.danger
                                : C.border
                              : i === 1
                              ? pw.newPw.length >= 6
                                ? C.warn
                                : C.border
                              : pw.newPw.length >= 10
                              ? C.success
                              : C.border,
                          transition: 'background 0.3s',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handlePasswordSave}
                disabled={savingPw || Object.values(pwErrors || {}).some(Boolean)}
                style={{
                  padding: '10px 0',
                  borderRadius: 10,
                  border: 'none',
                  background: savingPw || Object.values(pwErrors || {}).some(Boolean) ? C.borderMid : `linear-gradient(135deg, ${C.warn}, #f59e0b)`,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: savingPw || Object.values(pwErrors || {}).some(Boolean) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: savingPw || Object.values(pwErrors || {}).some(Boolean) ? 'none' : '0 4px 12px rgba(217,119,6,0.35)',
                  opacity: savingPw || Object.values(pwErrors || {}).some(Boolean) ? 0.6 : 1,
                }}
              >
                {savingPw ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Recent Activity"
            subtitle="Your last known system interactions"
            accent={C.accent}
            icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { action: 'Logged in', detail: 'Colombo branch session', time: '2 min ago', color: C.success },
                { action: 'Staff record updated', detail: 'Nimal Fernando - role change', time: '1h ago', color: C.royalBlue },
                { action: 'Application reviewed', detail: 'APP-2025-0043', time: '3h ago', color: C.warn },
                { action: 'Report generated', detail: 'Monthly trends - Feb 2026', time: 'Yesterday', color: C.accent },
              ].map((item, i, arr) => (
                <div key={item.action + i}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0' }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: item.color,
                        flexShrink: 0,
                        marginTop: 5,
                        boxShadow: `0 0 0 3px ${item.color}25`,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{item.action}</div>
                      <div style={{ fontSize: 12, color: C.inkMid, marginTop: 1 }}>{item.detail}</div>
                    </div>
                    <span style={{ fontSize: 11, color: C.inkLight, flexShrink: 0, marginTop: 2 }}>{item.time}</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ height: 1, background: C.border, marginLeft: 20 }} />}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <div
        style={{
          marginTop: '1.5rem',
          position: 'sticky',
          bottom: 0,
          background: C.surface,
          borderRadius: 14,
          border: `1px solid ${profileDirty ? C.royalMid : C.border}`,
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: profileDirty ? `0 0 0 3px ${C.royalBlue}12` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {profileDirty ? (
            <>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.warn, animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 13, color: C.warn, fontWeight: 600 }}>You have unsaved changes</span>
            </>
          ) : (
            <>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.success }} />
              <span style={{ fontSize: 13, color: C.inkMid, fontWeight: 500 }}>All changes saved</span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={handleProfileReset}
            disabled={!profileDirty}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              border: `1.5px solid ${C.border}`,
              background: 'transparent',
              color: profileDirty ? C.inkMid : C.inkLight,
              fontSize: 13,
              fontWeight: 600,
              cursor: profileDirty ? 'pointer' : 'not-allowed',
              opacity: profileDirty ? 1 : 0.5,
            }}
          >
            Discard Changes
          </button>
          <button
            type="button"
            onClick={handleProfileSave}
            disabled={!profileDirty || savingProfile || Object.values(profileErrors || {}).some(Boolean)}
            style={{
              padding: '9px 22px',
              borderRadius: 10,
              border: 'none',
              background: !profileDirty || savingProfile || Object.values(profileErrors || {}).some(Boolean) ? C.borderMid : `linear-gradient(135deg, ${C.royalBlue}, ${C.royalLight})`,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: !profileDirty || savingProfile || Object.values(profileErrors || {}).some(Boolean) ? 'not-allowed' : 'pointer',
              boxShadow: profileDirty && !Object.values(profileErrors || {}).some(Boolean) ? `0 4px 14px ${C.royalBlue}40` : 'none',
              opacity: !profileDirty || Object.values(profileErrors || {}).some(Boolean) ? 0.6 : 1,
            }}
          >
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
