import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../services/authService';
import './Login.css';

const FLIP_BACK_DELAY_MS = 220;

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const closeTimerRef = useRef(null);
  const cardWrapRef = useRef(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openFlip = useCallback(() => {
    clearCloseTimer();
    setIsFlipped(true);
  }, [clearCloseTimer]);

  const closeFlip = useCallback((delay = FLIP_BACK_DELAY_MS) => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      const wrap = cardWrapRef.current;
      const activeInside = Boolean(wrap && wrap.contains(document.activeElement));

      if (!activeInside) {
        setIsFlipped(false);
      }

      closeTimerRef.current = null;
    }, delay);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  const handleBlur = (e) => {
    const next = e.relatedTarget;
    if (!e.currentTarget.contains(next)) {
      closeFlip();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const { token, user } = await login(email.trim(), password);
      onLoginSuccess({ token, user });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login-root">
      <div className="portal-login-bg" aria-hidden="true">
        <div className="portal-bg-overlay" />
        <div className="portal-bg-orb orb1" />
        <div className="portal-bg-orb orb2" />
        <div className="portal-bg-orb orb3" />
        <div className="portal-bg-orb orb4" />
        <div className="portal-grid" />
        <div className="portal-particles" />
      </div>

      <div
        ref={cardWrapRef}
        className={`portal-card-wrap ${isFlipped ? 'is-flipped' : ''}`}
        tabIndex={0}
        onMouseEnter={openFlip}
        onMouseLeave={closeFlip}
        onFocusCapture={openFlip}
        onBlurCapture={handleBlur}
        onKeyDown={(event) => {
          // Allow form submission: don't intercept Enter/Space in input fields
          const isFormInput = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA';

          if (!isFormInput && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            clearCloseTimer();
            setIsFlipped((prev) => !prev);
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            closeFlip(0);
          }
        }}
      >
        <div className="portal-card-flip">
          <div className="portal-card front-card">
            <div className="card-content front-content">
              <div className="card-icon" aria-hidden="true">🏦</div>
              <h2>Microfinance Staff Portal</h2>
              <p className="front-subtitle">
                Secure access to manage loan applications, borrower risk analysis,
                and intelligent recommendation workflows.
              </p>

              <div className="feature-list">
                <span className="portal-feature-pill">Applications</span>
                <span className="portal-feature-pill">Risk Assessment</span>
                <span className="portal-feature-pill">Recommendations</span>
              </div>

              <div className="hover-hint">
                <span>✦</span>
                Hover over the card to reveal the secure login form
                <span>✦</span>
              </div>

              <p className="security-note">Authorized staff access only</p>
            </div>
          </div>

          <div className="portal-card back-card">
            <form className="card-content back-content" onSubmit={handleSubmit}>
              <div className="card-icon" aria-hidden="true">🔐</div>
              <h2>Staff Login</h2>
              <p className="back-subtitle">Microfinance Staff Portal</p>

              {error ? <div className="portal-login-error">{error}</div> : null}

              <label htmlFor="staffEmail">Staff Email</label>
              <input
                id="staffEmail"
                type="email"
                placeholder="your@microfinance.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={openFlip}
                disabled={loading}
                autoComplete="username"
              />

              <label htmlFor="staffPassword">Password</label>
              <div className="password-field-wrap">
                <input
                  id="staffPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={openFlip}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  onFocus={openFlip}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="password-toggle-text">{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              <button
                className="login-btn"
                type="submit"
                disabled={loading}
                onFocus={openFlip}
              >
                {loading ? 'Entering...' : 'Enter Portal'}
              </button>

              <Link to="/forgot-password" className="forgot-password-link">
                Forgot password?
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}