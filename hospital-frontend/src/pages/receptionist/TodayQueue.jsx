import React, { useEffect, useState } from 'react';
import { PageHeader, Spinner, EmptyState } from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, X } from 'lucide-react';

export default function TodayQueue() {
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/receptionist/queue?date=${date}`);
      setAppointments(res.data || []);
    } catch {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [date]);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;

    try {
      await api.post('/receptionist/cancel-appointment', {
        appointment_id: id
      });
      toast.success("Appointment cancelled");
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancel failed");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Appointment Queue"
        subtitle={`Viewing appointments for ${formatDate(date)}`}
      />

      {/* Date Selector */}
      <div className="card mb-4 p-4 flex items-center gap-4">
        <label className="font-medium">Select Date:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-field w-auto"
        />
      </div>

      {appointments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Calendar}
            title="No appointments"
            description="No appointments found for this date"
          />
        </div>
      ) : (
        <div className="card p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => (
                  <tr key={appt.appointment_id}>
                    <td>{formatTime(appt.appointment_time)}</td>
                    <td>{appt.patient_name}</td>
                    <td>
                      {appt.doctor_name
                        ? `Dr. ${appt.doctor_name}`
                        : <span className="text-gray-400">Not Assigned</span>
                      }
                    </td>

                    {/* STATUS */}
                    <td>
                      {appt.status === 'cancelled' ? (
                        <span className="text-red-600 font-medium">
                          Cancelled {appt.cancelled_by === 'patient'
                            ? 'by Patient'
                            : appt.cancelled_by === 'receptionist'
                              ? 'by Receptionist'
                              : appt.cancelled_by === 'doctor'
                                ? 'by Doctor'
                                : ''}
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium capitalize">
                          {appt.status}
                        </span>
                      )}
                    </td>

                    {/* ACTION */}
                    <td>
                      {appt.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancel(appt.appointment_id)}
                          className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                        >
                          <X size={12} /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}