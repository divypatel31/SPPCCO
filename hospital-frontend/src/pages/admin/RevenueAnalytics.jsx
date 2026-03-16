import React, { useState, useEffect } from 'react';
import { Spinner, StatCard, PageHeader } from '../../components/common';
import { formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, DollarSign, Activity, CreditCard, Users, IndianRupee } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4'];

export default function RevenueAnalytics() {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departmentRevenue, setDepartmentRevenue] = useState([]);
  const [patientTrend, setPatientTrend] = useState([]);
  const [doctorPerformance, setDoctorPerformance] = useState([]); 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, monthlyRes] = await Promise.allSettled([
          api.get('/admin/dashboard'),
          api.get('/admin/monthly-revenue'),
        ]);
        const [deptRes, patientRes, doctorRes] = await Promise.allSettled([
          api.get("/reports/department-revenue"),
          api.get("/reports/patient-trend"),
          api.get("/reports/doctor-performance"), 
        ]);

        if (deptRes.status === "fulfilled")
          setDepartmentRevenue(deptRes.value.data || []);

        if (patientRes.status === "fulfilled")
          setPatientTrend(patientRes.value.data || []);

        if (doctorRes.status === "fulfilled")
          setDoctorPerformance(doctorRes.value.data || []);
          
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (monthlyRes.status === 'fulfilled') setMonthly(monthlyRes.value.data || []);
      } catch { }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <Spinner />;

  const revBreakdown = [
    { name: 'Consultation', value: stats?.consultation_revenue || 0 },
    { name: 'Lab Tests', value: stats?.lab_revenue || 0 },
    { name: 'Pharmacy', value: stats?.pharmacy_revenue || 0 },
  ];

  const totalRevenue = revBreakdown.reduce((s, i) => s + i.value, 0);

  const chartData = monthly.length > 0 ? monthly : [
    { month: 'Sep', consultation_revenue: 15000, lab_revenue: 8000, pharmacy_revenue: 5000 },
    { month: 'Oct', consultation_revenue: 22000, lab_revenue: 11000, pharmacy_revenue: 7500 },
    { month: 'Nov', consultation_revenue: 18000, lab_revenue: 9500, pharmacy_revenue: 6200 },
    { month: 'Dec', consultation_revenue: 25000, lab_revenue: 13000, pharmacy_revenue: 9000 },
    { month: 'Jan', consultation_revenue: 20000, lab_revenue: 10500, pharmacy_revenue: 7800 },
    { month: 'Feb', consultation_revenue: 28000, lab_revenue: 14000, pharmacy_revenue: 10500 },
  ];

  return (
    <div>
      <PageHeader title="Revenue Analytics" subtitle="Complete financial overview of the hospital" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(totalRevenue)} color="green" />
        <StatCard icon={Activity} label="Consultation" value={formatCurrency(stats?.consultation_revenue)} color="blue" />
        <StatCard icon={CreditCard} label="Lab Revenue" value={formatCurrency(stats?.lab_revenue)} color="orange" />
        <StatCard icon={TrendingUp} label="Pharmacy Revenue" value={formatCurrency(stats?.pharmacy_revenue)} color="purple" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Pie Chart: Main Breakdown */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart margin={{ top: 10, right: 35, bottom: 10, left: 35 }}>
              <Pie 
                data={revBreakdown} 
                cx="50%" 
                cy="50%" 
                innerRadius={40} 
                outerRadius={60} 
                paddingAngle={4} 
                dataKey="value" 
                /* 🔥 FIX: Removed 'fill' so colors work properly! */
                style={{ fontSize: '11px', fontWeight: '600' }} 
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} 
                labelLine={false}
              >
                {revBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {revBreakdown.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{formatCurrency(item.value)}</span>
                  <span className="text-gray-400 text-xs ml-2">
                    {totalRevenue > 0 ? `${((item.value / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Summary Cards */}
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Today\'s Revenue', value: stats?.today_revenue, color: 'bg-blue-50 border-blue-100' },
              { label: 'This Month', value: stats?.monthly_revenue, color: 'bg-green-50 border-green-100' },
              { label: 'Paid Bills', value: stats?.paid_bills_count, isCurrency: false, color: 'bg-purple-50 border-purple-100' },
              { label: 'Pending Bills', value: stats?.pending_bills, isCurrency: false, color: 'bg-orange-50 border-orange-100' },
            ].map(({ label, value, isCurrency = true, color }) => (
              <div key={label} className={`p-4 rounded-xl border ${color}`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value !== undefined ? (isCurrency ? formatCurrency(value) : value) : '—'}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500">Revenue is calculated dynamically from paid bills only. Pending or cancelled bills are excluded.</p>
          </div>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="consultation_revenue" name="Consultation" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lab_revenue" name="Lab" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pharmacy_revenue" name="Pharmacy" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Revenue Growth Trend</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData.map(d => ({ ...d, total: (d.consultation_revenue || 0) + (d.lab_revenue || 0) + (d.pharmacy_revenue || 0) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => formatCurrency(v)} />
            <Line type="monotone" dataKey="total" name="Total Revenue" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Department-wise Revenue Pie Chart */}
        <div className="card">
          <h2 className="font-semibold mb-4">Department-wise Revenue</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart margin={{ top: 20, right: 50, bottom: 20, left: 50 }}>
              <Pie
                data={departmentRevenue}
                dataKey="revenue"
                nameKey="department"
                cx="50%"
                cy="50%"
                outerRadius={65} 
                labelLine={true}
                /* 🔥 FIX: Removed 'fill' so colors work properly! */
                style={{ fontSize: '11px', fontWeight: '600' }}
                label={({ department, name, percent }) => `${department || name} ${(percent * 100).toFixed(0)}%`}
              >
                {departmentRevenue.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Patient Registration Trend */}
        <div className="card">
          <h2 className="font-semibold mb-4">Patient Registrations Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={patientTrend} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total_patients"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Doctor Performance Table */}
      <div className="card mt-6 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 mb-6">Doctor Performance</h2>
        
        {doctorPerformance.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No doctor performance data available yet.</p>
        ) : (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500">
                <th className="pb-3 font-medium px-4">Doctor</th>
                <th className="pb-3 font-medium px-4">Department</th>
                <th className="pb-3 font-medium px-4">Consultations</th>
                <th className="pb-3 font-medium px-4">Avg/Day</th>
              </tr>
            </thead>
            <tbody>
              {doctorPerformance.map((doc, idx) => (
                <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                    {doc.doctor_name || doc.name || 'Unknown Doctor'}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {doc.department || 'General'}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900">
                    {doc.consultations || 0}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {doc.avg_per_day || (doc.consultations ? (doc.consultations / 30).toFixed(1) : '0.0')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}