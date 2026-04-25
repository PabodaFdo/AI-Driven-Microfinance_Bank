import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../services/authService';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthLabel, PASSWORD_STRENGTH_MESSAGES } from '../utils/passwordValidation';
import './ChangePasswordPage.css';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordValidation = validatePassword(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('Please fill in all password fields.');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('New password does not meet strength requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-panel">
        <div className="change-password-header">
          <h2>Change Password</h2>
          <p>Update your password to keep your account secure.</p>
        </div>

        {success ? (
          <div className="change-password-success">
            <div className="success-icon">✓</div>
            <p>Your password has been changed successfully!</p>
            <p className="success-small-text">Redirecting to dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="change-password-form">
            {/* Current Password */}
            <div className="change-password-form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <div className="password-input-wrapper">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  className="change-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="password-toggle"
                  disabled={loading}
                >
                  {showCurrentPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="change-password-form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="change-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="password-toggle"
                  disabled={loading}
                >
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="password-strength-container">
                <div className="password-strength-bar">
                  <div
                    className="password-strength-fill"
                    style={{
                      width: `${(passwordValidation.strength / 5) * 100}%`,
                      backgroundColor: getPasswordStrengthColor(passwordValidation.strength),
                    }}
                  />
                </div>
                <p className="password-strength-label" style={{
                  color: getPasswordStrengthColor(passwordValidation.strength),
                }}>
                  Strength: {getPasswordStrengthLabel(passwordValidation.strength)}
                </p>

                {/* Requirements List */}
                <div className="password-requirements">
                  {Object.values(PASSWORD_STRENGTH_MESSAGES).map((msg, idx) => {
                    const isValid = !passwordValidation.errors.includes(msg);
                    return (
                      <div
                        key={idx}
                        className={`requirement ${isValid ? 'met' : 'unmet'}`}
                      >
                        <span className="requirement-icon">{isValid ? '✓' : '✗'}</span>
                        <span>{msg}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <div className="change-password-form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="change-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle"
                  disabled={loading}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Password Match Indicator */}
            {confirmPassword && newPassword !== confirmPassword && (
              <div className="password-mismatch">
                ✗ Passwords do not match
              </div>
            )}
            {confirmPassword && newPassword === confirmPassword && newPassword && (
              <div className="password-match">
                ✓ Passwords match
              </div>
            )}

            {error && <div className="change-password-error-message">{error}</div>}

            <div className="change-password-actions">
              <button
                type="submit"
                disabled={loading || !passwordValidation.isValid || newPassword !== confirmPassword}
                className="change-password-submit-btn"
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="change-password-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
