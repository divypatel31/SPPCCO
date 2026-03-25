import React, { useState, useEffect } from 'react';
import { Spinner } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar as CalendarIcon, Clock, Activity, Users, CheckCircle } from 'lucide-react';
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

export default function MySchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      setLoading(true);
      api.get(`/doctor/my-schedule?date=${selectedDate}`)
        .then(res => setSchedule(res.data || []))
        .catch(() => {
          toast.error("Failed to load schedule");
          setSchedule([]);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedDate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  // Calculate stats for the header
  const totalSlots = TIME_SLOTS.length;
  const bookedSlots = schedule.length;

  return (
    // 🔥 Added px-4 sm:px-6 lg:px-8 here for the perfect side gaps!
    <div className="max-w-7xl mx-auto pb-10 pt-6 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Clean Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Schedule</h1>
          <p className="text-slate-500 text-sm mt-1">View your daily time slots and manage patient bookings</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-lg border border-teal-100 w-fit">
          <Activity className="text-teal-600 w-4 h-4" />
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Live Roster</span>
        </div>
      </motion.div>

      {/* Date Selector Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
            <CalendarIcon size={14} /> Select Working Date
          </label>
          <input
            type="date"
            className="w-full md:max-w-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none transition-all cursor-pointer"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        
        {/* Mini Stats (Only visible if not loading) */}
        {!loading && (
          <div className="flex gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Booked</p>
              <p className="text-2xl font-black text-slate-800 flex items-center gap-2">
                {bookedSlots} <Users size={18} className="text-teal-500" />
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Available</p>
              <p className="text-2xl font-black text-slate-800 flex items-center gap-2">
                {totalSlots - bookedSlots} <CheckCircle size={18} className="text-emerald-500" />
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Schedule Grid Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Card Header & Legend */}
        <div className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-600 rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              <p className="text-sm font-medium text-slate-500">Daily Appointment Grid</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300"></div><span className="text-xs font-bold text-slate-500 uppercase">Open Slot</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-100 border border-teal-300"></div><span className="text-xs font-bold text-slate-500 uppercase">Patient Booked</span></div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <Spinner />
            <p className="text-sm text-slate-500 mt-4 font-medium animate-pulse">Syncing schedule...</p>
          </div>
        ) : (
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
                      ? 'bg-teal-50 border-teal-200 shadow-sm' 
                      : 'bg-white border-slate-100 hover:border-teal-300 hover:shadow-md cursor-default'}`}
                >
                  <span className={`text-base font-bold mb-1 ${isBooked ? 'text-teal-900' : 'text-slate-600'}`}>
                    {formatTime12(slot)}
                  </span>
                  
                  {isBooked ? (
                    <div className="flex flex-col items-center w-full">
                      <span className="text-xs text-teal-700 font-bold truncate w-full text-center px-1" title={booking.patient_name}>
                        {booking.patient_name}
                      </span>
                      <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mt-1 bg-white px-2 py-0.5 rounded-full border border-teal-100 shadow-sm">
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-md mt-1 border border-slate-100">
                      Available
                    </span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}