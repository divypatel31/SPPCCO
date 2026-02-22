import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StatCard, Spinner, StatusBadge, EmptyState } from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, Users, CheckCircle, Clock, ArrowRight } from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/doctor/appointments')
      .then(res => setAppointments(res.data || []))
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => {
    const d = a.appointment_date || a.date || '';
    return d.startsWith(today) && ['scheduled', 'arrived', 'in_consultation'].includes(a.status);
  });
  const pending = appointments.filter(a => a.status === 'arrived');
  const completed = appointments.filter(a => a.status === 'completed');

  return (
    <div>
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold">Dr. {user?.name || 'Doctor'}</h1>
        <p className="text-teal-100 mt-1">{user?.department || 'General Medicine'} · Today: {new Date().toDateString()}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Calendar} label="Today's Appointments" value={todayAppts.length} color="teal" />
        <StatCard icon={Users} label="Patients Waiting" value={pending.length} color="orange" />
        <StatCard icon={CheckCircle} label="Completed Today" value={completed.filter(a => (a.appointment_date || '').startsWith(today)).length} color="green" />
        <StatCard icon={Clock} label="Total Appointments" value={appointments.length} color="blue" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Today's Schedule</h2>
          <Link to="/doctor/appointments" className="text-teal-600 text-sm flex items-center gap-1 hover:underline">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {todayAppts.length === 0 ? (
          <EmptyState icon={Calendar} title="No appointments today" description="You have a clear schedule for today" />
        ) : (
          <div className="space-y-3">
            {todayAppts.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')).map(appt => (
              <div key={appt._id || appt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-teal-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[60px]">
                    <p className="text-xs text-gray-500">Start</p>
                    <p className="text-sm font-semibold text-gray-900">{formatTime(appt.start_time)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{appt.patient_name || 'Patient'}</p>
                    <p className="text-xs text-gray-500">{appt.department || 'General'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={appt.status} />
                  {['arrived', 'in_consultation'].includes(appt.status) && (
                    <Link
                      to={`/doctor/consultation/${appt._id || appt.id}`}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      {appt.status === 'arrived' ? 'Start' : 'Continue'}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
