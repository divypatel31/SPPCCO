import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner, StatusBadge } from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Clock, Users, CreditCard, CheckCircle, ArrowRight, UserPlus, Calendar } from 'lucide-react';
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

export default function ReceptionistDashboard() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [queue, setQueue] = useState([]);
  const [todayPatients, setTodayPatients] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🔥 Using your exact working API calls
        const [pendRes, queueRes, todayRes] = await Promise.allSettled([
          api.get('/receptionist/pending-appointments'),
          api.get('/receptionist/completed-appointments'),
          api.get('/receptionist/today-queue') 
        ]);
        
        if (pendRes.status === 'fulfilled') setPending(pendRes.value.data || []);
        if (queueRes.status === 'fulfilled') setQueue(queueRes.value.data || []);
        if (todayRes.status === 'fulfilled') setTodayPatients(todayRes.value.data?.length || 0);
        
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally { 
        setLoading(false); 
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  // 🔥 Your precise billing logic
  const pendingBills = queue.filter(appt => appt.billing_status !== 'generated' && appt.billing_status !== 'paid');
  const billsGenerated = queue.filter(appt => appt.billing_status === 'generated' || appt.billing_status === 'paid').length;

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      
      {/* --- Premium Greeting Banner --- */}
      <motion.div variants={FADE_UP_SPRING} className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 rounded-[24px] p-8 mb-8 text-white shadow-lg shadow-violet-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-32 w-48 h-48 bg-purple-300/20 rounded-full filter blur-2xl" />
        
        <div className="relative z-10">
          <p className="text-violet-100 font-medium text-sm tracking-wide uppercase mb-1">Front Desk Portal</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
            Welcome, {user?.name?.split(' ')[0] || 'Receptionist'}! 👋
          </h1>
          <p className="text-violet-50 font-medium text-sm max-w-md leading-relaxed">
            Manage appointments, queue, and billing · {new Date().toDateString()}
          </p>
          <div className="flex gap-3 mt-6">
            <Link to="/receptionist/register-patient" className="inline-flex items-center justify-center gap-2 bg-white text-violet-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-50 hover:shadow-lg transition-all">
              <UserPlus size={16} /> Register Walk-in
            </Link>
            <Link to="/receptionist/pending-appointments" className="inline-flex items-center justify-center gap-2 bg-violet-700/40 backdrop-blur-md text-white border border-white/20 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700/60 transition-all">
              <Calendar size={16} /> Assign Doctors
            </Link>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center min-w-[120px]">
            <p className="text-3xl font-bold tracking-tight">{todayPatients}</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-100 mt-1">Today's Patients</p>
          </div>
        </div>
      </motion.div>

      {/* --- Key Metrics --- */}
      <motion.div variants={STAGGER_CONTAINER} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { label: "Pending Requests", value: pending.length, icon: Clock, bg: "bg-amber-50", text: "text-amber-600" },
          { label: "Ready for Billing", value: pendingBills.length, icon: CreditCard, bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Today's Patients", value: todayPatients, icon: Users, bg: "bg-blue-50", text: "text-blue-600" },
          { label: "Bills Generated", value: billsGenerated, icon: CheckCircle, bg: "bg-violet-50", text: "text-violet-600" },
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

      {/* --- Lists Grid --- */}
      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Pending Assignments */}
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock size={18} className="text-amber-500" /> Pending Doctor Assignment
            </h2>
            <Link to="/receptionist/pending-appointments" className="text-sm font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors group">
              View all <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="flex-1">
            {pending.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-60">
                <Clock size={32} className="text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-600">All appointments have been assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.slice(0, 5).map((appt, index) => (
                  <div key={appt.appointment_id || appt.id || index} className="group flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 tracking-tight">{appt.patient_name || 'Patient'}</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        {appt.department} · {formatDate(appt.appointment_date || appt.date)}
                        {appt.start_time && ` · ${formatTime(appt.start_time)}`}
                      </p>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Ready for Billing */}
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-500" /> Ready for Billing
            </h2>
            <Link to="/receptionist/billing" className="text-sm font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors group">
              Go to Billing <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="flex-1">
            {pendingBills.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-60">
                <CreditCard size={32} className="text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-600">Completed appointments will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBills.slice(0, 5).map((appt, index) => (
                  <div key={appt.appointment_id || appt.id || index} className="group flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 tracking-tight">{appt.patient_name || 'Patient'}</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        Dr. {appt.doctor_name} · {formatDate(appt.appointment_date || appt.date)}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold bg-orange-50 border border-orange-100 text-orange-700 px-2.5 py-1 rounded-md uppercase tracking-widest">
                      Needs Bill
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}