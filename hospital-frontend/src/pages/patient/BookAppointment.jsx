import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar } from 'lucide-react';

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
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
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
  const today = new Date().toISOString().split('T')[0];
  const [departments, setDepartments] = useState([]);

  /* 🔥 Fetch booked slots */
  useEffect(() => {
    if (form.department && form.appointment_date) {
      api.get('/appointments/booked-slots', {
        params: {
          department: form.department,
          date: form.appointment_date
        }
      })
        .then(res => {
          const times = res.data.map(r => r.appointment_time);
          setBookedSlots(times);
        })
        .catch(() => {
          setBookedSlots([]);
        });
    }
  }, [form.department, form.appointment_date]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/admin/departments');

        // show only active departments
        const activeDepartments = res.data.filter(
          d => d.status === 'active'
        );

        setDepartments(activeDepartments);
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
                value={form.appointment_date}
                onChange={e => setForm({ ...form, appointment_date: e.target.value, start_time: '' })}
                required
              />
            </div>

            {/* Time Slots */}
            <div>
              <label className="label">Preferred Time Slot *</label>
              <p className="text-xs text-gray-500 mb-2">
                Grey slots are already booked.
              </p>

              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(slot => {
                  const isBooked = bookedSlots.includes(slot);

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBooked}
                      onClick={() => !isBooked && setForm({ ...form, start_time: slot })}
                      className={`py-2 px-1 rounded-lg text-xs font-medium border transition-all
                        ${isBooked
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : form.start_time === slot
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                    >
                      {formatTime12(slot)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            {form.department && form.appointment_date && form.start_time && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  Appointment Summary
                </h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><strong>Department:</strong> {form.department}</p>
                  <p><strong>Date:</strong> {new Date(form.appointment_date).toDateString()}</p>
                  <p><strong>Time:</strong> {formatTime12(form.start_time)}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Calendar size={16} />
              )}
              {loading ? 'Booking...' : 'Book Appointment'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}