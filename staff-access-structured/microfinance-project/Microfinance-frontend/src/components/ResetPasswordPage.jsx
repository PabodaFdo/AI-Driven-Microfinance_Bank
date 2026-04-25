import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthLabel, PASSWORD_STRENGTH_MESSAGES } from '../utils/passwordValidation';
import './AuthPages.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordValidation = validatePassword(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Please fill in all password fields.');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('Password does not meet strength requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-root">
      <div className="auth-page-bg" aria-hidden="true">
        <div className="auth-bg-overlay" />
        <div className="auth-bg-orb orb1" />
        <div className="auth-bg-orb orb2" />
        <div className="auth-bg-orb orb3" />
        <div className="auth-bg-orb orb4" />
        <div className="auth-grid" />
        <div className="auth-particles" />
      </div>

      <div className="auth-card-container">
        <div className="auth-card">
          <div className="auth-content">
            <div className="auth-icon">🔐</div>
            <h2>Reset Password</h2>
            <p className="auth-subtitle">
              Create a new strong password for your account.
            </p>

            {success ? (
              <div className="auth-success-message">
                <div className="auth-success-icon">✓</div>
                <p>Your password has been reset successfully!</p>
                <p className="auth-small-text">Redirecting to login...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="auth-form">
                {/* New Password */}
                <div className="auth-form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      className="auth-input"
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
                <div className="auth-form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="auth-input"
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

                {error && <div className="auth-error-message">{error}</div>}

                <button
                  type="submit"
                  disabled={loading || !passwordValidation.isValid || newPassword !== confirmPassword}
                  className="auth-submit-btn"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            <div className="auth-footer">
              <Link to="/login" className="auth-link">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
