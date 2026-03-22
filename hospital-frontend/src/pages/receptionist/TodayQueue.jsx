import React, { useEffect, useState } from 'react';
import { PageHeader, Spinner } from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, XCircle, UserCheck, CalendarDays, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animations ---
const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

export default function TodayQueue() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/receptionist/queue?date=${date}`);
      setAppointments(res.data || []);
    } catch {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [date]);

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.post('/receptionist/cancel-appointment', { appointment_id: id });
      toast.success("Appointment cancelled");
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancel failed");
    }
  };

  const handleArrived = async (id) => {
    try {
      await api.put(`/receptionist/arrived/${id}`);
      toast.success("Patient marked as arrived");
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    }
  };

  const filteredAppts = appointments.filter(a => 
    a.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && appointments.length === 0) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      <PageHeader 
        title="Appointment Queue" 
        subtitle={`Managing appointments for ${formatDate(date)}`} 
      />

      {/* --- CONTROLS: DATE & SEARCH --- */}
      <motion.div variants={FADE_UP_SPRING} className="flex flex-col sm:flex-row gap-4 mb-6">
        
        {/* Premium Date Selector */}
        <div className="relative w-full sm:w-auto">
          <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-500" size={16} />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-4 py-2.5 bg-white border border-violet-200/60 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] cursor-pointer"
          />
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by patient or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-sm font-normal text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]"
          />
        </div>

      </motion.div>

      {/* --- TABLE / EMPTY STATE --- */}
      {filteredAppts.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] mt-4">
          <Calendar className="text-slate-300 mb-4" size={32} />
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">No Appointments</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">No scheduled visits found for this specific date.</p>
        </motion.div>
      ) : (
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden relative">
          
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
               <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            </div>
          )}

          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-5 pl-6">Time Block</th>
                  <th className="p-5">Patient Name</th>
                  <th className="p-5">Assigned Doctor</th>
                  <th className="p-5">Encounter Status</th>
                  <th className="p-5 pr-6 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredAppts.map(appt => (
                    <motion.tr 
                      key={appt.appointment_id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-5 pl-6">
                        <div className="text-center w-fit bg-slate-50 border border-slate-200/60 p-2 rounded-lg shadow-sm">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Start</p>
                          <p className="text-sm font-bold text-violet-700 tracking-tight">{formatTime(appt.appointment_time)}</p>
                        </div>
                      </td>
                      <td className="p-5">
                        <p className="font-semibold text-slate-900 text-sm tracking-tight">{appt.patient_name}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">{appt.department || 'General'}</p>
                      </td>
                      <td className="p-5 text-sm font-medium text-slate-600">
                        {appt.doctor_name ? `Dr. ${appt.doctor_name}` : <span className="italic text-slate-400">Not Assigned</span>}
                      </td>
                      <td className="p-5">
                        {/* CUSTOM STATUS RENDERER BASED ON YOUR OLD CODE */}
                        {appt.status === 'cancelled' ? (
                          <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
                            Cancelled {appt.cancelled_by === 'patient' ? '(Patient)' : appt.cancelled_by === 'receptionist' ? '(Reception)' : appt.cancelled_by === 'doctor' ? '(Doctor)' : ''}
                          </span>
                        ) : appt.status === 'pending' ? (
                          <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60">
                            Pending Approval
                          </span>
                        ) : appt.status === 'scheduled' ? (
                          <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
                            Scheduled
                          </span>
                        ) : appt.status === 'arrived' ? (
                          <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Arrived
                          </span>
                        ) : appt.status === 'in_consultation' ? (
                          <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200/60">
                            In Consultation
                          </span>
                        ) : appt.status === 'completed' ? (
                          <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/60">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200/60">
                            {appt.status}
                          </span>
                        )}
                      </td>
                      <td className="p-5 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          
                          {/* ARRIVED BUTTON */}
                          {appt.status === 'scheduled' && (
                            <button 
                              onClick={() => handleArrived(appt.appointment_id)} 
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-violet-200/60 hover:border-violet-600"
                            >
                              <UserCheck size={14} /> Arrive
                            </button>
                          )}

                          {/* CANCEL BUTTON */}
                          {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                            <button 
                              onClick={() => handleCancel(appt.appointment_id)} 
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-rose-200/60 hover:border-rose-600"
                              title="Cancel Appointment"
                            >
                              <XCircle size={14} /> Cancel
                            </button>
                          )}

                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}