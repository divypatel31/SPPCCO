import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/common';
import { UserPlus, Mail, Phone, Calendar, MapPin, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

export default function RegisterPatient() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', gender: '', dob: '', address: '', password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', { ...form, role: 'patient' });
      toast.success('Patient registered successfully!');
      navigate('/receptionist/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="p-4 sm:p-8 max-w-[1000px] mx-auto font-sans">
      
      <motion.div variants={FADE_UP_SPRING} className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Onboard New Patient</h1>
        <p className="text-slate-500 font-medium mt-1">Create a new secure profile for a walk-in or calling patient.</p>
      </motion.div>

      <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
        
        <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex items-center gap-3">
          <ShieldCheck className="text-violet-500" size={20} />
          <h2 className="text-base font-semibold text-slate-800 tracking-tight">Identity & Credentials</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Full Legal Name *</label>
              <div className="relative">
                <UserPlus size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type="text" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all" placeholder="e.g. John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Email Address *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type="email" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all" placeholder="patient@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Phone Number *</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type="tel" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Gender *</label>
                <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all appearance-none" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Date of Birth *</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input required type="date" className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Residential Address</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-4 text-slate-400" />
                <textarea className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all resize-none min-h-[80px]" placeholder="Full address..." value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>

            <div className="sm:col-span-2 pt-4 border-t border-slate-100">
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Temporary Password *</label>
              <div className="relative max-w-sm">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type="password" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium outline-none transition-all" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">The patient will use this to log into the portal. They can change it later.</p>
            </div>
          </div>

          <div className="pt-6">
            <button type="submit" disabled={loading} className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-white rounded-xl font-medium shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={18} />}
              {loading ? 'Creating Profile...' : 'Deploy Patient Profile'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}