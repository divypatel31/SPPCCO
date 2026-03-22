import React, { useState, useEffect } from 'react';
import { Spinner, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments/my');
      setAppointments(res.data || []);
    } catch { toast.error('Failed to load appointments'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.put(`/appointments/cancel/${id}`);
      toast.success('Appointment cancelled successfully');
      fetchAppointments();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot cancel this appointment'); }
  };

  const canCancel = (date, time) => {
    if (!date || !time) return false;
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    if (date > currentDate) return true;
    if (date === currentDate) {
      const [hour, minute] = time.slice(0, 5).split(':');
      const appointmentMinutes = parseInt(hour) * 60 + parseInt(minute);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return (appointmentMinutes - currentMinutes) > 60;
    }
    return false;
  };

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      <PageHeader title="My Appointments" subtitle={`You have ${appointments.length} total appointments on record.`} />

      {appointments.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-[24px] p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-center mb-4">
            <Calendar size={28} className="text-sky-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">No Appointments Found</h3>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-sm">You haven't booked any consultations yet. Schedule your first visit to get started.</p>
        </motion.div>
      ) : (
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-5 pl-6">Division & Doctor</th>
                  <th className="p-5">Schedule</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {appointments.map(appt => {
                    const allowCancel = ['pending', 'scheduled'].includes(appt.status) && canCancel(appt.appointment_date, appt.appointment_time);
                    return (
                      <motion.tr key={appt.appointment_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group">
                        <td className="p-5 pl-6">
                          <p className="text-sm font-semibold text-slate-900 tracking-tight">{appt.department || 'General'}</p>
                          <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                            {appt.doctor_name ? `Dr. ${appt.doctor_name}` : <span className="italic opacity-70">Awaiting Assignment</span>}
                          </p>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Calendar size={14} className="text-slate-400" /> {formatDate(appt.appointment_date || appt.date)}
                          </div>
                          <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 mt-1">
                            <Clock size={14} className="text-slate-400" /> {appt.appointment_time ? formatTime(appt.appointment_time) : '—'}
                          </div>
                        </td>
                        <td className="p-5">
                          {appt.status === 'cancelled' ? (
                            <span className="text-[11px] font-medium uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-md">
                              Cancelled {appt.cancelled_by ? `(${appt.cancelled_by})` : ''}
                            </span>
                          ) : (
                            <StatusBadge status={appt.status} />
                          )}
                        </td>
                        <td className="p-5 pr-6 text-right">
                          {['pending', 'scheduled'].includes(appt.status) && (
                            allowCancel ? (
                              <button onClick={() => handleCancel(appt.appointment_id)} className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors opacity-60 group-hover:opacity-100">
                                <X size={14} /> Cancel
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400 italic">Locked (&lt;1hr)</span>
                            )
                          )}
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