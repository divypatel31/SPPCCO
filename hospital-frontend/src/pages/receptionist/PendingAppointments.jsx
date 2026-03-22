import React, { useState, useEffect } from 'react';
import { Spinner, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Clock, UserCheck, Search, XCircle, Calendar } from 'lucide-react';
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

// Safe End Time Calculator
const getEndTime = (timeStr) => {
  if (!timeStr) return '';
  let [h, m] = timeStr.split(':').map(Number);
  m += 15;
  if (m >= 60) { h += 1; m -= 60; }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function PendingAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Assignment Modal States
  const [selected, setSelected] = useState(null);
  const [doctorId, setDoctorId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [doctors, setDoctors] = useState([]);

  const fetchData = async () => {
    try {
      const res = await api.get('/receptionist/pending-appointments');
      setAppointments(res.data || []);
    } catch { 
      toast.error('Failed to load pending requests'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Fetch doctors dynamically when an appointment is selected
  useEffect(() => {
    if (selected) {
      api.get(`/receptionist/doctors?department=${selected.department}`)
        .then(res => setDoctors(res.data))
        .catch(() => toast.error("Failed to load available doctors"));
    }
  }, [selected]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!doctorId) { toast.error('Please select a physician'); return; }
    
    setAssigning(true);
    try {
      await api.post('/receptionist/assign-doctor', {
        appointment_id: selected.appointment_id,
        doctor_id: doctorId,
      });
      toast.success('Doctor assigned and appointment approved!');
      setSelected(null);
      setDoctorId('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment request?")) return;
    try {
      await api.post('/receptionist/cancel-appointment', { appointment_id: appointmentId });
      toast.success("Appointment cancelled successfully");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancellation failed");
    }
  };

  const filteredAppts = appointments.filter(a => 
    a.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      <PageHeader title="Awaiting Assignment" subtitle={`You have ${appointments.length} appointment requests requiring doctor assignment.`} />

      {/* --- Search Bar --- */}
      <motion.div variants={FADE_UP_SPRING} className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by patient or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-sm font-normal text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]"
          />
        </div>
      </motion.div>

      {/* --- Table / Empty State --- */}
      {filteredAppts.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <Clock size={32} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Queue is Clear</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">There are no pending appointment requests at this time.</p>
        </motion.div>
      ) : (
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-5 pl-6">Patient Request</th>
                  <th className="p-5">Requested Schedule</th>
                  <th className="p-5">Duration Window</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredAppts.map(appt => (
                    <motion.tr 
                      key={appt.appointment_id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-5 pl-6">
                        <p className="font-semibold text-slate-900 text-sm tracking-tight">{appt.patient_name || '—'}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">{appt.department || '—'}</p>
                      </td>
                      <td className="p-5">
                        <p className="text-sm font-semibold text-slate-900">{formatDate(appt.appointment_date || appt.date)}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{formatTime(appt.appointment_time)}</p>
                      </td>
                      <td className="p-5 text-sm font-medium text-slate-600 flex items-center gap-2 mt-2">
                        {appt.appointment_time ? (
                          <>
                            <span className="bg-slate-100 px-2 py-1 rounded-md text-xs border border-slate-200/60">{formatTime(appt.appointment_time)}</span>
                            <span className="text-slate-400">→</span>
                            <span className="bg-slate-100 px-2 py-1 rounded-md text-xs border border-slate-200/60">{formatTime(getEndTime(appt.appointment_time))}</span>
                          </>
                        ) : '—'}
                      </td>
                      <td className="p-5">
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="p-5 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setSelected(appt); setDoctorId(''); setDoctors([]); }} 
                            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white hover:bg-violet-700 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                          >
                            <UserCheck size={14} /> Assign
                          </button>
                          <button 
                            onClick={() => handleCancel(appt.appointment_id)} 
                            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-rose-200/60 hover:border-rose-600"
                            title="Cancel Request"
                          >
                            <XCircle size={16} />
                          </button>
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

      {/* --- SaaS Assignment Modal --- */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !assigning && setSelected(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", duration: 0.5, bounce: 0 }} className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
              
              <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <UserCheck size={18} className="text-violet-500" /> Assign Physician
                </h2>
              </div>
              
              <form onSubmit={handleAssign} className="p-6 sm:p-8">
                
                {/* Appointment Context Card */}
                <div className="bg-violet-50/50 border border-violet-100/60 rounded-xl p-5 mb-6">
                  <p className="text-sm font-semibold text-slate-900 tracking-tight">{selected.patient_name}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-widest">{selected.department}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs font-semibold text-violet-700 bg-violet-100/50 w-fit px-3 py-1.5 rounded-lg border border-violet-200/50">
                    <Calendar size={14} /> {formatDate(selected.appointment_date)} • {formatTime(selected.appointment_time)}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Select Available Doctor *</label>
                  <select 
                    className="w-full border border-slate-200/60 bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none appearance-none" 
                    value={doctorId} 
                    onChange={e => setDoctorId(e.target.value)} 
                    required
                  >
                    <option value="">Choose a doctor...</option>
                    {doctors.map(doc => (
                      <option key={doc.user_id} value={doc.user_id}>Dr. {doc.full_name}</option>
                    ))}
                  </select>
                  {doctors.length === 0 && doctorId === '' && (
                    <p className="text-xs text-amber-600 mt-2 font-medium">Fetching available doctors for this department...</p>
                  )}
                </div>

                <div className="flex gap-3 pt-8">
                  <button type="button" disabled={assigning} onClick={() => setSelected(null)} className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors w-full">Cancel</button>
                  <button type="submit" disabled={assigning || !doctorId} className="px-6 py-2.5 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2 w-full">
                    {assigning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserCheck size={16} />}
                    {assigning ? 'Processing...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}