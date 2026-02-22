import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Activity, ArrowLeft, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', dob: '',
    gender: '', address: '', password: '', confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      await register({ ...payload, role: 'patient' });
      toast.success('Account created successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">MediCare HMS</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/login" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Patient Registration</h2>
              <p className="text-gray-500 text-sm">Create your patient account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input name="name" className="input-field" placeholder="John Doe" value={form.name} onChange={handleChange} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input name="email" type="email" className="input-field" placeholder="john@example.com" value={form.email} onChange={handleChange} required />
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input name="phone" className="input-field" placeholder="+91 9876543210" value={form.phone} onChange={handleChange} required />
              </div>
              <div>
                <label className="label">Date of Birth *</label>
                <input name="dob" type="date" className="input-field" value={form.dob} onChange={handleChange} required />
              </div>
              <div>
                <label className="label">Gender *</label>
                <select name="gender" className="input-field" value={form.gender} onChange={handleChange} required>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Address</label>
                <input name="address" className="input-field" placeholder="Your address" value={form.address} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Password *</label>
                <input name="password" type="password" className="input-field" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required />
              </div>
              <div>
                <label className="label">Confirm Password *</label>
                <input name="confirmPassword" type="password" className="input-field" placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-6 flex items-center justify-center gap-2 py-2.5">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <UserPlus size={16} />}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already registered?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
