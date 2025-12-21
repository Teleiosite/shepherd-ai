
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User, Lock, Mail, ArrowRight, Building2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import logoImage from '../logo.png';
import illustrationImage from '../illustration.png';
import shepherdSheepImage from '../shepherd-sheep.png';

interface AuthProps {
  onLogin: () => void;
}

type AuthView = 'login' | 'register' | 'forgot-password';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<AuthView>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    churchName: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (view === 'login') {
        const result = await authService.login(formData.email, formData.password);
        if (result.success) {
          onLogin();
        } else {
          setError(result.message || 'Login failed');
        }
      }
      else if (view === 'register') {
        const result = await authService.register(formData.name, formData.email, formData.password, formData.churchName);
        if (result.success) {
          onLogin();
        } else {
          setError(result.message || 'Registration failed');
        }
      }
      else if (view === 'forgot-password') {
        const result = await authService.recoverPassword(formData.email);
        if (result.success) {
          setSuccess(result.message);
        } else {
          setError(result.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Blurred background circles */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-green-500/10 rounded-full blur-3xl"></div>

      {/* Main Card */}
      <div className="relative w-full max-w-5xl h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden flex">

        {/* Left Side - Branding & Illustration */}
        <div className="relative w-1/2 bg-white p-12 flex flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <img src={logoImage} alt="Shepherd AI" className="w-12 h-12" />
            <span className="text-2xl font-extrabold text-slate-800">Shepherd AI</span>
          </div>

          {/* Festive Illustration */}
          <div className="flex-1 flex items-center justify-center">
            <img src={shepherdSheepImage} alt="Shepherd with sheep" className="w-80 h-80 object-contain" />
          </div>

          {/* Footer */}
          <div className="text-xs text-slate-400 mt-auto">
            © 2025 Shepherd AI. All rights reserved.
          </div>
        </div>

        {/* Organic Wave Divider */}
        <div className="absolute top-0 left-1/2 h-full w-24 -ml-12 z-10">
          <svg viewBox="0 0 100 700" className="h-full w-full" preserveAspectRatio="none">
            <path d="M0,0 Q50,175 0,350 T0,700 L100,700 L100,0 Z" fill="rgb(6 78 59)" />
          </svg>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-1/2 bg-emerald-900 p-12 flex items-center justify-center relative">
          <div className="w-full max-w-sm">
            {/* Header */}
            <h2 className="text-4xl font-bold text-white mb-2">
              {view === 'login' && 'Welcome Back'}
              {view === 'register' && 'Create Account'}
              {view === 'forgot-password' && 'Reset Password'}
            </h2>
            <p className="text-emerald-200 text-sm mb-8">
              {view === 'login' && 'Sign in to access your dashboard'}
              {view === 'register' && 'Start your journey with us'}
              {view === 'forgot-password' && 'Enter your email to reset password'}
            </p>

            {/* Alerts */}
            {error && (
              <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-2xl text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-500/20 border border-green-500/50 text-green-200 p-3 rounded-2xl text-sm flex items-center gap-2">
                <CheckCircle size={16} /> {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {view === 'register' && (
                <>
                  <input
                    required
                    type="text"
                    placeholder="Full Name"
                    className="w-full px-6 py-4 bg-emerald-800/50 border border-emerald-700/50 text-white placeholder-emerald-300/50 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-400"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                  <input
                    required
                    type="text"
                    placeholder="Church / Ministry Name"
                    className="w-full px-6 py-4 bg-emerald-800/50 border border-emerald-700/50 text-white placeholder-emerald-300/50 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-400"
                    value={formData.churchName}
                    onChange={e => setFormData({ ...formData, churchName: e.target.value })}
                  />
                </>
              )}

              <input
                required
                type="email"
                placeholder="Enter your email"
                className="w-full px-6 py-4 bg-emerald-800/50 border border-emerald-700/50 text-white placeholder-emerald-300/50 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />

              {view !== 'forgot-password' && (
                <>
                  <input
                    required
                    type="password"
                    placeholder="Enter your password"
                    className="w-full px-6 py-4 bg-emerald-800/50 border border-emerald-700/50 text-white placeholder-emerald-300/50 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-400"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />

                  {view === 'login' && (
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 text-emerald-200 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-emerald-600 bg-emerald-800/50" />
                        <span>Remember Me</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setView('forgot-password')}
                        className="text-teal-300 hover:text-teal-200 transition"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </>
              )}

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? 'Processing...' : (
                  <>
                    {view === 'login' && 'Login to Dashboard'}
                    {view === 'register' && 'Create Account'}
                    {view === 'forgot-password' && 'Send Recovery Link'}
                  </>
                )}
              </button>
            </form>

            {/* Social Login */}
            {view === 'login' && (
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-emerald-700/50"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-emerald-900 text-emerald-300">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6 flex gap-4">
                  <button type="button" className="flex-1 bg-white/10 hover:bg-white/20 border border-emerald-700/50 p-3 rounded-full transition flex items-center justify-center">
                    <span className="text-white text-lg">G</span>
                  </button>
                  <button type="button" className="flex-1 bg-white/10 hover:bg-white/20 border border-emerald-700/50 p-3 rounded-full transition flex items-center justify-center">
                    <span className="text-white text-lg"></span>
                  </button>
                  <button type="button" className="flex-1 bg-white/10 hover:bg-white/20 border border-emerald-700/50 p-3 rounded-full transition flex items-center justify-center">
                    <span className="text-white text-lg">M</span>
                  </button>
                </div>
              </div>
            )}

            {/* Footer Links */}
            <div className="mt-8 text-center">
              {view === 'login' && (
                <p className="text-emerald-200 text-sm">
                  Don't have an account?{' '}
                  <button onClick={() => setView('register')} className="text-teal-300 hover:text-teal-200 font-semibold transition">
                    Sign Up
                  </button>
                </p>
              )}

              {view === 'register' && (
                <p className="text-emerald-200 text-sm">
                  Already have an account?{' '}
                  <button onClick={() => setView('login')} className="text-teal-300 hover:text-teal-200 font-semibold transition">
                    Sign In
                  </button>
                </p>
              )}

              {view === 'forgot-password' && (
                <button onClick={() => setView('login')} className="text-emerald-200 hover:text-white flex items-center justify-center gap-2 mx-auto transition">
                  <ArrowLeft size={16} /> Back to Login
                </button>
              )}

              <div className="mt-6 flex gap-4 justify-center text-xs text-emerald-400">
                <a href="#" className="hover:text-emerald-200 transition">Privacy Policy</a>
                <span>•</span>
                <a href="#" className="hover:text-emerald-200 transition">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
