import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Camera, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';

const AuthScreen: React.FC = () => {
  const { login, register } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage('Please enter a valid email address.');
      return;
    }

    if (mode === 'login') {
      if (password.length < 6) {
        setMessage('Password must be at least 6 characters.');
        return;
      }
      login(email);
    } else if (mode === 'register') {
      if (password !== confirmPassword) {
        setMessage('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setMessage('Password must be at least 6 characters.');
        return;
      }
      register(email);
    } else {
      setMessage('Password reset link sent! Check your inbox.');
      setTimeout(() => setMode('login'), 3000);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4 overflow-hidden relative font-sans">
      {/* Dynamic Glow Circles */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[100px] top-1/4 left-1/4 animate-pulse-glow" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-pink-500/10 blur-[100px] bottom-1/4 right-1/4 animate-pulse-glow" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-5xl h-[580px] grid grid-cols-1 md:grid-cols-12 rounded-3xl overflow-hidden glass-panel shadow-2xl relative z-10 animate-slide-up">
        {/* Left Side: Brand Promo / Visuals */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-purple-900/40 via-purple-950/60 to-studio-darker relative flex-col justify-between p-8 border-r border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Camera className="text-white h-5.5 w-5.5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-300 to-pink-200 bg-clip-text text-transparent">SnapBeauty</span>
          </div>

          <div className="my-auto space-y-6">
            <h1 className="text-3xl font-extrabold text-white leading-tight">
              Unleash the Power of <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">AI Beauty Filters</span>
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              Enhance videos in real-time, adjust facial symmetry, polish skin tones, and whitening smiles instantly. SnapBeauty Studio brings professional studio-quality filters to desktop video editing.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-gray-300">
                <div className="h-5 w-5 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">✓</div>
                <span>Real-time GPU Face Mesh Tracking</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-300">
                <div className="h-5 w-5 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">✓</div>
                <span>One-click AI Auto-Beautification</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-300">
                <div className="h-5 w-5 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">✓</div>
                <span>Community Preset Lens Marketplace</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-gray-500">
            Powered by MediaPipe & GFPGAN • Version 1.0.0
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div className="col-span-12 md:col-span-7 flex flex-col justify-center p-8 md:p-12 bg-studio-dark/40">
          <div className="w-full max-w-md mx-auto space-y-6">
            <div className="space-y-2 text-center md:text-left">
              {mode === 'login' && (
                <>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
                  <p className="text-sm text-gray-400">Sign in to continue editing your masterpieces.</p>
                </>
              )}
              {mode === 'register' && (
                <>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
                  <p className="text-sm text-gray-400">Start transforming your beauty clips today.</p>
                </>
              )}
              {mode === 'forgot' && (
                <>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Reset Password</h2>
                  <p className="text-sm text-gray-400">Enter your email to receive a password reset link.</p>
                </>
              )}
            </div>

            {message && (
              <div className="p-3 text-xs rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-center">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">Display Name</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-gray-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-gray-500"
                    required
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-gray-400 font-medium">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setMessage(''); }}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-gray-500"
                      required
                    />
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-gray-500"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all"
              >
                <span>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'forgot' && 'Send Recovery Email'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 pt-2">
              {mode === 'login' ? (
                <>
                  <span>New to SnapBeauty?</span>
                  <button
                    onClick={() => { setMode('register'); setMessage(''); }}
                    className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                  >
                    Create account
                  </button>
                </>
              ) : (
                <>
                  <span>Already have an account?</span>
                  <button
                    onClick={() => { setMode('login'); setMessage(''); }}
                    className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
