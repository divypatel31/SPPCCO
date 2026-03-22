import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner, StatusBadge } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import { Calendar, CreditCard, ArrowRight, Wallet, AlertCircle, PlusCircle, Activity, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animations ---
const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Top-Up Modal State
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
      } catch (err) { toast.error('Failed to load dashboard data'); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleTopUp = async (e) => {
    e.preventDefault();
    if (!topUpAmount || topUpAmount <= 0) return toast.error("Enter a valid amount");

    setIsToppingUp(true);
    try {
      await api.post('/patient/wallet/add', { amount: topUpAmount });
      setWalletBalance(prev => prev + Number(topUpAmount));
      toast.success(`₹${topUpAmount} added to your wallet securely!`);
      setTopUpAmount('');
      setIsTopUpOpen(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to process payment"); } 
    finally { setIsToppingUp(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
      </div>
    );
  }

  const upcoming = appointments.filter(a => ['pending', 'scheduled', 'arrived'].includes(a.status));
  const pendingBills = bills.filter(b => ['pending', 'unpaid'].includes(b.payment_status));
  const isBalanceLow = walletBalance < 100;

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      
      {/* --- Premium Greeting Banner --- */}
      <motion.div variants={FADE_UP_SPRING} className="relative overflow-hidden bg-gradient-to-br from-sky-500 to-blue-600 rounded-[24px] p-8 mb-8 text-white shadow-lg shadow-blue-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-32 w-48 h-48 bg-sky-300/20 rounded-full filter blur-2xl" />
        
        <div className="relative z-10">
          <p className="text-sky-100 font-medium text-sm tracking-wide uppercase mb-1">Patient Portal</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
            Welcome back, {user?.name?.split(' ')[0] || 'Patient'}! 👋
          </h1>
          <p className="text-sky-50 font-medium text-sm max-w-md leading-relaxed">
            Your personal health dashboard. Book appointments, manage payments, and track your medical history seamlessly.
          </p>
          <div className="flex gap-3 mt-6">
            <Link to="/patient/book-appointment" className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-sky-50 hover:shadow-lg transition-all">
              <Calendar size={16} /> Book Visit
            </Link>
            <button onClick={() => setIsTopUpOpen(true)} className="inline-flex items-center justify-center gap-2 bg-blue-700/40 backdrop-blur-md text-white border border-white/20 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700/60 transition-all">
              <PlusCircle size={16} /> Add Funds
            </button>
          </div>
        </div>
        
        {/* Wallet Display */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl md:text-right w-full md:w-auto min-w-[200px]">
          <div className="flex items-center md:justify-end gap-2 mb-1 text-sky-100">
            <Wallet size={16} />
            <p className="text-xs font-semibold uppercase tracking-widest">Available Balance</p>
          </div>
          <p className="text-4xl font-bold tracking-tight">{formatCurrency(walletBalance)}</p>
        </div>
      </motion.div>

      {/* --- Low Balance Alert --- */}
      <AnimatePresence>
        {isBalanceLow && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-rose-50 border border-rose-200/60 text-rose-700 p-5 rounded-2xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 rounded-lg"><AlertCircle size={20} className="text-rose-600" /></div>
                <div>
                  <h3 className="font-semibold text-sm text-rose-900 tracking-tight">Low Wallet Balance</h3>
                  <p className="text-sm mt-1 font-medium text-rose-700/80">Your balance is {formatCurrency(walletBalance)}. A minimum of ₹100 is required to schedule a new consultation.</p>
                </div>
              </div>
              <button onClick={() => setIsTopUpOpen(true)} className="whitespace-nowrap bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-rose-500/20 hover:bg-rose-700 transition-all">
                Top Up Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Key Metrics --- */}
      <motion.div variants={STAGGER_CONTAINER} className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: "Total Visits", value: appointments.length, icon: Activity, bg: "bg-blue-50", text: "text-blue-600" },
          { label: "Upcoming Consults", value: upcoming.length, icon: Clock, bg: "bg-indigo-50", text: "text-indigo-600" },
          { label: "Unpaid Invoices", value: pendingBills.length, icon: CreditCard, bg: pendingBills.length > 0 ? "bg-amber-50" : "bg-slate-50", text: pendingBills.length > 0 ? "text-amber-600" : "text-slate-600" },
        ].map((stat, i) => (
          <motion.div key={i} variants={FADE_UP_SPRING} className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex items-center gap-4 group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} group-hover:scale-105 transition-transform`}>
              <stat.icon size={20} className={stat.text} strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* --- Lists Grid --- */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Appointments List */}
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Recent Appointments</h2>
            <Link to="/patient/appointments" className="text-sm font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors group">
              View all <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="flex-1">
            {appointments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-60">
                <Calendar size={32} className="text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-600">No appointments scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 4).map(appt => (
                  <div key={appt.appointment_id} className="group flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200/60 flex items-center justify-center text-slate-500">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{appt.department || 'General'}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                          {formatDate(appt.appointment_date)} {appt.appointment_time && `• ${appt.appointment_time.slice(0,5)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <StatusBadge status={appt.status} />
                      {appt.doctor_name && <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Dr. {appt.doctor_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Bills List */}
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Recent Invoices</h2>
            <Link to="/patient/bills" className="text-sm font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors group">
              View all <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="flex-1">
            {bills.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-60">
                <CreditCard size={32} className="text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-600">No recent invoices found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bills.slice(0, 4).map(bill => (
                  <div key={bill.bill_id} className="group flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200/60 flex items-center justify-center text-slate-500">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 tracking-tight">INV-{bill.bill_id.toString().padStart(4,'0')}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{formatDate(bill.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <p className="text-sm font-semibold text-slate-900 tracking-tight">{formatCurrency(bill.total_amount)}</p>
                      <StatusBadge status={bill.payment_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* --- SaaS Top-Up Modal --- */}
      <AnimatePresence>
        {isTopUpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isToppingUp && setIsTopUpOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">Add Funds</h3>
                  <button onClick={() => !isToppingUp && setIsTopUpOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                
                <form onSubmit={handleTopUp} className="space-y-6">
                  <div className="bg-sky-50 border border-sky-100 p-5 rounded-2xl text-center">
                    <p className="text-[11px] font-medium text-sky-600 uppercase tracking-widest mb-1">Current Balance</p>
                    <p className="text-3xl font-semibold tracking-tight text-sky-900">{formatCurrency(walletBalance)}</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-2 block">Deposit Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                      <input type="number" min="1" required className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-xl text-base font-semibold text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all" placeholder="500" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[100, 500, 1000].map(amt => (
                      <button key={amt} type="button" onClick={() => setTopUpAmount(amt)} className="py-2.5 border border-slate-200/60 rounded-xl text-sm font-semibold text-slate-600 bg-white hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700 transition-colors">
                        +₹{amt}
                      </button>
                    ))}
                  </div>

                  <button type="submit" disabled={isToppingUp || !topUpAmount} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-medium shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                    {isToppingUp ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CreditCard size={18} />}
                    {isToppingUp ? 'Processing Securely...' : `Pay ₹${topUpAmount || '0'} Now`}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}