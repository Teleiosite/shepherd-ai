
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User, Lock, Mail, ArrowRight, Building2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-primary-600 p-8 text-center">
          <img src="/logo.png" alt="Shepherd AI" className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Shepherd AI</h1>
          <p className="text-primary-100">Church Follow-up & Discipleship System</p>
        </div>

        {/* Form Container */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-800">
              {view === 'login' && 'Welcome Back'}
              {view === 'register' && 'Create Account'}
              {view === 'forgot-password' && 'Recover Password'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {view === 'login' && 'Sign in to access your dashboard'}
              {view === 'register' && 'Start automating your follow-up today'}
              {view === 'forgot-password' && 'Enter your email to reset password'}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle size={16} /> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {view === 'register' && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    required
                    type="text"
                    placeholder="Full Name"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    required
                    type="text"
                    placeholder="Church / Ministry Name"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.churchName}
                    onChange={e => setFormData({ ...formData, churchName: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                required
                type="email"
                placeholder="Email Address"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {view !== 'forgot-password' && (
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  required
                  type="password"
                  placeholder="Password"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? 'Processing...' : (
                <>
                  {view === 'login' && 'Sign In'}
                  {view === 'register' && 'Create Account'}
                  {view === 'forgot-password' && 'Send Recovery Link'}
                  {!loading && view !== 'forgot-password' && <ArrowRight size={18} />}
                </>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3 text-center">
            {view === 'login' && (
              <>
                <button onClick={() => setView('forgot-password')} className="text-sm text-slate-500 hover:text-primary-600 transition-colors">
                  Forgot Password?
                </button>
                <div className="text-sm text-slate-600">
                  Don't have an account? <button onClick={() => setView('register')} className="text-primary-600 font-bold hover:underline">Create Account</button>
                </div>
              </>
            )}

            {view === 'register' && (
              <div className="text-sm text-slate-600">
                Already have an account? <button onClick={() => setView('login')} className="text-primary-600 font-bold hover:underline">Sign In</button>
              </div>
            )}

            {view === 'forgot-password' && (
              <button onClick={() => setView('login')} className="text-sm text-slate-600 hover:text-primary-600 flex items-center justify-center gap-2 font-medium">
                <ArrowLeft size={16} /> Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
