import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner, StatusBadge } from '../../components/common';
import { formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, Activity, Clock, ArrowRight, Play, CheckCircle } from 'lucide-react';
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

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 Uses your original working API call
    api.get('/doctor/appointments')
      .then(res => setAppointments(res.data || []))
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => setLoading(false));
  }, []);

  // 🔥 Your robust isToday function
  const isToday = (dateString) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const todayObj = new Date();
    return d.getDate() === todayObj.getDate() &&
           d.getMonth() === todayObj.getMonth() &&
           d.getFullYear() === todayObj.getFullYear();
  };

  // 🔥 Frontend calculations using your original logic
  const todayAppts = appointments.filter(a => 
    isToday(a.appointment_date || a.date) && 
    ['scheduled', 'arrived', 'in_consultation'].includes(a.status)
  );

  const pending = appointments.filter(a => 
    isToday(a.appointment_date || a.date) && 
    a.status === 'arrived'
  );

  const completedToday = appointments.filter(a => 
    isToday(a.appointment_date || a.date) && 
    a.status === 'completed'
  );

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      
      {/* --- Premium Greeting Banner --- */}
      <motion.div variants={FADE_UP_SPRING} className="relative overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-600 rounded-[24px] p-8 mb-8 text-white shadow-lg shadow-teal-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-32 w-48 h-48 bg-teal-300/20 rounded-full filter blur-2xl" />
        
        <div className="relative z-10">
          <p className="text-teal-100 font-medium text-sm tracking-wide uppercase mb-1">Physician Portal</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
            Welcome, Dr. {user?.name?.split(' ')[0] || 'Doctor'}! 🩺
          </h1>
          <p className="text-teal-50 font-medium text-sm max-w-md leading-relaxed">
            {user?.department || 'General Medicine'} · Today: {new Date().toDateString()}
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center min-w-[120px]">
            <p className="text-3xl font-bold tracking-tight">{todayAppts.length}</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-100 mt-1">Today's Load</p>
          </div>
        </div>
      </motion.div>

      {/* --- Key Metrics --- */}
      <motion.div variants={STAGGER_CONTAINER} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { label: "Today's Appts", value: todayAppts.length, icon: Calendar, bg: "bg-teal-50", text: "text-teal-600" },
          { label: "Patients Waiting", value: pending.length, icon: Clock, bg: "bg-amber-50", text: "text-amber-600" },
          { label: "Completed Today", value: completedToday.length, icon: CheckCircle, bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Total Lifetime", value: appointments.length, icon: Activity, bg: "bg-blue-50", text: "text-blue-600" },
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

      {/* --- Today's Queue --- */}
      <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar size={18} className="text-teal-500" /> Today's Clinical Queue
          </h2>
          <Link to="/doctor/appointments" className="text-sm font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors group">
            View Schedule <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        {todayAppts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 opacity-60">
            <Activity size={32} className="text-slate-400 mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">No appointments today</h3>
            <p className="text-sm font-medium text-slate-600 mt-1">Your schedule is clear for the rest of the day.</p>
          </div>
        ) : (
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-4 pl-6">Time</th>
                  <th className="p-4">Patient Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {todayAppts
                  .sort((a, b) => (a.appointment_time || a.start_time || '').localeCompare(b.appointment_time || b.start_time || ''))
                  .map(appt => {
                    const actualId = appt.appointment_id || appt.id || appt._id;
                    const time = appt.appointment_time || appt.start_time;

                    return (
                      <tr key={actualId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="text-center min-w-[70px] bg-white border border-slate-200/60 p-2 rounded-lg shadow-sm">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Start</p>
                            <p className="text-sm font-bold text-teal-700">{formatTime(time)}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-900 tracking-tight text-sm">{appt.patient_name || 'Patient'}</p>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">{appt.department || 'General Clinic'}</p>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={appt.status} />
                        </td>
                        <td className="p-4 pr-6 text-right">
                          {['arrived', 'in_consultation'].includes(appt.status) && (
                            <Link 
                              to={`/doctor/consultation/${actualId}`}
                              className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white border border-teal-200/60 hover:border-teal-600 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                            >
                              <Play size={12} /> {appt.status === 'arrived' ? 'Start' : 'Continue'}
                            </Link>
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