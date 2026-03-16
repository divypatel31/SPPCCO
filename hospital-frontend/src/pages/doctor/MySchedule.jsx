import React, { useState, useEffect } from 'react';
import { PageHeader, Spinner } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar as CalendarIcon } from 'lucide-react';

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

  return (
    <div>
      <PageHeader title="My Schedule" subtitle="View your daily time slots and bookings" />

      <div className="card mb-6">
        <label className="label">Select Date</label>
        <input
          type="date"
          className="input-field max-w-xs"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="text-teal-600" />
          <h2 className="font-semibold text-gray-900">
            Schedule for {new Date(selectedDate).toDateString()}
          </h2>
        </div>

        {loading ? (
          <Spinner />
        ) : (
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
                      ? 'bg-teal-50 border-teal-200' 
                      : 'bg-gray-50 border-gray-200 hover:border-teal-100'}`}
                >
                  <span className={`text-sm font-bold ${isBooked ? 'text-teal-800' : 'text-gray-600'}`}>
                    {formatTime12(slot)}
                  </span>
                  
                  {isBooked ? (
                    <>
                      <span className="text-xs text-teal-700 mt-1 font-semibold truncate w-full px-1" title={booking.patient_name}>
                        {booking.patient_name}
                      </span>
                      <span className="text-[10px] text-teal-600 capitalize mt-0.5">{booking.status.replace('_', ' ')}</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 mt-1 font-medium">Available</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}