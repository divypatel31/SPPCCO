import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Spinner, StatusBadge } from '../../components/common';
import { formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Pill, Package, CreditCard, AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animations ---
const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

export default function PharmacistDashboard() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Safely get user info from localStorage to display name and role
  const userStr = localStorage.getItem('hms_user');
  const user = userStr ? JSON.parse(userStr) : {};
  const userName = user?.name || user?.full_name || 'Pharmacist';
  const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Pharmacist';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [presRes, medRes] = await Promise.all([
          api.get('/pharmacy/prescriptions'),
          api.get('/pharmacy/medicine')
        ]);

        setPrescriptions(presRes.data || []);
        setMedicines(medRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load pharmacy data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  const lowStock = medicines.filter(m => m.stock <= (m.minimum_threshold || 10));

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      
      {/* --- Premium Greeting Banner --- */}
      <motion.div variants={FADE_UP_SPRING} className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-green-600 rounded-[24px] p-8 mb-8 text-white shadow-lg shadow-emerald-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-32 w-48 h-48 bg-emerald-300/20 rounded-full filter blur-2xl" />
        
        <div className="relative z-10">
          <p className="text-emerald-100 font-medium text-sm tracking-wide uppercase mb-1">Pharmacy Dashboard</p>
          
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
            Welcome, {userName}! <span className="text-emerald-100 text-2xl font-medium">({userRole})</span> 💊
          </h1>
          
          <p className="text-emerald-50 font-medium text-sm max-w-md leading-relaxed">
            Manage prescriptions, dispense medicines, and oversee inventory.
          </p>
          <div className="flex gap-3 mt-6">
            <Link to="/pharmacist/prescriptions" className="inline-flex items-center justify-center gap-2 bg-white text-emerald-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-50 hover:shadow-lg transition-all">
              <Pill size={16} /> View Prescriptions
            </Link>
          </div>
        </div>
      </motion.div>

      {/* --- Key Metrics --- */}
      <motion.div variants={STAGGER_CONTAINER} className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { label: "Pending Prescriptions", value: prescriptions.length, icon: Pill, bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Total Medicines", value: medicines.length, icon: Package, bg: "bg-blue-50", text: "text-blue-600" },
          { label: "Low Stock Items", value: lowStock.length, icon: AlertTriangle, bg: lowStock.length > 0 ? "bg-rose-50" : "bg-slate-50", text: lowStock.length > 0 ? "text-rose-600" : "text-slate-600" },
          { label: "Bills Today", value: "—", icon: CreditCard, bg: "bg-indigo-50", text: "text-indigo-600" },
        ].map((stat) => (
          // 🔥 FIXED: Using stat.label as a robust unique key
          <motion.div key={stat.label} variants={FADE_UP_SPRING} className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex items-center gap-4 group hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} group-hover:scale-105 transition-transform`}>
              <stat.icon size={20} className={stat.text} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* --- Low Stock Alert Banner --- */}
      <AnimatePresence>
        {lowStock.length > 0 && (
          // 🔥 FIXED: Added key="low-stock-alert" for AnimatePresence
          <motion.div key="low-stock-alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden">
            <div className="bg-rose-50 border border-rose-200/60 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-rose-100 rounded-lg text-rose-600"><AlertTriangle size={18} /></div>
                <h2 className="font-semibold text-rose-900 tracking-tight">Low Stock Alert</h2>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 🔥 FIXED: Robust key fallback chain */}
                {lowStock.slice(0, 5).map((med, idx) => (
                  <div key={med.medicine_id || med._id || med.id || `low-stock-${idx}`} className="bg-white/60 border border-rose-100 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-sm font-semibold text-rose-900 tracking-tight truncate">{med.medicine_name || med.name}</span>
                    <span className="text-xs font-medium text-rose-600 mt-1">{med.stock} units remaining</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Inventory Overview --- */}
      <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Package size={18} className="text-emerald-500" /> Medicine Inventory
          </h2>
          <Link to="/pharmacist/prescriptions" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors group">
            Prescriptions <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        {medicines.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 opacity-60">
            <Package size={32} className="text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-600">Medicine inventory will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-4 pl-6">Medicine Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Stock Level</th>
                  <th className="p-4">Unit Price</th>
                  <th className="p-4 pr-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {/* 🔥 FIXED: Robust key fallback chain */}
                {medicines.slice(0, 8).map((med, idx) => {
                  const isLow = med.stock <= (med.minimum_threshold || 10);
                  return (
                    <tr key={med.medicine_id || med._id || med.id || `inv-${idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4 pl-6 font-semibold text-slate-900 text-sm tracking-tight">
                        {med.medicine_name || med.name}
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-600">
                        {med.category || '—'}
                      </td>
                      <td className="p-4">
                        <span className={`text-sm font-semibold ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                          {med.stock}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(med.price)}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {isLow ? (
                          <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">Low Stock</span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">In Stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

    </motion.div>
  );
}