import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StatCard, Spinner, EmptyState, StatusBadge } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import { Calendar, CreditCard, Pill, ClipboardList, ArrowRight, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appRes, billRes] = await Promise.allSettled([
          api.get('/appointments/my'),
          api.get('/billing/my-bills'),
        ]);
        if (appRes.status === 'fulfilled') setAppointments(appRes.value.data || []);
        if (billRes.status === 'fulfilled') setBills(billRes.value.data || []);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Spinner />;

  const upcoming = appointments.filter(a => ['pending', 'scheduled', 'arrived'].includes(a.status));
  const pendingBills = bills.filter(b => b.payment_status === 'pending' || b.payment_status === 'unpaid');

  return (
    <div>
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Patient'}! 👋</h1>
        <p className="text-blue-100 mt-1">Here's a summary of your health records</p>
        <Link to="/patient/book-appointment" className="inline-flex items-center gap-2 mt-4 bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors">
          <Calendar size={16} /> Book Appointment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Calendar} label="Total Appointments" value={appointments.length} color="blue" />
        <StatCard icon={Calendar} label="Upcoming" value={upcoming.length} color="purple" />
        <StatCard icon={CreditCard} label="Pending Bills" value={pendingBills.length} color="orange" />
        <StatCard icon={Pill} label="Active Prescriptions" value="—" color="green" />
      </div>

      {/* Recent Appointments */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Appointments</h2>
            <Link to="/patient/appointments" className="text-blue-600 text-sm flex items-center gap-1 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {appointments.length === 0 ? (
            <EmptyState icon={Calendar} title="No appointments yet" description="Book your first appointment" />
          ) : (
            <div className="space-y-3">
              {appointments.slice(0, 4).map(appt => (
                <div key={appt._id || appt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.department || 'General'}</p>
                    <p className="text-xs text-gray-500">{formatDate(appt.appointment_date || appt.date)} {appt.start_time && `• ${appt.start_time}`}</p>
                    {appt.doctor_name && <p className="text-xs text-gray-400">Dr. {appt.doctor_name}</p>}
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bills */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Bills</h2>
            <Link to="/patient/bills" className="text-blue-600 text-sm flex items-center gap-1 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {bills.length === 0 ? (
            <EmptyState icon={CreditCard} title="No bills yet" description="Bills will appear after consultation" />
          ) : (
            <div className="space-y-3">
              {bills.slice(0, 4).map(bill => (
                <div key={bill._id || bill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Bill #{bill.bill_id || bill._id?.slice(-6)}</p>
                    <p className="text-xs text-gray-500">{formatDate(bill.generated_at || bill.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(bill.total_amount)}</p>
                    <StatusBadge status={bill.payment_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
