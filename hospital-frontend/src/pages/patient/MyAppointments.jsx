import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, X } from 'lucide-react';

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments/my');
      setAppointments(res.data || []);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;

    try {
      await api.put(`/appointments/cancel/${id}`);
      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel this appointment');
    }
  };

  // 1 Hour Rule
  const canCancel = (date, time) => {
    if (!date || !time) return false;

    // Format current date/time as local
    const now = new Date();

    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    // If appointment is future date → allow cancel
    if (date > currentDate) return true;

    // If appointment is today → check 1 hour rule
    if (date === currentDate) {
      const [hour, minute] = time.slice(0, 5).split(':');

      const appointmentMinutes = parseInt(hour) * 60 + parseInt(minute);
      const currentMinutes =
        now.getHours() * 60 + now.getMinutes();

      return (appointmentMinutes - currentMinutes) > 60;
    }

    // Past date
    return false;
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="My Appointments"
        subtitle={`${appointments.length} total appointments`}
      />

      {appointments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Calendar}
            title="No appointments found"
            description="Book your first appointment to get started"
          />
        </div>
      ) : (
        <div className="card p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => {
                  const allowCancel =
                    ['pending', 'scheduled'].includes(appt.status) &&
                    canCancel(appt.appointment_date, appt.appointment_time);

                  return (
                    <tr key={appt.appointment_id}>
                      <td className="font-medium">
                        {appt.department || '—'}
                      </td>

                      <td>
                        {formatDate(appt.appointment_date || appt.date)}
                      </td>

                      <td>
                        {appt.appointment_time
                          ? formatTime(appt.appointment_time)
                          : '—'}
                      </td>

                      <td>
                        {appt.doctor_name
                          ? `Dr. ${appt.doctor_name}`
                          : (
                            <span className="text-gray-400 italic">
                              Not assigned yet
                            </span>
                          )}
                      </td>

                      {/* STATUS COLUMN */}
                      <td>
                        {appt.status === 'cancelled' ? (
                          <span className="text-red-600 font-medium">
                            Cancelled {appt.cancelled_by === 'patient'
                              ? 'by You'
                              : appt.cancelled_by === 'receptionist'
                                ? 'by Receptionist'
                                : appt.cancelled_by === 'doctor'
                                  ? 'by Doctor'
                                  : ''}
                          </span>
                        ) : (
                          <StatusBadge status={appt.status} />
                        )}
                      </td>

                      {/* ACTION COLUMN */}
                      <td>
                        {['pending', 'scheduled'].includes(appt.status) && (
                          canCancel(appt.appointment_date, appt.appointment_time) ? (
                            <button
                              onClick={() => handleCancel(appt.appointment_id)}
                              className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                            >
                              <X size={12} /> Cancel
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              Cannot cancel (less than 1 hour)
                            </span>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}