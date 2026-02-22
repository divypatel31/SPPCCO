import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Spinner, PageHeader } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { User, Save } from 'lucide-react';

export default function PatientProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', dob: '', gender: '', blood_group: '', address: '' });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/patient/profile');
        setProfile(res.data);
        setForm({
          full_name: res.data.full_name || '',
          phone: res.data.phone || '',
          dob: res.data.dob || '',
          gender: res.data.gender || '',
          blood_group: res.data.blood_group || '',
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

  if (loading) return <Spinner />;

  const data = profile || {};
  const fields = [
    { label: 'Full Name', value: data.name || user?.name },
    { label: 'Email', value: data.email || user?.email },
    { label: 'Date of Birth', value: formatDate(data.dob) },
    { label: 'Gender', value: data.gender },
    { label: 'Blood Group', value: data.blood_group || '—' },
    { label: 'Registration Date', value: formatDate(data.created_at) },
  ];

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View and update your personal information" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avatar card */}
        <div className="card text-center">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold mx-auto mb-4">
            {(data.full_name || user?.name)?.[0]?.toUpperCase() || 'P'}
          </div>

          <p className="font-semibold text-gray-900 text-lg">
            {data.full_name || user?.name}
          </p>

          <p className="text-sm text-gray-500">
            {data.email || user?.email}
          </p>

          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            Patient
          </span>
        </div>

        {/* Info card */}
        <div className="lg:col-span-2 card">
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

            {/* Full Name */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Full Name</p>
              {editing ? (
                <input
                  className="input-field text-sm"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {data.full_name || '—'}
                </p>
              )}
            </div>

            {/* Email (readonly) */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
              <p className="text-sm font-medium text-gray-900">
                {data.email || user?.email}
              </p>
            </div>

            {/* Date of Birth */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date of Birth</p>
              {editing ? (
                <input
                  type="date"
                  className="input-field text-sm"
                  value={form.dob || ''}
                  onChange={e => setForm({ ...form, dob: e.target.value })}
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {data.dob ? formatDate(data.dob) : '—'}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Gender</p>
              {editing ? (
                <select
                  className="input-field text-sm"
                  value={form.gender || ''}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {data.gender || '—'}
                </p>
              )}
            </div>

            {/* Blood Group */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Blood Group</p>
              {editing ? (
                <select
                  className="input-field text-sm"
                  value={form.blood_group || ''}
                  onChange={e => setForm({ ...form, blood_group: e.target.value })}
                >
                  <option value="">Select</option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                  <option>O+</option>
                  <option>O-</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {data.blood_group || '—'}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phone</p>
              {editing ? (
                <input
                  className="input-field text-sm"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {data.phone || '—'}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Address</p>
              {editing ? (
                <textarea
                  className="input-field text-sm"
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

            {/* Registration Date */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Registration Date</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(data.created_at)}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>

  );
}
