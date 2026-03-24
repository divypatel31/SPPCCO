import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Activity, ArrowLeft, UserPlus, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);

  const todayDate = new Date().toISOString().split('T')[0];

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔥 VALIDATION 1: Phone number exactly 10 digits
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(form.phone)) {
      toast.error('Phone number must be exactly 10 digits');
      document.getElementsByName('phone')[0]?.focus(); // Cursor jumps to Phone
      return;
    }

    // 🔥 VALIDATION 2: Strong Password Check
    const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!strongPwdRegex.test(form.password)) {
      toast.error('Password is weak! Needs 8+ chars, upper, lower, number & symbol (@$!%*?&#)');
      document.getElementsByName('password')[0]?.focus(); // Cursor jumps to Password
      return;
    }

    // 🔥 VALIDATION 3: Passwords must match
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      document.getElementsByName('confirmPassword')[0]?.focus(); // Cursor jumps to Confirm Password
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...payload } = form;

      await register({
        ...payload,
        role: 'patient'
      });

      toast.success('Account created successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
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

      {/* Right Registration Panel (Frosted Glass - Scrollable if needed) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative z-20 h-screen overflow-y-auto py-12">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-[600px] my-auto"
        >
          {/* 🔥 FROSTED GLASS CARD 🔥 */}
          <div className="bg-white/90 backdrop-blur-2xl rounded-[3.5rem] border border-white/60 p-8 sm:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="group p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 transition-all shadow-inner"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </Link>
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Registration</h2>
                  <p className="text-slate-500 text-sm font-medium">Join the healthcare network</p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-xl border border-teal-100 shadow-sm">
                <ShieldCheck className="text-teal-600 w-4 h-4" />
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">
                  Secure Enrollment
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6"
              >
                {[
                  { label: 'Full Name', name: 'name', type: 'text', placeholder: 'John Doe' },
                  { label: 'Email Address', name: 'email', type: 'email', placeholder: 'john@example.com' },
                  { label: 'Phone Number', name: 'phone', type: 'text', placeholder: '9876543210' },
                  { label: 'Date of Birth', name: 'dob', type: 'date' },
                  { label: 'Gender', name: 'gender', type: 'select', options: ['Male', 'Female', 'Other'] },
                  { label: 'Residential Address', name: 'address', type: 'text', placeholder: 'City, Country', optional: true },
                  { label: 'Password', name: 'password', type: 'password', placeholder: '••••••••' },
                  { label: 'Confirm Password', name: 'confirmPassword', type: 'password', placeholder: '••••••••' }
                ].map(field => (
                  <motion.div key={field.name} variants={itemVariants} className="group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-teal-600 transition-colors">
                      {field.label}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        name={field.name}
                        value={form[field.name]}
                        onChange={handleChange}
                        required
                        className="w-full py-3 bg-transparent border-b-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 text-sm sm:text-base font-medium transition-colors cursor-pointer"
                      >
                        <option value="">Select {field.label}</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt.toLowerCase()}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name={field.name}
                        type={field.type}
                        value={form[field.name]}
                        onChange={e => {
                          if (field.name === 'phone') {
                            e.target.value = e.target.value.replace(/\D/g, '');
                          }
                          handleChange(e);
                        }}
                        placeholder={field.placeholder}
                        required={!field.optional}
                        max={field.type === 'date' ? todayDate : undefined}
                        className="w-full py-3 bg-transparent border-b-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 text-sm sm:text-base font-medium transition-colors placeholder-slate-400"
                      />
                    )}
                  </motion.div>
                ))}
              </motion.div>

              <motion.button
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full mt-10 bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all disabled:opacity-60"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="text-lg">Initialize Profile</span>
                    <UserPlus size={20} />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-8 flex justify-center">
              <Link
                to="/login"
                className="text-[11px] font-black text-slate-400 hover:text-teal-600 uppercase tracking-[0.2em] transition-colors"
              >
                Already have a profile? Sign In
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}