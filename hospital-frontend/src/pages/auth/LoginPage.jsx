import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Activity, Eye, EyeOff, ArrowRight, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

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
            
            <div className="mb-14 flex justify-between items-start">
              <div>
                <h3 className="text-4xl font-bold text-slate-900">Login</h3>
                <p className="text-slate-400 text-sm mt-1">Authorized Personnel Only</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-300">
                <Fingerprint size={28} />
              </div>
            </div>

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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">
                  Access Key
                </label>
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

            <div className="mt-14 text-center">
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