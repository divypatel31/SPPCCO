import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Spinner, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FlaskConical, Clock, CheckCircle, Activity, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Animations ---
const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

export default function LabDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Try to safely get user from localStorage to display name
  const user = JSON.parse(localStorage.getItem('hms_user') || '{}');

  useEffect(() => {
    api.get('/lab/requests') 
      .then(res => setRequests(res.data || []))
      .catch(() => toast.error('Failed to load lab requests'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
    </div>
  );

  const pending = requests.filter(r => r.status === 'pending' || r.status === 'requested');
  const inProgress = requests.filter(r => r.status === 'in_progress');
  const completed = requests.filter(r => r.status === 'completed');

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      
      {/* --- Premium Greeting Banner --- */}
      <motion.div variants={FADE_UP_SPRING} className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-[24px] p-8 mb-8 text-white shadow-lg shadow-orange-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-32 w-48 h-48 bg-orange-300/20 rounded-full filter blur-2xl" />
        
        <div className="relative z-10">
          <p className="text-orange-100 font-medium text-sm tracking-wide uppercase mb-1">Laboratory Portal</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
            Welcome, {user?.name?.split(' ')[0] || 'Technician'}! 🔬
          </h1>
          <p className="text-orange-50 font-medium text-sm max-w-md leading-relaxed">
            {user?.department || 'Pathology & Diagnostics'} · Today: {new Date().toDateString()}
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center min-w-[120px]">
            <p className="text-3xl font-bold tracking-tight">{pending.length}</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-100 mt-1">Pending Tests</p>
          </div>
        </div>
      </motion.div>

      {/* --- Key Metrics --- */}
      <motion.div variants={STAGGER_CONTAINER} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { label: "Pending Tests", value: pending.length, icon: Clock, bg: "bg-amber-50", text: "text-amber-600" },
          { label: "In Progress", value: inProgress.length, icon: Activity, bg: "bg-blue-50", text: "text-blue-600" },
          { label: "Completed Today", value: completed.length, icon: CheckCircle, bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Total Requests", value: requests.length, icon: FlaskConical, bg: "bg-violet-50", text: "text-violet-600" },
        ].map((stat, i) => (
          <motion.div key={i} variants={FADE_UP_SPRING} className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex items-center gap-4 group hover:shadow-md transition-shadow">
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

      {/* --- Urgent & Pending Queue --- */}
      <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" /> Urgent & Pending Queue
          </h2>
          <Link to="/lab/requests" className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors group">
            Process Queue <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 opacity-60">
            <CheckCircle size={32} className="text-emerald-400 mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Queue is Clear</h3>
            <p className="text-sm font-medium text-slate-600 mt-1">All requested lab tests have been processed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending
              .sort((a, b) => (a.priority === 'urgent' ? -1 : 1)) // Sort urgent first
              .slice(0, 6) // Show top 6
              .map(req => (
              <div key={req.request_id || req.id} className="group flex items-center justify-between p-4 bg-slate-50/50 hover:bg-orange-50/50 border border-slate-100 hover:border-orange-100 rounded-2xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-orange-500 shadow-sm transition-colors">
                    <FlaskConical size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 tracking-tight">{req.test_name || req.test}</p>
                      {req.priority === 'urgent' && (
                        <span className="text-[9px] bg-rose-100 text-rose-700 border border-rose-200/60 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest animate-pulse">URGENT</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Patient: <span className="text-slate-700">{req.patient_name}</span> · Dr. {req.doctor_name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={req.status} />
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{formatDate(req.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

    </motion.div>
  );
}