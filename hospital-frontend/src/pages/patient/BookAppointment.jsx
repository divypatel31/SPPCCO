import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, Building2, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TIME_SLOTS = [
  '09:00', '09:15', '09:30', '09:45',
  '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45',
  '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:15', '15:30', '15:45',
  '16:00', '16:15', '16:30', '16:45',
];

const formatTime12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
};

const getEndTime = (timeStr) => {
  if (!timeStr) return '';
  let [h, m] = timeStr.split(':').map(Number);
  m += 15;
  if (m >= 60) { h += 1; m -= 60; }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// --- Animations ---
const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

export default function BookAppointment() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ department: '', appointment_date: '', start_time: '' });
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [departments, setDepartments] = useState([]);

  const todayDateObj = new Date();
  const today = todayDateObj.toISOString().split('T')[0];
  const maxDateObj = new Date(); maxDateObj.setDate(todayDateObj.getDate() + 7);
  const maxDate = maxDateObj.toISOString().split('T')[0];

  useEffect(() => {
    if (form.department && form.appointment_date) {
      api.get('/appointments/booked-slots', { params: { department: form.department, date: form.appointment_date } })
        .then(res => setBookedSlots(res.data.map(r => r.appointment_time.slice(0, 5))))
        .catch(() => setBookedSlots([]));
    }
  }, [form.department, form.appointment_date]);

  useEffect(() => {
    api.get('/departments/public').then(res => setDepartments(res.data)).catch(() => toast.error('Failed to load departments'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.department || !form.appointment_date || !form.start_time) return toast.error('Please complete all steps');
    
    setLoading(true);
    try {
      await api.post('/appointments/book', form);
      toast.success('Consultation booked successfully!');
      navigate('/patient/appointments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally { setLoading(false); }
  };

  const isPastTimeSlot = (slotTime) => {
    if (!form.appointment_date) return true;
    const now = new Date(); const selectedDate = new Date(form.appointment_date);
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedMidnight = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

    if (selectedMidnight < todayMidnight) return true;
    if (selectedMidnight > todayMidnight) return false;
    if (selectedMidnight.getTime() === todayMidnight.getTime()) {
      const [slotHour, slotMinute] = slotTime.split(':').map(Number);
      if (slotHour < now.getHours()) return true;
      if (slotHour === now.getHours() && slotMinute <= now.getMinutes()) return true;
    }
    return false;
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="p-4 sm:p-8 max-w-[1200px] mx-auto font-sans">
      
      <motion.div variants={FADE_UP_SPRING} className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Schedule Consultation</h1>
        <p className="text-slate-500 font-medium mt-1">Select a department, date, and available time slot.</p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        
        {/* --- LEFT: BOOKING FORM --- */}
        <motion.div variants={FADE_UP_SPRING} className="lg:col-span-2 bg-white rounded-[24px] p-6 sm:p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Step 1: Department */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">1</div>
                <h3 className="font-semibold text-slate-900 tracking-tight">Select Division</h3>
              </div>
              <div className="pl-9">
                <div className="relative">
                  <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none appearance-none transition-all"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value, start_time: '' })}
                    required
                  >
                    <option value="">Choose a medical department...</option>
                    {departments.map(d => <option key={d.department_id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Date */}
            <AnimatePresence>
              {form.department && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">2</div>
                    <h3 className="font-semibold text-slate-900 tracking-tight">Choose Date</h3>
                  </div>
                  <div className="pl-9">
                    <input
                      type="date"
                      min={today}
                      max={maxDate}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
                      value={form.appointment_date}
                      onChange={e => setForm({ ...form, appointment_date: e.target.value, start_time: '' })}
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 3: Time Slot */}
            <AnimatePresence>
              {form.appointment_date && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">3</div>
                      <h3 className="font-semibold text-slate-900 tracking-tight">Select Availability</h3>
                    </div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-slate-200" /> Unavailable
                    </div>
                  </div>
                  
                  <div className="pl-9">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {TIME_SLOTS.map(slot => {
                        const isBooked = bookedSlots.includes(slot);
                        const isPast = isPastTimeSlot(slot);
                        const disabled = isBooked || isPast;
                        const isSelected = form.start_time === slot;

                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={disabled}
                            onClick={() => !disabled && setForm({ ...form, start_time: slot })}
                            className={`relative overflow-hidden py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-300
                              ${disabled ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100' 
                                : isSelected ? 'bg-sky-500 text-white border border-sky-600 shadow-md shadow-sky-500/20' 
                                : 'bg-white text-slate-700 border border-slate-200/80 hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-700'
                              }`}
                          >
                            {formatTime12(slot)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        {/* --- RIGHT: LIVE SUMMARY TICKET --- */}
        <motion.div variants={FADE_UP_SPRING} className="lg:col-span-1 sticky top-8">
          <div className="bg-slate-50/50 rounded-[24px] p-6 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden">
            
            {form.start_time && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-blue-600" />}

            <h3 className="font-semibold text-slate-900 tracking-tight mb-6 flex items-center gap-2">
              <CheckCircle2 size={18} className={form.start_time ? "text-sky-500" : "text-slate-300"} /> 
              Booking Summary
            </h3>

            <div className="space-y-5">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Division</span>
                <span className="text-sm font-medium text-slate-800">{form.department || 'Not selected'}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Date</span>
                <span className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  {form.appointment_date ? new Date(form.appointment_date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : 'Not selected'}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Time Window</span>
                <span className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  {form.start_time ? `${formatTime12(form.start_time)} - ${formatTime12(getEndTime(form.start_time))}` : 'Not selected'}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200/60">
              <button
                onClick={handleSubmit}
                disabled={loading || !form.department || !form.appointment_date || !form.start_time}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-medium shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Confirm Booking</span>}
                {!loading && <ArrowRight size={16} />}
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-3 font-medium">Standard consultation fees apply.</p>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}