import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Activity, Eye, EyeOff, ArrowRight, Fingerprint, Mail, Key } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../utils/api'; // Added for the forgot password API calls

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Existing States
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // New States for Forgot Password flow
  const [view, setView] = useState('login'); // 'login' | 'email' | 'otp' | 'reset'
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // --- EXISTING LOGIN LOGIC ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Access Verified');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid Credentials');
    } finally {
      setLoading(false);
    }
  };

  // --- NEW FORGOT PASSWORD LOGIC ---
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!resetEmail) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
      toast.success('OTP sent to your email!');
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
      setView('login'); // Go back to login
      setForm({ ...form, password: '' }); // Clear password field just in case
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F1F5F9] font-sans overflow-hidden relative">
      
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(#64748b 0.8px, transparent 0.8px)`,
            backgroundSize: '32px 32px'
          }}
        />
        <motion.div
          animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-5%] left-[5%] w-[600px] h-[600px] bg-slate-200/40 rounded-full blur-[120px]"
        />
      </div>

      {/* Left Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="mb-10 w-28 h-28 bg-white shadow-lg rounded-[2.5rem] flex items-center justify-center"
          >
            <Activity className="text-[#475569] w-14 h-14" />
          </motion.div>

          <h1 className="text-[110px] font-black leading-none tracking-tighter text-[#1e293b]">
            MediCare
            <span className="block text-[#64748b]">HMS</span>
          </h1>

          <div className="h-2 bg-[#1e293b] mt-8 rounded-full opacity-20 w-28" />
        </motion.div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-20">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-[440px]"
        >
          <div className="bg-white/80 backdrop-blur-3xl rounded-[3.5rem] border border-white/50 p-12 shadow-xl">
            
            {/* Dynamic Header based on View */}
            <div className="mb-14 flex justify-between items-start">
              <div>
                <h3 className="text-4xl font-bold text-slate-900">
                  {view === 'login' && 'Login'}
                  {view === 'email' && 'Recovery'}
                  {view === 'otp' && 'Verify'}
                  {view === 'reset' && 'New Key'}
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  {view === 'login' ? 'Authorized Personnel Only' : 'System Access Recovery'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-300">
                {view === 'login' && <Fingerprint size={28} />}
                {view === 'email' && <Mail size={28} />}
                {view === 'otp' && <Key size={28} />}
                {view === 'reset' && <Fingerprint size={28} />}
              </div>
            </div>

            {/* --- VIEW 1: STANDARD LOGIN --- */}
            {view === 'login' && (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Email */}
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">
                    Identifier
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="xyz@gmail.com"
                    className="w-full py-3 bg-transparent border-b-2 border-slate-100 focus:border-slate-400 outline-none text-slate-800 text-lg"
                    required
                  />
                </div>

                {/* Password */}
                <div className="relative group">
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 block">
                      Access Key
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setView('email')}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wide"
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
                      className="w-full py-3 bg-transparent border-b-2 border-slate-100 focus:border-slate-400 outline-none text-slate-800 text-lg"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-0 bottom-3 text-slate-300 hover:text-slate-600"
                      onClick={() => setShowPwd(prev => !prev)}
                    >
                      {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-10 bg-[#1e293b] text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-lg disabled:opacity-60"
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
                    className="w-full py-3 bg-transparent border-b-2 border-slate-100 focus:border-slate-400 outline-none text-slate-800 text-lg"
                    required
                  />
                </div>

                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-10 bg-[#1e293b] text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-lg disabled:opacity-60"
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
                    maxLength="6"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="------"
                    className="w-full py-3 bg-transparent border-b-2 border-slate-100 focus:border-slate-400 outline-none text-slate-800 text-3xl tracking-[0.5em] text-center"
                    required
                  />
                </div>

                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-10 bg-[#1e293b] text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-lg disabled:opacity-60"
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
                      className="w-full py-3 bg-transparent border-b-2 border-slate-100 focus:border-slate-400 outline-none text-slate-800 text-lg"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-0 bottom-3 text-slate-300 hover:text-slate-600"
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
                  className="w-full mt-10 bg-[#1e293b] text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-lg disabled:opacity-60"
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
              {/* Show "Back to Login" if we are in the recovery flow */}
              {view !== 'login' && (
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-[0.15em] transition-colors"
                >
                  Return to Login
                </button>
              )}
              
              <Link
                to="/register"
                className="text-xs font-black text-slate-300 hover:text-slate-500 uppercase tracking-[0.15em]"
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