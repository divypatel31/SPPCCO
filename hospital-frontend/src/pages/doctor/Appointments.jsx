import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Spinner, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, Search, Play, Eye, XCircle, Stethoscope, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animation Variants ---
const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.get('/doctor/appointments')
      .then(res => setAppointments(res.data || []))
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => setLoading(false));
  }, []);

  const cancelAppointment = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      const res = await api.put(`/doctor/cancel/${id}`);
      toast.success(res.data.message || "Appointment cancelled");
      setAppointments(prev =>
        prev.map(appt => appt.appointment_id === id ? { ...appt, status: "cancelled" } : appt)
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancel failed");
    }
  };

  // 1. Filter by Status and Search Query
  const filtered = appointments.filter(appt => {
    const matchesSearch = appt.patient_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filter === 'all' || appt.status === filter;
    return matchesSearch && matchesStatus;
  });

  // 2. 🔥 Your Bulletproof String Sorting
  const sortedAppointments = [...filtered].sort((a, b) => {
    const dateA = (a.appointment_date || a.date || '').split('T')[0];
    const dateB = (b.appointment_date || b.date || '').split('T')[0];

    if (dateA > dateB) return -1;
    if (dateA < dateB) return 1;

    const timeA = a.appointment_time || a.start_time || '';
    const timeB = b.appointment_time || b.start_time || '';
    
    if (timeA < timeB) return -1;
    if (timeA > timeB) return 1;
    return 0;
  });

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      <PageHeader title="Clinical Schedule" subtitle={`Managing ${appointments.length} total patient encounters`} />

      {/* --- CONTROLS: SEARCH & STATUS TABS --- */}
      <motion.div variants={FADE_UP_SPRING} className="flex flex-col xl:flex-row justify-between gap-4 mb-6">
        <div className="relative w-full xl:max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]"
          />
        </div>

        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 overflow-x-auto hide-scrollbar border border-slate-200/50 shadow-inner w-full xl:w-auto">
          {['all', 'scheduled', 'arrived', 'in_consultation', 'completed'].map(type => {
            const isActive = filter === type;
            return (
              <button 
                key={type} onClick={() => setFilter(type)} 
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 xl:flex-none capitalize ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                {isActive && <motion.div layoutId="docApptFilterTab" className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />}
                <span className="relative z-10">{type.replace(/_/g, ' ')}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* --- TABLE AREA --- */}
      {sortedAppointments.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <Calendar size={32} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">No Appointments Found</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">There are no records matching your current selection.</p>
        </motion.div>
      ) : (
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-5 pl-6">Patient Profile</th>
                  <th className="p-5">Encounter Schedule</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 pr-6 text-right">Clinical Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sortedAppointments.map((appt) => {
                    const time = appt.appointment_time || appt.start_time;
                    return (
                      <motion.tr 
                        key={appt.appointment_id} 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="p-5 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-semibold text-xs shadow-sm">
                              {appt.patient_name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm tracking-tight">{appt.patient_name || '—'}</p>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">{appt.department || 'General Clinic'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2 text-slate-900 font-medium text-sm">
                            <Calendar size={14} className="text-slate-400" />
                            {formatDate(appt.appointment_date || appt.date)}
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                            <Clock size={14} className="text-slate-400" />
                            {time ? formatTime(time) : '—'}
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <StatusBadge status={appt.status} />
                        </td>
                        <td className="p-5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {['arrived', 'in_consultation'].includes(appt.status) && (
                              <Link 
                                to={`/doctor/consultation/${appt.appointment_id}`} 
                                className="inline-flex items-center gap-1.5 bg-teal-600 text-white hover:bg-teal-700 px-4 py-2 rounded-lg text-xs font-semibold shadow-[0_4px_10px_-2px_rgba(20,184,166,0.3)] transition-all"
                              >
                                <Stethoscope size={14} /> {appt.status === 'arrived' ? 'Start' : 'Continue'}
                              </Link>
                            )}

                            {appt.status === 'completed' && (
                              <Link 
                                to={`/doctor/consultation/${appt.appointment_id}`}
                                className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                              >
                                <Eye size={14} /> Review
                              </Link>
                            )}

                            {appt.status === 'scheduled' && (
                              <button 
                                onClick={() => cancelAppointment(appt.appointment_id)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-rose-200/60 hover:border-rose-600"
                              >
                                <XCircle size={14} /> Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}