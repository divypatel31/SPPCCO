import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Lock, Mail, Phone, MapPin, Calendar, Briefcase, Award, X, ShieldCheck, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StaffProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/auth/my-profile');
        setProfile(res.data);
      } catch {
        toast.error('Could not load profile');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      const { data } = await api.post('/auth/change-password', passwords);
      toast.success(data.message || 'Password changed successfully!');
      setPasswords({ currentPassword: '', newPassword: '' });
      setShowPasswordForm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <Spinner />;

  const data = profile || {};

  return (
    // 🔥 FIX: Added px-4 sm:px-6 lg:px-8 for perfect side spacing
    <div className="max-w-6xl mx-auto pb-10 pt-6 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Clean Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Staff Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Official hospital staff credentials and account security</p>
      </motion.div>

      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Left Column: ID Badge */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-3xl font-bold mb-4 border-4 border-white shadow-sm">
              {(data.full_name || user?.name)?.[0]?.toUpperCase() || 'S'}
            </div>

            <h2 className="font-bold text-lg text-slate-900 mb-1">
              {data.full_name || user?.name}
            </h2>
            <p className="text-sm font-medium text-slate-500 mb-4 truncate px-2">
              {data.email || user?.email}
            </p>
            
            <div className="w-full space-y-2 mb-6">
              <div className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5">
                <ShieldCheck size={14} />
                {data.role || user?.role || 'Staff Member'}
              </div>
              {data.department && (
                <div className="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-100">
                  {data.department} Dept
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowPasswordForm(true)}
              className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 py-2.5 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors border border-slate-100 hover:border-blue-100"
            >
              <Lock size={16} />
              Update Password
            </button>
          </div>
        </motion.div>

        {/* Right Column: Information Cards */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 space-y-6">
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Official Credentials</h3>
              <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded text-center">Read Only</span>
            </div>

            <div className="p-6 md:p-8 grid md:grid-cols-2 gap-6">
              {[
                { icon: Briefcase, label: 'Designation', value: data.role || 'Staff' },
                { icon: Mail, label: 'Work Email', value: data.email },
                { icon: Phone, label: 'Contact Number', value: data.phone },
                { icon: Calendar, label: 'Date Joined', value: data.created_at ? formatDate(data.created_at) : '—' },
                { icon: User, label: 'Gender', value: data.gender },
                { icon: MapPin, label: 'Registered Address', value: data.address, fullWidth: true },
              ].map((item, idx) => (
                <div key={idx} className={`${item.fullWidth ? 'md:col-span-2' : ''}`}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <item.icon size={14} /> {item.label}
                  </p>
                  <div className={`text-sm font-medium text-slate-900 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 ${item.label.includes('Email') ? 'lowercase' : 'capitalize'}`}>
                    {item.value || 'Not Disclosed'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clean Password Update Form */}
          {showPasswordForm && (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Change System Password</h3>
                  <p className="text-slate-500 text-sm mt-0.5">Please ensure your new password is secure.</p>
                </div>
                <button onClick={() => setShowPasswordForm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Current Password</label>
                    <input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">New Password</label>
                    <input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowPasswordForm(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                  <button type="submit" disabled={savingPassword} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50">
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}