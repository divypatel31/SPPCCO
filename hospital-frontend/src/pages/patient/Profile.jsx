import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Spinner, PageHeader } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { User, Save, Lock } from 'lucide-react';

export default function PatientProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', dob: '', gender: '', address: '' });
  const [editing, setEditing] = useState(false);

  // --- Password Change States ---
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/patient/profile');
        // Format date for the date input field
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

  // --- Password Change Handler ---
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      const { data } = await api.post('/auth/change-password', passwords);
      toast.success(data.message || 'Password changed successfully!');
      setPasswords({ currentPassword: '', newPassword: '' });
      setShowPasswordForm(false); // Hide form after success
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <Spinner />;

  const data = profile || {};

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View and update your personal information" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avatar card */}
        <div className="card text-center flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold mx-auto mb-4">
            {(data.full_name || user?.name)?.[0]?.toUpperCase() || 'P'}
          </div>

          <p className="font-semibold text-gray-900 text-lg">
            {data.full_name || user?.name}
          </p>

          <p className="text-sm text-gray-500">
            {data.email || user?.email}
          </p>

          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium mb-6">
            Patient
          </span>

          {/* Change Password Button inside Avatar Card */}
          {!showPasswordForm && (
            <button 
              onClick={() => setShowPasswordForm(true)}
              className="mt-auto flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 border border-gray-300 hover:border-blue-600 px-4 py-2 rounded transition-colors"
            >
              <Lock size={16} />
              Change Password
            </button>
          )}
        </div>

        {/* Info card */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Personal Information</h2>

              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-secondary text-sm"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary text-sm flex items-center gap-1"
                  >
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">

              {/* Full Name (Read-only) */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Full Name</p>
                <p className="text-sm font-medium text-gray-900">
                  {data.full_name || '—'}
                </p>
              </div>

              {/* Email (Read-only) */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm font-medium text-gray-900">
                  {data.email || user?.email}
                </p>
              </div>

              {/* Date of Birth (Read-only) */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date of Birth</p>
                <p className="text-sm font-medium text-gray-900">
                  {data.dob ? formatDate(data.dob) : '—'}
                </p>
              </div>

              {/* Gender (Read-only) */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Gender</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {data.gender || '—'}
                </p>
              </div>

              {/* Phone (Editable) */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phone</p>
                {editing ? (
                  <input
                    className="input-field text-sm w-full"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900">
                    {data.phone || '—'}
                  </p>
                )}
              </div>

              {/* Address (Editable) */}
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Address</p>
                {editing ? (
                  <textarea
                    className="input-field text-sm w-full"
                    rows="3"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900">
                    {data.address || '—'}
                  </p>
                )}
              </div>

              {/* Registration Date (Read-only) */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Registration Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(data.created_at)}
                </p>
              </div>

            </div>
          </div>

          {/* Change Password Form Card */}
          {showPasswordForm && (
            <div className="card border-t-4 border-t-blue-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Lock size={18} />
                  Change Password
                </h2>
                <button 
                  onClick={() => setShowPasswordForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Current Password</label>
                    <input
                      type="password"
                      required
                      className="input-field text-sm w-full"
                      value={passwords.currentPassword}
                      onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">New Password</label>
                    <input
                      type="password"
                      required
                      className="input-field text-sm w-full"
                      value={passwords.newPassword}
                      onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="btn-primary text-sm"
                  >
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
} 