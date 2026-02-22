import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader } from '../../components/common';
import { formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Users, CheckCircle } from 'lucide-react';

export default function TodayQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);

  const fetchQueue = async () => {
    try {
      const res = await api.get('/receptionist/today-queue');
      // Filter today
      setQueue(res.data || []);
    } catch { toast.error('Failed to load queue'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, []);

  const markArrived = async (id) => {
    setMarking(id);
    try {
      await api.put(`/receptionist/mark-arrived/${id}`);
      toast.success('Patient marked as arrived!');
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setMarking(null);
    }
  };

  if (loading) return <Spinner />;

  const statusOrder = { scheduled: 0, arrived: 1, in_consultation: 2 };
  const sorted = [...queue].sort((a, b) => {
    const statusDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
    if (statusDiff !== 0) return statusDiff;
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  return (
    <div>
      <PageHeader title="Today's Queue" subtitle={`${queue.length} patients scheduled today`} />

      {sorted.length === 0 ? (
        <div className="card">
          <EmptyState icon={Users} title="Queue is empty" description="No scheduled appointments for today" />
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((appt, idx) => (
            <div key={appt.appointment_id} className={`card flex items-center justify-between ${appt.status === 'arrived' ? 'border-blue-200 bg-blue-50' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm flex-shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{appt.patient_name || 'Patient'}</p>
                  <p className="text-xs text-gray-500">
                    {appt.department} · Dr. {appt.doctor_name || 'Not assigned'} · {formatTime(appt.start_time)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={appt.status} />
                {appt.status === 'scheduled' && (
                  <button
                    onClick={() => markArrived(appt.appointment_id)}
                    disabled={marking === (appt._id || appt.id)}
                    className="btn-success text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    {marking === (appt._id || appt.id) ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    ) : <CheckCircle size={12} />}
                    Mark Arrived
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
