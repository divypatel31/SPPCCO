import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Spinner, EmptyState, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, Stethoscope } from 'lucide-react';

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/doctor/appointments')
      .then(res => setAppointments(res.data || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

  const cancelAppointment = async (id) => {
    const confirmCancel = window.confirm("Cancel this appointment?");
    if (!confirmCancel) return;

    try {
      const res = await api.put(`/doctor/cancel/${id}`);

      toast.success(res.data.message || "Appointment cancelled");

      // Immediately update UI instead of waiting for fetch
      setAppointments(prev =>
        prev.map(appt =>
          appt.appointment_id === id
            ? { ...appt, status: "cancelled" }
            : appt
        )
      );

    } catch (err) {
      console.log(err.response?.data);
      toast.error(err.response?.data?.message || "Cancel failed");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="My Appointments" subtitle={`${appointments.length} total appointments`} />

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'scheduled', 'arrived', 'in_consultation', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            {f.replace(/_/g, ' ')} {f === 'all' && `(${appointments.length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={Calendar} title="No appointments found" description="No appointments match the selected filter" />
        </div>
      ) : (
        <div className="card p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(appt => (
                  <tr key={appt.appointment_id}>
                    <td className="font-medium">{appt.patient_name || '—'}</td>
                    <td>{appt.department || '—'}</td>
                    <td>{formatDate(appt.appointment_date || appt.date)}</td>
                    <td>{appt.start_time ? `${formatTime(appt.start_time)}` : '—'}</td>
                    <td><StatusBadge status={appt.status} /></td>
                    <td>
                      {['arrived', 'in_consultation'].includes(appt.status) && (
                        <Link
                          to={`/doctor/consultation/${appt.appointment_id}`}
                          className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-800 font-medium"
                        >
                          <Stethoscope size={14} />
                          {appt.status === 'arrived' ? 'Start Consult' : 'Continue'}
                        </Link>
                      )}

                      {appt.status === 'completed' && (
                        <span className="text-gray-400 text-xs">Completed</span>
                      )}

                      {appt.status === 'scheduled' && (
                        <button
                          onClick={() => cancelAppointment(appt.appointment_id)}
                          className="btn-danger"
                        >
                          Cancel
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
