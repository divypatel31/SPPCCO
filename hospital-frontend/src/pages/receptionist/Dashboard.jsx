import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StatCard, Spinner, StatusBadge, EmptyState } from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Clock, Users, CreditCard, CheckCircle, ArrowRight, UserPlus } from 'lucide-react';

export default function ReceptionistDashboard() {
  const [pending, setPending] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pendRes, queueRes] = await Promise.allSettled([
          api.get('/receptionist/pending-appointments'),
          api.get('/receptionist/completed-appointments'),
        ]);
        if (pendRes.status === 'fulfilled') setPending(pendRes.value.data || []);
        if (queueRes.status === 'fulfilled') setQueue(queueRes.value.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold">Reception Desk</h1>
        <p className="text-purple-100 mt-1">Manage appointments, queue, and billing · {new Date().toDateString()}</p>
        <div className="flex gap-3 mt-4 flex-wrap">
          <Link to="/receptionist/pending-appointments" className="bg-white text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-50">
            Assign Doctors
          </Link>
          <Link to="/receptionist/register-patient" className="bg-purple-500 text-white border border-purple-400 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-600">
            Register Walk-in
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Clock} label="Pending Requests" value={pending.length} color="orange" />
        <StatCard icon={CreditCard} label="Ready for Billing" value={queue.length} color="green" />
        <StatCard icon={Users} label="Today's Patients" value="—" color="blue" />
        <StatCard icon={CheckCircle} label="Bills Generated" value="—" color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending assignments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pending Doctor Assignment</h2>
            <Link to="/receptionist/pending-appointments" className="text-purple-600 text-sm flex items-center gap-1 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {pending.length === 0 ? (
            <EmptyState icon={Clock} title="No pending requests" description="All appointments have been assigned" />
          ) : (
            <div className="space-y-3">
              {pending.slice(0, 4).map(appt => (
                <div key={appt._id || appt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.patient_name || 'Patient'}</p>
                    <p className="text-xs text-gray-500">{appt.department} · {formatDate(appt.appointment_date || appt.date)}</p>
                    <p className="text-xs text-gray-400">{formatTime(appt.start_time)}</p>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ready for billing */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Ready for Billing</h2>
            <Link to="/receptionist/billing" className="text-purple-600 text-sm flex items-center gap-1 hover:underline">
              Go to Billing <ArrowRight size={14} />
            </Link>
          </div>
          {queue.length === 0 ? (
            <EmptyState icon={CreditCard} title="No pending billing" description="Completed appointments will appear here" />
          ) : (
            <div className="space-y-3">
              {queue.slice(0, 4).map(appt => (
                <div key={appt._id || appt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.patient_name || 'Patient'}</p>
                    <p className="text-xs text-gray-500">Dr. {appt.doctor_name} · {formatDate(appt.appointment_date || appt.date)}</p>
                  </div>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-medium">Bill Pending</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
