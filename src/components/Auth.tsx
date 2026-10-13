import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User, Lock, Mail, ArrowRight, Building2, AlertCircle, CheckCircle, ArrowLeft, Sparkles, MessageCircle } from 'lucide-react';
import logoImage from '../logo.png';

interface AuthProps {
  onLogin: () => void;
  initialView?: AuthView;
  onBackToLanding?: () => void;
}

type AuthView = 'login' | 'register' | 'forgot-password';

const Auth: React.FC<AuthProps> = ({ onLogin, initialView = 'login', onBackToLanding }) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    phone: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [deploymentSubmitted, setDeploymentSubmitted] = useState(false);

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
          setError(result.message || 'Login failed. Please verify your credentials or contact your administrator.');
        }
      }
      else if (view === 'register') {
        // Gated Enterprise Deployment Request - captures lead without giving unauthorized free access
        try {
          const existing = JSON.parse(localStorage.getItem('shepherd_deployment_leads') || '[]');
          existing.push({
            fullName: formData.name,
            companyName: formData.companyName,
            email: formData.email,
            phone: formData.phone,
            notes: formData.notes,
            submittedAt: new Date().toISOString()
          });
          localStorage.setItem('shepherd_deployment_leads', JSON.stringify(existing));
        } catch (err) {
          console.error(err);
        }
        setDeploymentSubmitted(true);
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 flex items-center justify-center p-3 sm:p-4 md:p-6 py-6 md:py-10 relative overflow-x-hidden">
      {/* Blurred background circles */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Card */}
      <div className="relative w-full max-w-5xl md:h-[620px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto">

        {/* Top/Left Side - Logo Showcase */}
        <div className="relative w-full md:w-1/2 bg-white p-4 sm:p-6 md:p-8 flex flex-col justify-center items-center shrink-0">
          {/* Logo with Float Animation */}
          <div className="flex items-center justify-center py-2 md:py-0">
            <img src={logoImage} alt="Shepherd AI" className="w-24 h-24 sm:w-32 sm:h-32 md:w-80 md:h-80 object-contain animate-float" />
          </div>

          {/* Footer - Desktop only */}
          <div className="text-xs text-slate-400 mt-2 md:mt-auto hidden md:block">
            © 2025 Shepherd AI. All rights reserved.
          </div>
        </div>

        {/* Organic Wave Divider - Hidden on mobile */}
        <div className="hidden md:block absolute top-0 left-1/2 h-full w-24 -ml-12 z-10 pointer-events-none">
          <svg viewBox="0 0 100 700" className="h-full w-full" preserveAspectRatio="none">
            <path d="M0,0 Q50,175 0,350 T0,700 L100,700 L100,0 Z" fill="rgb(6 78 59)" />
          </svg>
        </div>

        {/* Bottom/Right Side - Form Container */}
        <div className="w-full md:w-1/2 bg-emerald-900 p-5 sm:p-8 md:p-10 flex flex-col justify-center items-center relative overflow-y-auto">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              type="button"
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-sm"
            >
              <ArrowLeft size={13} /> Back to Website
            </button>
          )}

          <div className="w-full max-w-sm">
            {/* Gated Deployment Success State */}
            {view === 'register' && deploymentSubmitted ? (
              <div className="text-center py-2 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-teal-400/20 border-2 border-teal-400 flex items-center justify-center text-teal-300 mx-auto mb-3">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  Deployment Request Logged
                </h3>
                <p className="text-xs text-emerald-200 mb-4 leading-relaxed">
                  Thank you, <span className="text-white font-semibold">{formData.name}</span>. Your deployment intake for <span className="text-white font-semibold">{formData.companyName}</span> has been received. Our Senior Solutions Architect will connect within 2 hours.
                </p>

                <div className="p-3 bg-emerald-950/70 border border-emerald-500/30 rounded-2xl mb-4 text-left text-[11px] text-emerald-200 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1">
                    <Sparkles size={12} className="text-teal-400" /> Next Provisioning Steps:
                  </div>
                  <div>• Dedicated tenant isolation & custom URL setup</div>
                  <div>• Live inventory catalog / webhook integration</div>
                  <div>• Authorized login credentials issued upon contract execution</div>
                </div>

                <a
                  href={`https://wa.me/2348137592915?text=${encodeURIComponent(
                    `Hello Shepherd AI, I just requested an enterprise deployment for ${formData.companyName} (${formData.name}, ${formData.phone}). I would like to expedite our deployment.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <MessageCircle size={15} />
                  <span>Chat with Technical Lead on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setDeploymentSubmitted(false);
                    setView('login');
                  }}
                  className="mt-3 text-xs text-emerald-300 hover:text-white transition"
                >
                  ← Return to Client Login
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                  {view === 'login' && 'Enterprise Client Portal'}
                  {view === 'register' && 'Request Dedicated Deployment'}
                  {view === 'forgot-password' && 'Reset Password'}
                </h2>
                <p className="text-emerald-200 text-xs mb-4 sm:mb-5">
                  {view === 'login' && 'Sign in to access your business concierge dashboard'}
                  {view === 'register' && 'Shepherd AI instances are provisioned exclusively for verified clients.'}
                  {view === 'forgot-password' && 'Enter your authorized email to reset password'}
                </p>

                {/* Alerts */}
                {error && (
                  <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-200 p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" /> <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="mb-4 bg-green-500/20 border border-green-500/50 text-green-200 p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2">
                    <CheckCircle size={16} className="shrink-0" /> <span>{success}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">

                  {view === 'register' ? (
                    <>
                      <input
                        required
                        type="text"
                        placeholder="Your Full Name"
                        className="w-full px-5 py-2.5 sm:py-3 bg-emerald-800/50 border border-emerald-700/50 text-white placeholder-emerald-300/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                      <input
                        required
                        type="text"
                        placeholder="Company / Fleet Name (e.g. Rentigram)"
                        className="w-full px-5 py-2.5 sm:py-3 bg-emerald-800/50 border border-emerald-700/50 text-white placeholder-emerald-300/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        value={formData.companyName}
                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      />
                      <input
                        required
                        type="email"
                        placeholder="Work Email"
                        className="w-full px-5 py-2.5 sm:py-3 bg-emerald-800/50 border border-emerald-700/50 text-white placeholder-emerald-300/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                      <input
                        required
                        type="tel"
                        placeholder="WhatsApp Phone (+234...)"
                        className="w-full px-5 py-2.5 sm:py-3 bg-emerald-800/50 border border-emerald-700/50 text-white placeholder-emerald-300/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </>
                  ) : (
                    <>
                      <input
                        required
                        type="email"
                        placeholder="Enter your authorized email"
                        className="w-full px-5 py-2.5 sm:py-3 bg-emerald-800/50 border border-emerald-700/50 text-white placeholder-emerald-300/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />

                      {view !== 'forgot-password' && (
                        <>
                          <input
                            required
                            type="password"
                            placeholder="Enter your password"
                            className="w-full px-5 py-2.5 sm:py-3 bg-emerald-800/50 border border-emerald-700/50 text-white placeholder-emerald-300/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                          />

                          <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
                            <label className="flex items-center gap-1.5 text-emerald-200 cursor-pointer">
                              <input type="checkbox" className="w-3.5 h-3.5 rounded border-emerald-600 bg-emerald-800/50" />
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
                        </>
                      )}
                    </>
                  )}

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-2.5 sm:py-3 rounded-full text-sm sm:text-base transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-2"
                  >
                    {loading ? 'Processing...' : (
                      <>
                        {view === 'login' && 'Login to Dashboard'}
                        {view === 'register' && 'Submit Deployment Request'}
                        {view === 'forgot-password' && 'Send Recovery Link'}
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Gating Links */}
                <div className="mt-5 sm:mt-6 text-center">
                  {view === 'login' && (
                    <div className="pt-3 border-t border-emerald-800/60">
                      <p className="text-emerald-300/90 text-xs">
                        Need a dedicated deployment for your company?
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setView('register');
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-teal-300 hover:text-white px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition"
                      >
                        <span>Request Custom Deployment</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {view === 'register' && (
                    <p className="text-emerald-200 text-xs sm:text-sm pt-2">
                      Already an authorized client?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setView('login');
                        }}
                        className="text-teal-300 hover:text-teal-200 font-bold underline transition"
                      >
                        Sign In Here
                      </button>
                    </p>
                  )}

                  {view === 'forgot-password' && (
                    <button
                      type="button"
                      onClick={() => setView('login')}
                      className="text-emerald-200 hover:text-white flex items-center justify-center gap-2 mx-auto text-xs sm:text-sm transition pt-2"
                    >
                      <ArrowLeft size={14} /> Back to Login
                    </button>
                  )}

                  <div className="mt-4 flex gap-3 justify-center text-[10px] sm:text-xs text-emerald-400">
                    <a href="#" className="hover:text-emerald-200 transition">Privacy Policy</a>
                    <span>•</span>
                    <a href="#" className="hover:text-emerald-200 transition">Terms of Service</a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
