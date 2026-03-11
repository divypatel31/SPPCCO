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
  
  // Filter for today's active schedule
  const todayAppts = appointments.filter(a => {
    const d = a.appointment_date || a.date || '';
    return d.startsWith(today) && ['scheduled', 'arrived', 'in_consultation'].includes(a.status);
  });

  const pending = appointments.filter(a => a.status === 'arrived');
  const completed = appointments.filter(a => a.status === 'completed');

  return (
    <div>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 mb-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Dr. {user?.name || 'Doctor'}</h1>
        <p className="text-teal-100 mt-1">
          {user?.department || 'General Medicine'} · Today: {new Date().toDateString()}
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Calendar} label="Today's Appointments" value={todayAppts.length} color="teal" />
        <StatCard icon={Users} label="Patients Waiting" value={pending.length} color="orange" />
        <StatCard icon={CheckCircle} label="Completed Today" value={completed.filter(a => (a.appointment_date || '').startsWith(today)).length} color="green" />
        <StatCard icon={Clock} label="Total Appointments" value={appointments.length} color="blue" />
      </div>

      {/* Today's Schedule List */}
      <div className="card shadow-sm border border-gray-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-gray-900 text-lg">Today's Schedule</h2>
          <Link to="/doctor/appointments" className="text-teal-600 text-sm font-semibold flex items-center gap-1 hover:text-teal-700">
            View all appointments <ArrowRight size={14} />
          </Link>
        </div>

        {todayAppts.length === 0 ? (
          <EmptyState 
            icon={Calendar} 
            title="No appointments today" 
            description="Your schedule is clear for the rest of the day." 
          />
        ) : (
          <div className="space-y-3">
            {todayAppts
              .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
              .map(appt => {
                // 🔥 FIX: Correct ID mapping for MySQL compatibility
                const actualId = appt.appointment_id || appt.id || appt._id;

                return (
                  <div 
                    key={actualId} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-teal-50 transition-all border border-transparent hover:border-teal-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[70px] bg-white p-2 rounded-lg shadow-sm">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Start</p>
                        <p className="text-sm font-bold text-teal-700">{formatTime(appt.start_time)}</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{appt.patient_name || 'Patient'}</p>
                        <p className="text-xs text-gray-500 font-medium">{appt.department || 'General Clinic'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <StatusBadge status={appt.status} />
                      
                      {/* 🔥 FIX: Link now points to the correct ID */}
                      {['arrived', 'in_consultation'].includes(appt.status) && (
                        <Link
                          to={`/doctor/consultation/${actualId}`}
                          className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors shadow-sm"
                        >
                          {appt.status === 'arrived' ? 'Start' : 'Continue'}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}