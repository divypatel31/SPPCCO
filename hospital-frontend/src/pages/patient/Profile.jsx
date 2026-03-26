import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { User, Save, Lock, Mail, Phone, MapPin, Calendar, Activity, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PatientProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', dob: '', gender: '', address: '' });
  const [editing, setEditing] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/patient/profile');
        const formattedDob = res.data.dob ? res.data.dob.split('T')[0] : '';
        setProfile(res.data);
        setForm({
          full_name: res.data.full_name || '',
          phone: res.data.phone || '',
          dob: formattedDob,
          gender: res.data.gender || '',
          address: res.data.address || ''
        });
      } catch {
        toast.error('Could not load profile');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/patient/profile', form);
      setProfile({ ...profile, ...form });
      toast.success('Profile updated!');
      setEditing(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

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
    <div className="max-w-5xl mx-auto pb-10 pt-6 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Clean Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your personal information and account security</p>
      </motion.div>

      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Left Column: Avatar Card */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-3xl font-bold mb-4">
              {(data.full_name || user?.name)?.[0]?.toUpperCase() || 'P'}
            </div>
            
            <h2 className="font-bold text-lg text-slate-900 truncate mb-1">{data.full_name || user?.name}</h2>
            <p className="text-sm text-slate-500 mb-4 truncate px-2">{data.email || user?.email}</p>
            
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-md">Patient</span>
              <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider rounded-md">Verified</span>
            </div>

            <button 
              onClick={() => setShowPasswordForm(true)}
              className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 py-2.5 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors border border-slate-100"
            >
              <Lock size={16} /> Update Password
            </button>
          </div>
        </motion.div>

        {/* Right Column: Information */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 space-y-6">
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800">
                <Activity size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wider">Personal Information</h3>
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-1.5 rounded-lg transition-colors">Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="text-sm font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50">
                    <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 md:p-8 grid md:grid-cols-2 gap-6">
              {[
                { icon: User, label: 'Full Name', value: data.full_name, readOnly: true },
                { icon: Mail, label: 'Email Address', value: data.email || user?.email, readOnly: true },
                { icon: Calendar, label: 'Date of Birth', value: data.dob ? formatDate(data.dob) : '—', readOnly: true },
                { icon: Activity, label: 'Gender', value: data.gender, readOnly: true },
              ].map((item, idx) => (
                <div key={idx}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <item.icon size={14} /> {item.label}
                  </p>
                  <p className={`text-sm font-medium text-slate-900 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 ${item.label.includes('Email') ? 'lowercase' : 'capitalize'}`}>{item.value || '—'}</p>
                </div>
              ))}

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Phone size={14} /> Phone Number
                </p>
                {editing ? (
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                ) : (
                  <p className="text-sm font-medium text-slate-900 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">{data.phone || '—'}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <MapPin size={14} /> Physical Address
                </p>
                {editing ? (
                  <textarea rows="2" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                ) : (
                  <p className="text-sm font-medium text-slate-900 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">{data.address || '—'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Clean Password Update Form */}
          {showPasswordForm && (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Change Account Password</h3>
                  <p className="text-slate-500 text-sm mt-0.5">Enter your current password to set a new one</p>
                </div>
                <button onClick={() => setShowPasswordForm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handlePasswordChange} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Current Password</label>
                    <input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">New Password</label>
                    <input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowPasswordForm(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                  <button type="submit" disabled={savingPassword} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50">
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