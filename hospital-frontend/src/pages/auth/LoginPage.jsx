import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Activity, Eye, EyeOff, ArrowRight, Fingerprint, Mail, Key, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../utils/api'; 

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Existing States
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // New States for Forgot Password & Force Reset flow
  const [view, setView] = useState('login'); // 'login' | 'email' | 'otp' | 'reset' | 'force_reset'
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // States for First-Time Login Reset
  const [userId, setUserId] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  // Timer states for Resend OTP
  const [timer, setTimer] = useState(0); 
  const [canResend, setCanResend] = useState(true); 

// --- EXISTING LOGIN LOGIC (WITH BULLETPROOF INTERCEPT) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await api.post('/auth/login', { 
        email: form.email, 
        password: form.password 
      }); 

      if (!res.data.token && !res.data.requirePasswordChange) {
        throw { 
          response: { 
            data: { message: res.data.message || "Invalid Email or Password." } 
          } 
        };
      }

      if (res.data?.requirePasswordChange) {
        toast('Security alert: Please set a secure password.', { icon: '🔒' });
        setUserId(res.data.user_id);
        setView('force_reset');
        setLoading(false);
        return;
      }

      login(res.data);
      toast.success('Access Verified');
      navigate('/dashboard', { replace: true });

    } catch (err) {
      console.error("Login Error:", err);
      
      if (err.response) {
        const backendMessage = err.response.data?.message;
        toast.error(backendMessage || "Invalid Email or Password.");
      } 
      else if (err.request) {
        toast.error("Cannot connect to server. Please check your connection.");
      } 
      else {
        toast.error("An unexpected error occurred. Please try again.");
      }
      
    } finally {
      setLoading(false);
    }
  };

  // --- FORCE PASSWORD RESET LOGIC ---
  const handleForceReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match!");
    }
    setLoading(true);
    try {
      await api.post('/auth/force-change-password', {
        user_id: userId,
        new_password: newPassword
      });
      toast.success('Secure key saved! You can now log in.');
      setView('login');
      setForm({ ...form, password: '' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update key");
    } finally {
      setLoading(false);
    }
  };

  // --- FORGOT PASSWORD LOGIC ---
  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!resetEmail) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
      toast.success('OTP sent to your email!');
      
      setTimer(120); 
      setCanResend(false); 

      setView('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Email not found');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error('Please enter the OTP');
    if (otp.length !== 6) return toast.error('OTP must be exactly 6 digits');

    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: resetEmail, otp });
      toast.success('OTP Verified!');
      setView('reset');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return toast.error('Please enter a new password');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: resetEmail, otp, newPassword });
      toast.success('System key updated successfully!');
      setView('login'); 
      setForm({ ...form, password: '' }); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update key');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen flex bg-slate-900 font-sans overflow-hidden relative">
      
      {/* 🔥 PREMIUM TRANSPARENT BACKGROUND 🔥 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop" 
          alt="Hospital Background" 
          className="w-full h-full object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-slate-900/70 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent"></div>
      </div>

      {/* Left Branding (Glowing Icon & Text) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="flex flex-col items-center text-center"
        >
          {/* Replaced image logo with a glowing Activity icon */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="mb-10 w-32 h-32 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[2.5rem] flex items-center justify-center overflow-hidden border border-white/20"
          >
            <Activity className="text-teal-400 w-16 h-16 drop-shadow-[0_0_15px_rgba(45,212,191,0.8)]" strokeWidth={2.5} />
          </motion.div>

          <h1 className="text-[110px] font-black leading-none tracking-tighter text-white drop-shadow-xl">
            MediCare
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">HMS</span>
          </h1>

          <div className="h-2 bg-gradient-to-r from-teal-400 to-emerald-300 mt-8 rounded-full w-28 opacity-80 shadow-[0_0_20px_rgba(45,212,191,0.5)]" />
        </motion.div>
      </div>

      {/* Right Login Panel (Frosted Glass) */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-20">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-[460px]"
        >
          {/* 🔥 FROSTED GLASS CARD 🔥 */}
          <div className="bg-white/90 backdrop-blur-2xl rounded-[3.5rem] border border-white/60 p-12 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            
            {/* Dynamic Header based on View */}
            <div className="mb-14 flex justify-between items-start">
              <div>
                <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                  {view === 'login' && 'Login'}
                  {view === 'email' && 'Recovery'}
                  {view === 'otp' && 'Verify'}
                  {view === 'reset' && 'New Key'}
                  {view === 'force_reset' && 'Secure Key'}
                </h3>
                <p className="text-slate-500 font-medium text-sm mt-1">
                  {view === 'login' ? 'Authorized Personnel Only' : 'System Access Recovery'}
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-2xl text-teal-600 shadow-inner border border-slate-200">
                {view === 'login' && <Fingerprint size={28} />}
                {view === 'email' && <Mail size={28} />}
                {view === 'otp' && <Key size={28} />}
                {view === 'reset' && <Fingerprint size={28} />}
                {view === 'force_reset' && <ShieldCheck size={28} />}
              </div>
            </div>

            {/* --- VIEW 1: STANDARD LOGIN --- */}
            {view === 'login' && (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="Enter your email"
                    className="w-full py-3 bg-transparent border-b-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 text-lg transition-colors placeholder:text-slate-300 font-medium"
                    required
                  />
                </div>

                <div className="relative group">
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 block">
                      Access Key
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setView('email')}
                      className="text-[10px] font-bold text-teal-600 hover:text-teal-700 uppercase tracking-wide transition-colors"
                    >
                      Lost Key?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full py-3 bg-transparent border-b-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 text-lg transition-colors placeholder:text-slate-300 font-medium"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-0 bottom-3 text-slate-400 hover:text-teal-600 transition-colors"
                      onClick={() => setShowPwd(prev => !prev)}
                    >
                      {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"  
                  disabled={loading}
                  className="w-full mt-10 bg-slate-900 text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-lg">Enter System</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </motion.button>
              </form>
            )}

            {/* --- VIEW 1.5: FORCE RESET (First Time Login) --- */}
            {view === 'force_reset' && (
              <form onSubmit={handleForceReset} className="space-y-8">
                <div className="text-center mb-6">
                  <p className="text-sm font-medium text-slate-500">Since this is your first time logging in, you must replace your temporary phone number password with a secure one.</p>
                </div>

                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">
                    New Secure Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="At least 8 chars + symbols"
                      className="w-full py-3 bg-transparent border-b-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 text-lg transition-colors placeholder:text-slate-300 font-medium"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-0 bottom-3 text-slate-400 hover:text-teal-600"
                      onClick={() => setShowPwd(prev => !prev)}
                    >
                      {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">
                    Confirm Secure Key
                  </label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-3 bg-transparent border-b-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 text-lg transition-colors placeholder:text-slate-300 font-medium"
                    required
                  />
                </div>

                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-10 bg-slate-900 text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-lg">Save & Return to Login</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </motion.button>
              </form>
            )}

            {/* --- VIEW 2: ENTER EMAIL FOR OTP --- */}
            {view === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-8">
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">
                    Registered Identifier
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full py-3 bg-transparent border-b-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 text-lg transition-colors placeholder:text-slate-300 font-medium"
                    required
                  />
                </div>

                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-10 bg-slate-900 text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-lg">Transmit OTP</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </motion.button>
              </form>
            )}

            {/* --- VIEW 3: VERIFY OTP --- */}
            {view === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-8">
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block text-center">
                    6-Digit Security Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="6"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} 
                    placeholder="------"
                    className="w-full py-3 bg-transparent border-b-2 border-teal-500 focus:border-teal-600 outline-none text-slate-900 text-3xl tracking-[0.5em] text-center font-bold"
                    required
                  />
                </div>

                <div className="text-center mt-4 text-sm font-medium">
                  <span className="text-slate-500">Didn't receive the code? </span>
                  {canResend ? (
                    <button
                      type="button"
                      onClick={(e) => handleSendOtp(e)}
                      className="font-bold text-teal-600 hover:text-teal-800 transition-colors"
                    >
                      Resend OTP
                    </button>
                  ) : (
                    <span className="font-bold text-slate-400 cursor-not-allowed">
                      Resend in {formatTime(timer)}
                    </span>
                  )}
                </div>

                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-slate-900 text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-lg">Verify Code</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </motion.button>
              </form>
            )}

            {/* --- VIEW 4: RESET PASSWORD --- */}
            {view === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-8">
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">
                    New Access Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-3 bg-transparent border-b-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 text-lg transition-colors placeholder:text-slate-300 font-medium"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-0 bottom-3 text-slate-400 hover:text-teal-600 transition-colors"
                      onClick={() => setShowPwd(prev => !prev)}
                    >
                      {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-10 bg-slate-900 text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-lg">Secure New Key</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </motion.button>
              </form>
            )}

            {/* Bottom Links Container */}
            <div className="mt-14 flex flex-col items-center gap-4 text-center">
              {view !== 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setTimer(0); 
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-[0.15em] transition-colors"
                >
                  Return to Login
                </button>
              )}
              
              <Link
                to="/register"
                className="text-[11px] font-black text-slate-400 hover:text-teal-600 uppercase tracking-[0.2em] transition-colors"
              >
                Request Access Profile
              </Link>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}