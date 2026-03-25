import React, { useState, useEffect } from 'react';
import { Spinner } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar as CalendarIcon, User, Clock, Activity, Search, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';

const TIME_SLOTS = [
  '09:00', '09:15', '09:30', '09:45',
  '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45',
  '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:15', '15:30', '15:45',
  '16:00', '16:15', '16:30', '16:45',
];

const formatTime12 = (t) => {
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
};

export default function DoctorSchedules() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all active doctors on load
  useEffect(() => {
    api.get('/receptionist/all-doctors')
      .then(res => {
        setDoctors(res.data || []);
      })
      .catch(() => toast.error("Failed to load doctors"))
      .finally(() => setLoading(false));
  }, []);

  // Fetch schedule when doctor or date changes
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      api.get(`/receptionist/doctor-schedule?doctor_id=${selectedDoctor}&date=${selectedDate}`)
        .then(res => setSchedule(res.data || []))
        .catch(() => setSchedule([]));
    }
  }, [selectedDoctor, selectedDate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  if (loading) return <Spinner />;

  return (
    // 🔥 FIX: Added "px-4 sm:px-6 lg:px-8" here so it never touches the edges!
    <div className="max-w-7xl mx-auto pb-10 pt-6 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Clean Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Doctor Schedules</h1>
          <p className="text-slate-500 text-sm mt-1">View appointments and manage available slots</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-100 w-fit">
          <Activity className="text-blue-600 w-4 h-4" />
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Live Updates</span>
        </div>
      </motion.div>

      {/* Filters Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
          <Search size={18} className="text-slate-400" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Search Criteria</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Stethoscope size={14} /> Select Doctor
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all cursor-pointer"
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
            >
              <option value="">-- Choose a Medical Professional --</option>
              {doctors.map(doc => (
                <option key={doc.user_id} value={doc.user_id}>
                  Dr. {doc.full_name} ({doc.department})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <CalendarIcon size={14} /> Select Date
            </label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {/* Schedule Grid Card */}
      {selectedDoctor && selectedDate ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                <Clock size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
                <p className="text-sm font-medium text-slate-500">
                  {doctors.find(d => String(d.user_id) === String(selectedDoctor))?.full_name 
                    ? `Dr. ${doctors.find(d => String(d.user_id) === String(selectedDoctor)).full_name}'s Schedule` 
                    : 'Daily Schedule'}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></div><span className="text-xs font-bold text-slate-500 uppercase">Available</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-100 border border-rose-300"></div><span className="text-xs font-bold text-slate-500 uppercase">Booked</span></div>
            </div>
          </div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-6 md:p-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {TIME_SLOTS.map(slot => {
              const booking = schedule.find(s => s.appointment_time.startsWith(slot));
              const isBooked = !!booking;

              return (
                <motion.div
                  key={slot}
                  variants={itemVariants}
                  className={`relative p-4 rounded-xl border-2 flex flex-col items-center justify-center min-h-[100px] transition-all
                    ${isBooked 
                      ? 'bg-rose-50 border-rose-200 shadow-sm' 
                      : 'bg-white border-slate-100 hover:border-emerald-300 hover:shadow-md cursor-default'}`}
                >
                  <span className={`text-base font-bold mb-1 ${isBooked ? 'text-rose-700' : 'text-slate-700'}`}>
                    {formatTime12(slot)}
                  </span>
                  
                  {isBooked ? (
                    <div className="flex flex-col items-center w-full">
                      <span className="text-xs text-rose-600 font-bold truncate w-full text-center px-1" title={booking.patient_name}>
                        {booking.patient_name}
                      </span>
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mt-1 bg-white px-2 py-0.5 rounded-full border border-rose-100">
                        {booking.status}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md mt-1 border border-emerald-100">
                      Available
                    </span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      ) : (
        /* Empty State */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <User size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Doctor Selected</h3>
          <p className="text-slate-500 max-w-sm">Please select a medical professional and a date from the filters above to view their daily schedule and appointments.</p>
        </motion.div>
      )}
    </div>
  );
}