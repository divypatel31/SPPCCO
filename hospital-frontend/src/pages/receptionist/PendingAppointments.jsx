import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader, Modal } from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Clock, UserCheck } from 'lucide-react';

export default function PendingAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [doctorId, setDoctorId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [doctors, setDoctors] = useState([]);

  const fetchData = async () => {
    try {
      const res = await api.get('/receptionist/pending-appointments');
      setAppointments(res.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selected) {
      api.get(`/receptionist/doctors?department=${selected.department}`)
        .then(res => setDoctors(res.data))
        .catch(() => toast.error("Failed to load doctors"));
    }
  }, [selected]);


  const handleAssign = async () => {
    if (!doctorId) { toast.error('Enter doctor ID'); return; }
    setAssigning(true);
    try {
      await api.post('/receptionist/assign-doctor', {
        appointment_id: selected.appointment_id,
        doctor_id: doctorId,
      });
      toast.success('Doctor assigned successfully!');
      setSelected(null);
      setDoctorId('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Pending Appointment Requests"
        subtitle="Assign doctors to pending appointments"
      />

      {appointments.length === 0 ? (
        <div className="card">
          <EmptyState icon={Clock} title="No pending appointments" description="All appointments have been assigned doctors" />
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
                  <th>End Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => (
                  <tr key={appt.appointment_id}>
                    <td className="font-medium">{appt.patient_name || '—'}</td>
                    <td>{appt.department || '—'}</td>
                    <td>{formatDate(appt.appointment_date || appt.date)}</td>
                    <td>{formatTime(appt.appointment_time)}</td>
                    <td className="text-gray-500">
                      {appt.appointment_time ? (() => {
                        const [h, m] = appt.appointment_time.split(':');
                        const end = new Date();
                        end.setHours(parseInt(h), parseInt(m) + 15);
                        return formatTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
                      })() : '—'}
                    </td>
                    <td><StatusBadge status={appt.status} /></td>
                    <td>
                      <button
                        onClick={() => { setSelected(appt); setDoctorId(''); }}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <UserCheck size={12} /> Assign Doctor
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Assign Doctor">
        {selected && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-semibold text-gray-900">{selected.patient_name}</p>
              <p className="text-xs text-gray-500">{selected.department} · {formatDate(selected.appointment_date)} · {formatTime(formatTime(selected.appointment_time))}</p>
              <p className="text-xs text-blue-600 mt-1">Duration: 15 min → ends {(() => {
                const [h, m] = (selected.appointment_time || '00:00').split(':');
                const end = new Date();
                end.setHours(parseInt(h), parseInt(m) + 15);
                return formatTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
              })()}</p>
            </div>
            <div>
              <label className="label">Select Doctor *</label>
              <select
                className="input-field"
                value={doctorId}
                onChange={e => setDoctorId(e.target.value)}
              >
                <option value="">Select Doctor</option>
                {doctors.map(doc => (
                  <option key={doc.user_id} value={doc.user_id}>
                    Dr. {doc.full_name}
                  </option>
                ))}
              </select>

              <p className="text-xs text-gray-400 mt-1">
                Select an available doctor from this department
              </p>

            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleAssign} disabled={assigning} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {assigning ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : null}
                {assigning ? 'Assigning...' : 'Assign Doctor'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
