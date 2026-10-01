/**
 * Login Page
 * ----------
 * Two-step form that calls POST /auth/login.
 *   Step 1: Email → "Continue" (format check only, no request is made)
 *   Step 2: Password animates in (ConditionalField) → "Sign In"
 * This is pure progressive disclosure. We do NOT claim to know whether the
 * email has an account: the backend intentionally returns the same
 * "Incorrect email or password" for unknown emails and wrong passwords.
 * On success the JWT + user are stored by AuthContext and we go to /dashboard.
 */

import { useEffect, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import PasswordInput from '../components/PasswordInput';
import AuthLayout from '../components/AuthLayout';
import ConditionalField from '../components/ConditionalField';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Escape collapses the password step (only while it is open)
  useEffect(() => {
    if (!showPassword) return undefined;
    const onKeyUp = (e) => {
      if (e.key === 'Escape') {
        setShowPassword(false);
        setPassword('');
        setFieldErrors((f) => ({ ...f, password: '' }));
      }
    };
    window.addEventListener('keyup', onKeyUp);
    return () => window.removeEventListener('keyup', onKeyUp);
  }, [showPassword]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateEmail = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email address';
    setFieldErrors((f) => ({ ...f, ...errs, email: errs.email || '' }));
    return !errs.email;
  };

  const validate = () => {
    const emailOk = validateEmail();
    const errs = {};
    if (!password) errs.password = 'Password is required';
    setFieldErrors((f) => ({ ...f, ...errs }));
    return emailOk && Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Step 1: reveal the password field once the email looks valid
    if (!showPassword) {
      if (validateEmail()) setShowPassword(true);
      return;
    }

    // Step 2: real sign-in
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout heading="Welcome back." subheading="Sign in to manage stock, orders and warehouses.">

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email Address <span className="req">*</span></label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: '' })); }}
              placeholder="you@company.com"
              autoComplete="email"
              maxLength={150}
            />
            {fieldErrors.email && <div className="form-error">{fieldErrors.email}</div>}
          </div>

          <ConditionalField open={showPassword}>
            <label htmlFor="login-password">Password <span className="req">*</span></label>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: '' })); }}
              placeholder="Enter your password"
              autoComplete="current-password"
              maxLength={128}
              autoFocus
            />
            {fieldErrors.password && <div className="form-error">{fieldErrors.password}</div>}
          </ConditionalField>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : showPassword ? 'Sign In' : 'Continue'}
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
    </AuthLayout>
  );
}
