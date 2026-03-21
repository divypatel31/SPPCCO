import React, { useState, useEffect } from 'react';
import { PageHeader, Spinner, EmptyState } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar as CalendarIcon, User } from 'lucide-react';

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
        // 🔥 FIXED: Removed the auto-select so it starts blank!
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

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Doctor Schedules" subtitle="View appointments and available slots per doctor" />

      <div className="card mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="label">Select Doctor</label>
          <select
            className="input-field"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            {/* 🔥 FIXED: Added a default empty option */}
            <option value="">-- Select a Doctor --</option>
            {doctors.map(doc => (
              <option key={doc.user_id} value={doc.user_id}>
                Dr. {doc.full_name} ({doc.department})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="label">Select Date</label>
          <input
            type="date"
            className="input-field"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {selectedDoctor && selectedDate ? (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="text-blue-600" />
            <h2 className="font-semibold text-gray-900">
              Schedule for {new Date(selectedDate).toDateString()}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {TIME_SLOTS.map(slot => {
              // Check if slot is booked (starts with handles 09:00:00 vs 09:00)
              const booking = schedule.find(s => s.appointment_time.startsWith(slot));
              const isBooked = !!booking;

              return (
                <div
                  key={slot}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center min-h-[80px] transition-all
                    ${isBooked 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-green-50 border-green-200'}`}
                >
                  <span className={`text-sm font-bold ${isBooked ? 'text-red-700' : 'text-green-700'}`}>
                    {formatTime12(slot)}
                  </span>
                  
                  {isBooked ? (
                    <>
                      <span className="text-xs text-red-600 mt-1 font-semibold truncate w-full px-1" title={booking.patient_name}>
                        {booking.patient_name}
                      </span>
                      <span className="text-[10px] text-red-400 capitalize mt-0.5">{booking.status}</span>
                    </>
                  ) : (
                    <span className="text-xs text-green-600 mt-1 font-medium">Available</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState icon={User} title="No doctor selected" description="Please select a doctor to view their schedule." />
      )}
    </div>
  );
}