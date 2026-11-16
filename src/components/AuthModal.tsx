import React, { useState } from 'react';
import {
  GraduationCap,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    sendPasswordReset,
    enableDemoMode,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Too many failed attempts. Please reset your password or try again later.');
      } else {
        setErrorMessage(err.message || 'Failed to sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(email.trim(), password, fullName.trim());
      setSuccessMessage('Account created successfully! Verification email sent.');
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('An account with this email already exists. Please log in.');
      } else {
        setErrorMessage(err.message || 'Failed to register account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    clearMessages();
    setLoading(true);
    try {
      await loginWithGoogle();
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Google sign-in was cancelled or encountered an error.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address to receive reset instructions.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSuccessMessage('Password reset link sent! Check your inbox.');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-100 mb-4">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
          STUDYFORGE <span className="text-indigo-600">AI</span>
        </h2>
        <p className="mt-1 text-xs text-neutral-500 font-medium tracking-wide uppercase">
          Study Smarter. Stay Ahead.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xs border border-neutral-200/80 rounded-2xl sm:px-10">
          {/* Header Switcher */}
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-neutral-100">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">
                {mode === 'login' && 'Student Sign In'}
                {mode === 'register' && 'Create Student Account'}
                {mode === 'forgot' && 'Reset Password'}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {mode === 'login' && 'Welcome back. Access your timetable and study plan.'}
                {mode === 'register' && 'Start organizing your syllabus and exam timetable.'}
                {mode === 'forgot' && 'Enter your student email for a password reset link.'}
              </p>
            </div>
          </div>

          {/* Alert feedback */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form Content */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Email Address</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-neutral-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setMode('forgot');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-neutral-600">
                  Remember my login on this device
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Full Name</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Sharma"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Email Address</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Password</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Confirm Password</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-start">
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="agree-terms" className="ml-2 block text-xs text-neutral-600 leading-relaxed">
                  I agree to the <span className="text-indigo-600 underline">Terms of Service</span> and{' '}
                  <span className="text-indigo-600 underline">Privacy Policy</span>.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Student Email Address</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode('login');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Return to sign in
                </button>
              </div>
            </form>
          )}

          {/* Social Divider */}
          <div className="mt-5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-neutral-400">Or continue with</span>
              </div>
            </div>

            {/* Google Authentication */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Demo Mode Button */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  enableDemoMode();
                  onSuccess?.();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 rounded-lg text-xs font-semibold text-amber-900 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Explore Demo Mode (1st-Yr Engineering Student)
              </button>
            </div>
          </div>

          {/* Toggle between Login and Register */}
          <div className="mt-6 text-center text-xs text-neutral-500">
            {mode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode('register');
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Create Account
                </button>
              </p>
            ) : mode === 'register' ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode('login');
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Sign In
                </button>
              </p>
            ) : null}
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
          <span>Secured with Firebase Authentication & Firestore</span>
        </div>
      </div>
    </div>
  );
};
