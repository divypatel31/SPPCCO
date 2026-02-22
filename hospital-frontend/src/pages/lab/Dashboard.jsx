import React, { useState, useEffect } from 'react';
import { StatCard, Spinner, StatusBadge, EmptyState } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FlaskConical, Clock, CheckCircle, Activity } from 'lucide-react';

export default function LabDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = { user: JSON.parse(localStorage.getItem('hms_user') || '{}') };

  useEffect(() => {
    api.get('/lab-request')
      .then(res => setRequests(res.data || []))
      .catch(() => toast.error('Failed to load lab requests'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const pending = requests.filter(r => r.status === 'pending');
  const inProgress = requests.filter(r => r.status === 'in_progress');
  const completed = requests.filter(r => r.status === 'completed');

  return (
    <div>
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold">Lab Dashboard</h1>
        <p className="text-orange-100 mt-1">{user?.department || 'Laboratory'} · {new Date().toDateString()}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Clock} label="Pending Tests" value={pending.length} color="orange" />
        <StatCard icon={Activity} label="In Progress" value={inProgress.length} color="blue" />
        <StatCard icon={CheckCircle} label="Completed" value={completed.length} color="green" />
        <StatCard icon={FlaskConical} label="Total Requests" value={requests.length} color="purple" />
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Pending Tests</h2>
        {pending.length === 0 ? (
          <EmptyState icon={FlaskConical} title="No pending tests" description="All tests are up to date" />
        ) : (
          <div className="space-y-3">
            {pending.map(req => (
              <div key={req._id || req.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
                <div>
                  <p className="font-medium text-gray-900">{req.test_name || req.test}</p>
                  <p className="text-xs text-gray-500">Patient: {req.patient_name} · Dr. {req.doctor_name}</p>
                  <p className="text-xs text-gray-400">{formatDate(req.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {req.priority === 'urgent' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">URGENT</span>}
                  <StatusBadge status={req.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
