import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Camera, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import LegalModal from './LegalModal';

const AuthScreen: React.FC = () => {
  const { login, register } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  
  // Legal Modal State
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | 'aup'>('terms');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage('Please enter a valid email address.');
      return;
    }

    try {
      if (mode === 'login') {
        if (password.length < 6) {
          setMessage('Password must be at least 6 characters.');
          return;
        }
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          setMessage('Passwords do not match.');
          return;
        }
        if (password.length < 6) {
          setMessage('Password must be at least 6 characters.');
          return;
        }
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCred.user, { displayName: name });
        }
      } else {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset link sent! Check your inbox.');
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'An error occurred during authentication.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Failed to sign in with Google.');
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

            {mode !== 'forgot' && (
              <div className="space-y-3 pb-3 border-b border-white/5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
                <div className="relative flex items-center justify-center pt-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700/50"></div></div>
                  <span className="relative px-2 bg-studio-dark/40 text-xs text-gray-500 uppercase tracking-widest font-medium">Or continue with email</span>
                </div>
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

            {/* Legal Links */}
            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-center gap-4 text-[11px] text-gray-500">
              <button 
                onClick={() => { setLegalTab('terms'); setLegalOpen(true); }}
                className="hover:text-gray-300 transition-colors"
              >
                Terms of Service
              </button>
              <span>&bull;</span>
              <button 
                onClick={() => { setLegalTab('privacy'); setLegalOpen(true); }}
                className="hover:text-gray-300 transition-colors"
              >
                Privacy Policy
              </button>
              <span>&bull;</span>
              <button 
                onClick={() => { setLegalTab('aup'); setLegalOpen(true); }}
                className="hover:text-gray-300 transition-colors"
              >
                Acceptable Use
              </button>
            </div>

          </div>
        </div>
      </div>

      <LegalModal 
        isOpen={legalOpen} 
        onClose={() => setLegalOpen(false)} 
        initialTab={legalTab} 
      />
    </div>
  );
};

export default AuthScreen;
