import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Spinner, PageHeader } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';

export default function StaffProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password Change States
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
    <div>
      <PageHeader title="My Profile" subtitle="View your staff details and manage security" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avatar card */}
        <div className="card text-center flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold mx-auto mb-4">
            {(data.full_name || user?.name)?.[0]?.toUpperCase() || 'S'}
          </div>

          <p className="font-semibold text-gray-900 text-lg">
            {data.full_name || user?.name}
          </p>

          <p className="text-sm text-gray-500">
            {data.email || user?.email}
          </p>

          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize mb-6">
            {data.role || user?.role || 'Staff'}
          </span>

          {/* Change Password Button */}
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
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h2 className="font-semibold text-gray-900">Personal Information</h2>
              <span className="text-xs text-gray-400">Read Only</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Full Name</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                  {data.full_name || '—'}
                </p>
              </div>

              {/* Email */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                  {data.email || '—'}
                </p>
              </div>

              {/* Phone */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phone</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                  {data.phone || '—'}
                </p>
              </div>

              {/* Date of Birth */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date of Birth</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                  {data.dob ? formatDate(data.dob) : '—'}
                </p>
              </div>

              {/* Gender */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Gender</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100 capitalize">
                  {data.gender || '—'}
                </p>
              </div>

              {/* Department (If applicable) */}
              {data.department && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Department</p>
                  <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100 capitalize">
                    {data.department || '—'}
                  </p>
                </div>
              )}

              {/* Registration Date */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Joined Date</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                  {data.created_at ? formatDate(data.created_at) : '—'}
                </p>
              </div>

              {/* Address (Spans Full Width) */}
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Address</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100 min-h-[40px]">
                  {data.address || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Change Password Form Card (Only visible when clicked) */}
          {showPasswordForm && (
            <div className="card border-t-4 border-t-blue-500 transition-all duration-300">
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