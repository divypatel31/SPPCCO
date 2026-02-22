import React, { useState } from 'react';
import { PageHeader } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { UserPlus, CheckCircle } from 'lucide-react';

export default function RegisterPatient() {
  const [form, setForm] = useState({
    name: '', phone: '', dob: '', gender: '', address: '', email: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [created, setCreated] = useState(null);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.dob || !form.gender) {
      toast.error('Please fill required fields');
      return;
    }
    setLoading(true);
    try {
      // Use auth register endpoint with walk-in flag
      const res = await api.post('/auth/register', {
        ...form,
        role: 'patient',
        password: form.phone, // default password = phone number
        created_by: 'receptionist',
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
    <div>
      <PageHeader title="Register Walk-in Patient" subtitle="Create a new patient account for walk-in visits" />

      <div className="max-w-xl">
        {success && created && (
          <div className="card mb-4 bg-green-50 border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-600 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-green-900">Patient Registered Successfully!</p>
                <p className="text-sm text-green-700 mt-1">
                  <strong>{created.name}</strong> has been registered.
                </p>
                <p className="text-xs text-green-600 mt-1">Default password: phone number ({form.phone || 'as entered'})</p>
              </div>
            </div>
            <button onClick={() => setSuccess(false)} className="btn-secondary mt-3 text-sm">Register Another</button>
          </div>
        )}

        {!success && (
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Full Name *</label>
                  <input name="name" className="input-field" placeholder="Patient full name" value={form.name} onChange={handleChange} required />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input name="phone" className="input-field" placeholder="Phone number" value={form.phone} onChange={handleChange} required />
                </div>
                <div>
                  <label className="label">Date of Birth *</label>
                  <input name="dob" type="date" className="input-field" value={form.dob} onChange={handleChange} required />
                </div>
                <div>
                  <label className="label">Gender *</label>
                  <select name="gender" className="input-field" value={form.gender} onChange={handleChange} required>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Email (Optional)</label>
                  <input name="email" type="email" className="input-field" placeholder="Optional" value={form.email} onChange={handleChange} />
                </div>
                <div className="col-span-2">
                  <label className="label">Address</label>
                  <input name="address" className="input-field" placeholder="Patient address" value={form.address} onChange={handleChange} />
                </div>
              </div>

              <div className="p-3 bg-yellow-50 rounded-xl text-xs text-yellow-800">
                ⚠️ The patient's default login password will be set to their phone number. They should change it on first login.
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <UserPlus size={16} />}
                {loading ? 'Registering...' : 'Register Patient'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
