import React, { useState, useEffect } from 'react';
import { StatCard, Spinner, EmptyState } from '../../components/common';
import { formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, CreditCard, Activity, Building2, Pill } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function AdminDashboard() {
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, revRes] = await Promise.allSettled([
          api.get('/admin/dashboard'),
          api.get('/admin/monthly-revenue'),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (revRes.status === 'fulfilled') setRevenue(revRes.value.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, [location.pathname]);

  if (loading) return <Spinner />;

  const revenueBreakdown = [
    { name: 'Consultation', value: stats?.consultation_revenue || 0, color: '#3b82f6' },
    { name: 'Lab', value: stats?.lab_revenue || 0, color: '#10b981' },
    { name: 'Pharmacy', value: stats?.pharmacy_revenue || 0, color: '#f59e0b' },
  ];

  return (
    <div>
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-slate-300 mt-1">System overview and hospital analytics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Patients" value={stats?.total_patients || '—'} color="blue" />
        <StatCard icon={Activity} label="Total Appointments" value={stats?.total_appointments || '—'} color="teal" />
        <StatCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(stats?.total_revenue)} color="green" />
        <StatCard icon={CreditCard} label="Pending Bills" value={stats?.pending_bills || '—'} color="orange" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue breakdown cards */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue Breakdown</h2>
          <div className="space-y-3">
            {revenueBreakdown.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(item.value)}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(revenueBreakdown.reduce((s, i) => s + i.value, 0))}</span>
            </div>
          </div>
          {revenueBreakdown.some(r => r.value > 0) && (
            <ResponsiveContainer width="100%" height={120} className="mt-4">
              <PieChart>
                <Pie data={revenueBreakdown} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                  {revenueBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* User breakdown */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Staff Overview</h2>
          <div className="space-y-3">
            {[
              { label: 'Doctors', value: stats?.total_doctors, icon: Activity, color: 'text-teal-600 bg-teal-50' },
              { label: 'Receptionists', value: stats?.total_receptionists, icon: Users, color: 'text-purple-600 bg-purple-50' },
              { label: 'Lab Technicians', value: stats?.total_lab_techs, icon: Building2, color: 'text-orange-600 bg-orange-50' },
              { label: 'Pharmacists', value: stats?.total_pharmacists, icon: Pill, color: 'text-green-600 bg-green-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{label}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { to: '/admin/users', label: '👥 Manage Users', desc: 'Create & manage staff accounts' },
              { to: '/admin/departments', label: '🏥 Departments', desc: 'Manage hospital departments' },
              { to: '/admin/medicines', label: '💊 Medicines', desc: 'Medicine master & inventory' },
              { to: '/admin/revenue', label: '📊 Revenue Report', desc: 'Detailed financial analytics' },
            ].map(item => (
              <a key={item.to} href={item.to} className="block p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      {revenue.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="consultation_revenue" name="Consultation" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lab_revenue" name="Lab" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pharmacy_revenue" name="Pharmacy" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
