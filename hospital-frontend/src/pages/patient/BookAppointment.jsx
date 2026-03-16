import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar } from 'lucide-react';

// Organized time slots logically (15-minute intervals)
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

// 🔥 NEW: Automatically calculates end time (+15 mins) based on start time
const getEndTime = (timeStr) => {
  if (!timeStr) return '';
  let [h, m] = timeStr.split(':').map(Number);
  m += 15; // Adds 15 minutes for the slot duration
  if (m >= 60) {
    h += 1;
    m -= 60;
  }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function BookAppointment() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    department: '',
    appointment_date: '',
    start_time: ''
  });

  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Calculate allowed date range (Today to +7 Days)
  const todayDateObj = new Date();
  const today = todayDateObj.toISOString().split('T')[0];

  const maxDateObj = new Date();
  maxDateObj.setDate(todayDateObj.getDate() + 7);
  const maxDate = maxDateObj.toISOString().split('T')[0];

  /* Fetch booked slots when department or date changes */
  useEffect(() => {
    if (form.department && form.appointment_date) {
      api.get('/appointments/booked-slots', {
        params: {
          department: form.department,
          date: form.appointment_date
        }
      })
        .then(res => {
          // 🔥 FIX: MySQL sends "09:00:00". We use .slice(0, 5) to chop off the seconds!
          // This makes it perfectly match "09:00" in our frontend array.
          const times = res.data.map(r => r.appointment_time.slice(0, 5));
          setBookedSlots(times);
        })
        .catch(() => {
          setBookedSlots([]);
        });
    }
  }, [form.department, form.appointment_date]);
  /* Fetch available departments on load */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments/public');
        setDepartments(res.data);
      } catch (err) {
        toast.error('Failed to load departments');
      }
    };
    fetchDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.department || !form.appointment_date || !form.start_time) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/appointments/book', form);
      toast.success('Appointment booked successfully!');
      navigate('/patient/appointments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const isPastTimeSlot = (slotTime) => {
    if (!form.appointment_date) return true;

    const now = new Date();
    const selectedDate = new Date(form.appointment_date);

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedMidnight = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

    if (selectedMidnight < todayMidnight) return true;
    if (selectedMidnight > todayMidnight) return false;

    if (selectedMidnight.getTime() === todayMidnight.getTime()) {
      const [slotHour, slotMinute] = slotTime.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (slotHour < currentHour) return true;
      if (slotHour === currentHour && slotMinute <= currentMinute) return true;
    }

    return false;
  };

  return (
    <div>
      <PageHeader
        title="Book Appointment"
        subtitle="Select department, date and time slot"
      />

      <div className="max-w-xl">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Department */}
            <div>
              <label className="label">Department *</label>
              <select
                className="input-field"
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value, start_time: '' })}
                required
              >
                <option value="">Select a department</option>
                {departments.map(d => (
                  <option key={d.department_id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="label">Preferred Date *</label>
              <input
                type="date"
                className="input-field"
                min={today}
                max={maxDate}
                value={form.appointment_date}
                onChange={e => setForm({ ...form, appointment_date: e.target.value, start_time: '' })}
                required
              />
            </div>

            {/* Time Slots */}
            {form.appointment_date && (
              <div>
                <label className="label">Preferred Time Slot *</label>
                <p className="text-xs text-gray-500 mb-2">
                  Grey slots are already booked or have passed.
                </p>

                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(slot => {
                    const isBooked = bookedSlots.includes(slot);
                    const isPast = isPastTimeSlot(slot);
                    const disabled = isBooked || isPast;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && setForm({ ...form, start_time: slot })}
                        className={`py-2 px-1 rounded-lg text-xs font-medium border transition-all
                          ${disabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-100'
                            : form.start_time === slot
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                      >
                        {formatTime12(slot)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 🔥 FIXED Summary Box - Removed form.end_time condition */}
            {form.department && form.appointment_date && form.start_time && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  Appointment Summary
                </h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><strong>Department:</strong> {form.department}</p>

                  {/* Date Formatting */}
                  <p><strong>Date:</strong> {new Date(form.appointment_date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}</p>

                  {/* Automatically calculates and formats start and end time */}
                  <p>
                    <strong>Time:</strong> {formatTime12(form.start_time)} - {formatTime12(getEndTime(form.start_time))}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !form.department || !form.appointment_date || !form.start_time}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Calendar size={16} />
              )}
              {loading ? 'Processing...' : 'Book Appointment'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}