import React, { useState, useEffect } from 'react';
import { StatCard, Spinner, EmptyState } from '../../components/common';
import { formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Users, CreditCard, Activity, Building2, Pill, ShieldCheck, ChevronRight, FlaskConical, Settings } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
// 🔥 FIX: Added AnimatePresence here
import { motion, AnimatePresence } from 'framer-motion';

// --- Animations ---
const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.6 } }
};

const STAGGER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

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

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  const revenueBreakdown = [
    { name: 'Consultation', value: stats?.consultation_revenue || 0, color: '#3b82f6' }, // Blue
    { name: 'Lab Diagnostics', value: stats?.lab_revenue || 0, color: '#10b981' }, // Emerald
    { name: 'Pharmacy Sales', value: stats?.pharmacy_revenue || 0, color: '#f59e0b' }, // Amber
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER} className="max-w-[1400px] mx-auto p-4 sm:p-6 font-sans pb-24">
      
      {/* --- PREMIUM HEADER --- */}
      <motion.div variants={FADE_UP} className="relative overflow-hidden bg-slate-900 rounded-[24px] p-8 mb-8 text-white shadow-xl shadow-slate-900/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Abstract Background Blurs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-32 w-48 h-48 bg-emerald-500/20 rounded-full filter blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={20} className="text-emerald-400" />
            <p className="text-slate-400 font-bold text-[11px] tracking-[0.2em] uppercase">System Administrator</p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
            Command Center
          </h1>
          <p className="text-slate-400 font-medium text-sm max-w-md leading-relaxed">
            Real-time hospital analytics, revenue tracking, and global system metrics.
          </p>
        </div>
      </motion.div>

      {/* --- STATS GRID --- */}
      <motion.div variants={STAGGER} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <motion.div variants={FADE_UP}><StatCard icon={Users} label="Total Patients" value={stats?.total_patients || '0'} color="blue" /></motion.div>
        <motion.div variants={FADE_UP}><StatCard icon={Activity} label="Total Appointments" value={stats?.total_appointments || '0'} color="teal" /></motion.div>
        <motion.div variants={FADE_UP}><StatCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(stats?.total_revenue || 0)} color="green" /></motion.div>
        <motion.div variants={FADE_UP}><StatCard icon={CreditCard} label="Pending Bills" value={stats?.pending_bills || '0'} color="orange" /></motion.div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        
        {/* --- REVENUE BREAKDOWN --- */}
        <motion.div variants={FADE_UP} className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col">
          <h2 className="text-base font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-slate-400" /> Revenue Distribution
          </h2>
          
          <div className="space-y-4 flex-1">
            {revenueBreakdown.map(item => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(item.value)}</span>
              </div>
            ))}
            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gross Total</span>
              <span className="text-lg font-black text-emerald-600">{formatCurrency(revenueBreakdown.reduce((s, i) => s + i.value, 0))}</span>
            </div>
          </div>

          {revenueBreakdown.some(r => r.value > 0) && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={revenueBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                    {revenueBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip 
                    formatter={(v) => formatCurrency(v)} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* --- STAFF OVERVIEW --- */}
        <motion.div variants={FADE_UP} className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <h2 className="text-base font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2">
            <Users size={18} className="text-slate-400" /> Active Personnel
          </h2>
          <div className="space-y-4">
            {[
              { label: 'Physicians', value: stats?.total_doctors, icon: Activity, color: 'text-teal-600 bg-teal-50 border-teal-100' },
              { label: 'Front Desk', value: stats?.total_receptionists, icon: Users, color: 'text-violet-600 bg-violet-50 border-violet-100' },
              { label: 'Lab Technicians', value: stats?.total_lab_techs, icon: FlaskConical, color: 'text-amber-600 bg-amber-50 border-amber-100' },
              { label: 'Pharmacists', value: stats?.total_pharmacists, icon: Pill, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm group-hover:scale-105 transition-transform ${color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                </div>
                <div className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  <span className="text-sm font-black text-slate-900">{value ?? '0'}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* --- QUICK ACTIONS --- */}
        <motion.div variants={FADE_UP} className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <h2 className="text-base font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2">
            <Settings size={18} className="text-slate-400" /> Administrative Shortcuts
          </h2>
          <div className="space-y-3">
            {[
              { to: '/admin/users', label: 'User Directory', desc: 'Create & manage staff accounts', icon: '👥' },
              { to: '/admin/departments', label: 'Departments', desc: 'Manage hospital sectors', icon: '🏥' },
              { to: '/admin/medicines', label: 'Pharmacy Inventory', desc: 'Medicine master database', icon: '💊' },
              { to: '/admin/revenue', label: 'Financial Analytics', desc: 'Detailed revenue tracking', icon: '📊' },
            ].map(item => (
              <Link 
                key={item.to} 
                to={item.to} 
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="text-2xl opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all">{item.icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{item.label}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* --- MONTHLY REVENUE CHART --- */}
      <AnimatePresence>
        {revenue.length > 0 && (
          <motion.div variants={FADE_UP} className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Fiscal Trajectory</h2>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Monthly Revenue Breakdown</p>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                    tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    formatter={(v) => formatCurrency(v)} 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="consultation_revenue" name="Consultation" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="lab_revenue" name="Lab" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="pharmacy_revenue" name="Pharmacy" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </motion.div>
  );
}