import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import './AuthPages.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      await forgotPassword(email.trim());
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to send reset link. Please try again.');
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
            <div className="auth-icon">🔑</div>
            <h2>Forgot Password?</h2>
            <p className="auth-subtitle">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {success ? (
              <div className="auth-success-message">
                <div className="auth-success-icon">✓</div>
                <p>Check your email for a password reset link.</p>
                <p className="auth-small-text">Redirecting to login in 3 seconds...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="staff@microfinance.lk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="auth-input"
                  />
                </div>

                {error && <div className="auth-error-message">{error}</div>}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="auth-submit-btn"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
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
