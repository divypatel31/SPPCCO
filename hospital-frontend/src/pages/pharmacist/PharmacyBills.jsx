import React, { useState, useEffect } from 'react';
import { Spinner, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle, Eye, Pill, Receipt, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animations ---
const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

export default function PharmacyBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);
  
  // States for the Bill Details Modal
  const [selectedBill, setSelectedBill] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const fetchBills = async () => {
    try {
      const res = await api.get('/pharmacy/bills');
      setBills(res.data || []);
    } catch (err) {
      toast.error('Failed to load bills');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const markPaid = async (id) => {
    setMarking(id);
    try {
      await api.put(`/pharmacy/bills/${id}/mark-paid`);
      toast.success('Bill marked as paid!');
      fetchBills();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update bill');
    } finally {
      setMarking(null);
    }
  };

  // Fetch the items inside the bill when the Eye button is clicked
  const viewBillDetails = async (bill) => {
    setSelectedBill(bill);
    setLoadingItems(true);
    try {
      const res = await api.get(`/pharmacy/bills/${bill.bill_id}/details`);
      setBillItems(res.data || []);
    } catch (err) {
      toast.error('Failed to load bill details');
      setSelectedBill(null);
    } finally {
      setLoadingItems(false);
    }
  };

  const totalRevenue = bills
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      <PageHeader 
        title="Pharmacy Bills" 
        subtitle="Track all pharmacy billing and payments" 
      />

      {/* --- Key Metrics --- */}
      <motion.div variants={STAGGER_CONTAINER} className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: "Total Bills", value: bills.length, icon: Receipt, bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Revenue Collected", value: formatCurrency(totalRevenue), icon: CreditCard, bg: "bg-blue-50", text: "text-blue-600" },
          { label: "Pending Payment", value: bills.filter(b => b.payment_status !== 'paid').length, icon: Clock, bg: "bg-amber-50", text: "text-amber-600" },
        ].map((stat, i) => (
          <motion.div key={stat.label} variants={FADE_UP_SPRING} className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex items-center gap-4 group hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} group-hover:scale-105 transition-transform`}>
              <stat.icon size={20} className={stat.text} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* --- Table / Empty State --- */}
      {bills.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-[24px] p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <CreditCard size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">No Pharmacy Bills</h3>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-sm">Bills will appear here automatically after medicines are dispensed.</p>
        </motion.div>
      ) : (
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-5 pl-6">Bill ID</th>
                  <th className="p-5">Patient Profile</th>
                  <th className="p-5">Date Generated</th>
                  <th className="p-5">Total Amount</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {bills.map(bill => (
                    <motion.tr 
                      key={bill.bill_id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-5 pl-6">
                        <span className="font-mono text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100/60 tracking-wider">
                          #{bill.bill_id}
                        </span>
                      </td>
                      <td className="p-5 font-semibold text-slate-900 text-sm tracking-tight">
                        {bill.patient_name}
                      </td>
                      <td className="p-5 text-sm font-medium text-slate-600">
                        {formatDate(bill.created_at)}
                      </td>
                      <td className="p-5 font-semibold text-slate-900 text-sm">
                        {formatCurrency(bill.total_amount)}
                      </td>
                      <td className="p-5">
                        <StatusBadge status={bill.payment_status} />
                      </td>
                      <td className="p-5 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          {bill.payment_status !== 'paid' ? (
                            <button
                              onClick={() => markPaid(bill.bill_id)}
                              disabled={marking === bill.bill_id}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold transition-colors shadow-sm border border-emerald-200/60 hover:border-emerald-600 disabled:opacity-50"
                            >
                              {marking === bill.bill_id ? (
                                <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle size={14} />
                              )}
                              Mark Paid
                            </button>
                          ) : (
                            <button
                              onClick={() => viewBillDetails(bill)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors border border-slate-200/60"
                              title="View Invoice Details"
                            >
                              <Eye size={14} /> View
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* --- SaaS Bill Details Modal --- */}
      <AnimatePresence>
        {selectedBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedBill(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", duration: 0.5, bounce: 0 }} className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-100 flex flex-col">
              
              <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <Receipt size={18} className="text-emerald-500" /> Bill Receipt
                </h2>
                <span className="font-mono text-[11px] font-semibold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200/60 uppercase tracking-widest">
                  #{selectedBill?.bill_id}
                </span>
              </div>
              
              <div className="p-6 sm:p-8 overflow-y-auto hide-scrollbar flex-1">
                {loadingItems ? (
                  <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /></div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Context Banner */}
                    <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200/60 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Patient</p>
                        <p className="font-semibold text-slate-900 tracking-tight">{selectedBill?.patient_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Date Paid</p>
                        <p className="font-medium text-slate-900 text-sm">{formatDate(selectedBill?.created_at)}</p>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="border border-slate-200/60 rounded-[16px] overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200/60 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                          <tr>
                            <th className="px-4 py-3">Medicine Name</th>
                            <th className="px-4 py-3 text-center">Qty</th>
                            <th className="px-4 py-3 text-right">Unit Price</th>
                            <th className="px-4 py-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {billItems.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="text-center py-6 text-slate-400 font-medium text-sm">No items found in this bill.</td>
                            </tr>
                          ) : (
                            billItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2 tracking-tight">
                                  <Pill size={14} className="text-emerald-500" /> {item.medicine_name}
                                </td>
                                <td className="px-4 py-3 text-center text-slate-600 font-medium">{item.quantity}</td>
                                <td className="px-4 py-3 text-right text-slate-500 text-xs font-medium">{formatCurrency(item.price)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrency(item.total_price)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Total Footer */}
                    <div className="flex justify-between items-center bg-slate-900 p-5 rounded-[16px] shadow-inner">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Amount Paid</span>
                      <span className="text-2xl font-bold tracking-tight text-white">{formatCurrency(selectedBill?.total_amount)}</span>
                    </div>

                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8 border-t border-slate-100 bg-white shrink-0">
                <button onClick={() => setSelectedBill(null)} className="w-full px-6 py-3.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-200/60">
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}