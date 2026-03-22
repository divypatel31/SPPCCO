import React, { useState } from 'react';
import { PageHeader } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { UserPlus, CheckCircle, ShieldCheck, Mail, Phone, Calendar, MapPin, User, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animation Variants ---
const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.6 } }
};

export default function RegisterPatient() {
  const [form, setForm] = useState({
    name: '', phone: '', dob: '', gender: '', address: '', email: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [created, setCreated] = useState(null);

  const todayDate = new Date().toISOString().split('T')[0];

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🔥 Check fields one by one and MOVE CURSOR to the empty/wrong one
    if (!form.name.trim()) {
      toast.error('Please enter full name');
      document.getElementsByName('name')[0]?.focus();
      return;
    }
    
    if (!form.phone || !/^[0-9]{10}$/.test(form.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      document.getElementsByName('phone')[0]?.focus();
      return;
    }

    if (!form.dob) {
      toast.error('Please select Date of Birth');
      document.getElementsByName('dob')[0]?.focus();
      return;
    }

    if (!form.gender) {
      toast.error('Please select gender');
      document.getElementsByName('gender')[0]?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/receptionist/register-patient', {
        ...form,
        password: form.phone, // default password = phone number
      });
      setCreated(res.data);
      setSuccess(true);
      setForm({ name: '', phone: '', dob: '', gender: '', address: '', email: '' });
      toast.success('Patient registered successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" className="p-4 sm:p-8 max-w-[900px] mx-auto font-sans">
      <motion.div variants={FADE_UP}>
        <PageHeader title="Register Walk-in Patient" subtitle="Create a new patient account and EMR profile for walk-in visits." />
      </motion.div>

      <AnimatePresence mode="wait">
        {success && created ? (
          // --- SUCCESS STATE UI ---
          <motion.div 
            key="success-card"
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-50 border border-emerald-100 rounded-[24px] p-8 sm:p-12 text-center shadow-sm"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-200/60">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-semibold text-emerald-900 tracking-tight">Patient Registered Successfully!</h2>
            <p className="text-emerald-700 mt-2 font-medium text-lg">
              A profile for <span className="font-bold text-emerald-900">{created.name}</span> has been securely generated.
            </p>
            
            <div className="mt-8 bg-white border border-emerald-200/60 rounded-2xl p-5 inline-block text-left shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500"/> Access Credentials
              </p>
              <p className="text-sm text-slate-700 font-medium flex items-center gap-2">
                Default Password: <span className="font-mono bg-slate-100 text-slate-800 px-3 py-1 rounded-md font-bold tracking-wider">{form.phone || 'Phone Number'}</span>
              </p>
            </div>

            <div className="mt-10">
              <button 
                onClick={() => setSuccess(false)} 
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-xl font-medium shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] hover:bg-slate-800 transition-all"
              >
                Register Another Patient <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        ) : (
          // --- FORM UI ---
          <motion.div key="form-card" variants={FADE_UP} className="bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
            
            <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex items-center gap-3">
              <UserPlus className="text-violet-500" size={20} />
              <h2 className="text-base font-semibold text-slate-800 tracking-tight">Demographic Information</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Full Legal Name *</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      name="name" 
                      type="text" 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all" 
                      placeholder="e.g. John Doe" 
                      value={form.name} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Mobile Number *</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      name="phone" 
                      type="text" 
                      maxLength="10"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all" 
                      placeholder="10-digit number" 
                      value={form.phone} 
                      onChange={e => {
                        // Instantly block letters in the phone box
                        e.target.value = e.target.value.replace(/\D/g, '');
                        handleChange(e);
                      }} 
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Date of Birth *</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      name="dob" 
                      type="date" 
                      max={todayDate}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all cursor-text" 
                      value={form.dob} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Gender *</label>
                  <select 
                    name="gender" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all appearance-none cursor-pointer" 
                    value={form.gender} 
                    onChange={handleChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Email Address (Optional)</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      name="email" 
                      type="email" 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all" 
                      placeholder="patient@example.com" 
                      value={form.email} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Residential Address</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-4 text-slate-400" />
                    <textarea 
                      name="address" 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all resize-none min-h-[100px]" 
                      placeholder="Full street address..." 
                      value={form.address} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>
              </div>

              {/* Default Password Hint */}
              <div className="p-4 bg-amber-50/50 border border-amber-100/60 rounded-2xl flex items-start gap-3">
                <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600 shrink-0 mt-0.5"><ShieldCheck size={16}/></div>
                <p className="text-[13px] text-amber-800 font-medium leading-relaxed">
                  The patient's default login password will be set to their <span className="font-bold">phone number</span>. Advise them to change it after their first login for security.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full sm:w-auto px-8 py-3.5 bg-violet-600 text-white rounded-xl font-semibold shadow-[0_4px_20px_-4px_rgba(139,92,246,0.4)] hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <UserPlus size={18} />
                  )}
                  {loading ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}