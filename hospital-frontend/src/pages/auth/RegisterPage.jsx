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
    <div className="min-h-screen bg-[#F1F5F9] font-sans overflow-x-hidden relative flex items-center justify-center p-6">
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: `radial-gradient(#64748b 0.5px, transparent 0.5px)`,
            backgroundSize: '30px 30px'
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px]"
        />
      </div>

      <div className="w-full max-w-3xl relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-8 ml-2"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1e293b] flex items-center justify-center shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black text-[#1e293b] uppercase">
            MediCare <span className="text-blue-600">HMS</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-white p-8 lg:p-12 shadow-xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="group p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
              <div>
                <h2 className="text-3xl font-bold text-slate-800">Registration</h2>
                <p className="text-slate-500 text-sm">Join the healthcare network</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
              <ShieldCheck className="text-blue-600 w-4 h-4" />
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
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
                { label: 'Phone Number', name: 'phone', type: 'text', placeholder: '+91 9876543210' },
                { label: 'Date of Birth', name: 'dob', type: 'date' },
                { label: 'Gender', name: 'gender', type: 'select', options: ['Male', 'Female', 'Other'] },
                { label: 'Residential Address', name: 'address', type: 'text', placeholder: 'City, Country', optional: true },
                { label: 'Password', name: 'password', type: 'password', placeholder: '••••••••' },
                { label: 'Confirm Password', name: 'confirmPassword', type: 'password', placeholder: '••••••••' }
              ].map(field => (
                <motion.div key={field.name} variants={itemVariants} className="group">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-blue-600 transition-colors">
                    {field.label}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      required
                      className="w-full py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-500 outline-none text-slate-800"
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
                      // For phone, only allow numbers
                      onChange={e => {
                        if (field.name === 'phone') {
                          e.target.value = e.target.value.replace(/\D/g, '');
                        }
                        handleChange(e);
                      }}
                      placeholder={field.placeholder}
                      required={!field.optional}
                      max={field.type === 'date' ? todayDate : undefined}
                      className="w-full py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-500 outline-none text-slate-800 placeholder-slate-300"
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
              className="w-full mt-12 bg-[#1e293b] hover:bg-[#334155] text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl disabled:opacity-60"
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
              className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors"
            >
              Already have a profile? Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}