import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StatCard, Spinner, EmptyState, StatusBadge, Modal } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import { Calendar, CreditCard, Pill, ArrowRight, Wallet, AlertCircle, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🔥 Top-Up Modal State
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isToppingUp, setIsToppingUp] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appRes, billRes, walletRes] = await Promise.allSettled([
          api.get('/appointments/my'),
          api.get('/billing/my-bills'),
          api.get('/patient/wallet-balance') 
        ]);
        
        if (appRes.status === 'fulfilled') setAppointments(appRes.value.data || []);
        if (billRes.status === 'fulfilled') setBills(billRes.value.data || []);
        if (walletRes.status === 'fulfilled') setWalletBalance(Number(walletRes.value.data.balance) || 0);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🔥 Handle the fake money top-up
  const handleTopUp = async (e) => {
    e.preventDefault();
    if (!topUpAmount || topUpAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setIsToppingUp(true);
    try {
      await api.post('/patient/wallet/add', { amount: topUpAmount });
      
      // Update local state so UI reflects new balance instantly
      setWalletBalance(prev => prev + Number(topUpAmount));
      toast.success(`₹${topUpAmount} added to your wallet!`);
      
      // Reset and close modal
      setTopUpAmount('');
      setIsTopUpOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add money");
    } finally {
      setIsToppingUp(false);
    }
  };

  if (loading) return <Spinner />;

  const upcoming = appointments.filter(a => ['pending', 'scheduled', 'arrived'].includes(a.status));
  const pendingBills = bills.filter(b => b.payment_status === 'pending' || b.payment_status === 'unpaid');
  const isBalanceLow = walletBalance < 100;

  return (
    <div>
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 text-white relative overflow-hidden flex justify-between items-center">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Patient'}! 👋</h1>
          <p className="text-blue-100 mt-1">Here's a summary of your health records</p>
          <div className="flex gap-3 mt-4">
            <Link 
              to="/patient/book-appointment" 
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
            >
              <Calendar size={16} /> Book Appointment
            </Link>
            
            {/* 🔥 Quick Top Up Button */}
            <button 
              onClick={() => setIsTopUpOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-800 bg-opacity-50 text-white border border-blue-400 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors"
            >
              <PlusCircle size={16} /> Add Money
            </button>
          </div>
        </div>
        
        {/* Large Wallet Display on Banner */}
        <div className="hidden md:block text-right">
          <p className="text-blue-200 text-sm font-medium mb-1">Wallet Balance</p>
          <p className="text-4xl font-bold">{formatCurrency(walletBalance)}</p>
        </div>
      </div>

      {/* Low Balance Warning */}
      {isBalanceLow && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-semibold text-sm">Low Wallet Balance</h3>
              <p className="text-sm mt-1">
                Your current balance is {formatCurrency(walletBalance)}. You need at least ₹100 in your wallet to request a new appointment. 
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsTopUpOpen(true)}
            className="whitespace-nowrap bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Top Up Now
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          icon={Wallet} 
          label="Wallet Balance" 
          value={formatCurrency(walletBalance)} 
          color={isBalanceLow ? "red" : "green"} 
        />
        <StatCard icon={Calendar} label="Total Appointments" value={appointments.length} color="blue" />
        <StatCard icon={Calendar} label="Upcoming" value={upcoming.length} color="purple" />
        <StatCard icon={CreditCard} label="Pending Bills" value={pendingBills.length} color="orange" />
      </div>

      {/* Recent Appointments & Bills Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Recent Appointments */}
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
                <div key={appt._id || appt.appointment_id || appt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.department || 'General'}</p>
                    <p className="text-xs text-gray-500">{formatDate(appt.appointment_date || appt.date)} {appt.appointment_time && `• ${appt.appointment_time}`}</p>
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
                <div key={bill._id || bill.bill_id || bill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
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

      {/* 🔥 Top-Up Modal */}
      <Modal 
        open={isTopUpOpen} 
        onClose={() => !isToppingUp && setIsTopUpOpen(false)} 
        title="Add Money to Wallet"
      >
        <form onSubmit={handleTopUp} className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl text-center">
            <p className="text-sm text-blue-600 font-medium">Current Balance</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(walletBalance)}</p>
          </div>

          <div>
            <label className="label">Amount to Add (₹)</label>
            <input
              type="number"
              min="1"
              step="1"
              required
              className="input-field text-lg font-medium"
              placeholder="e.g. 500"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            {[100, 500, 1000].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => setTopUpAmount(amt)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-blue-300 transition-colors"
              >
                +₹{amt}
              </button>
            ))}
          </div>

          <button 
            type="submit" 
            disabled={isToppingUp || !topUpAmount}
            className="btn-primary w-full py-2.5 mt-2"
          >
            {isToppingUp ? 'Processing...' : `Pay ₹${topUpAmount || '0'} Securely`}
          </button>
        </form>
      </Modal>
    </div>
  );
}