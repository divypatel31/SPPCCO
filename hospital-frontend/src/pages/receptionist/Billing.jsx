import React, { useState, useEffect } from 'react';
import { Spinner, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle, Calculator, FileText, Receipt } from 'lucide-react';
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

export default function BillingPage() {
  const [appointments, setAppointments] = useState([]);
  const [adminFee, setAdminFee] = useState(0); 
  const [loading, setLoading] = useState(true);
  
  const [selected, setSelected] = useState(null);
  const [billForm, setBillForm] = useState({ consultation_fee: 0, lab_charges: 0 });
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      const [feeRes, apptRes] = await Promise.allSettled([
        api.get('/receptionist/consultation-fee'), 
        // 🔥 CACHE BUSTER: Forces the browser to get fresh data from the DB
        api.get(`/receptionist/completed-appointments?t=${Date.now()}`)
      ]);

      if (feeRes.status === 'fulfilled') setAdminFee(feeRes.value.data?.fee || 0); 
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data || []);
    } catch { 
      toast.error('Failed to load billing data'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const total = Number(billForm.consultation_fee) + Number(billForm.lab_charges);

  const openGenerateModal = (appt) => {
    setSelected(appt);
    setBillForm({
      consultation_fee: Number(adminFee) || 0, 
      lab_charges: Number(appt.lab_charges) || 0
    });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (total <= 0) { toast.error('Total amount must be greater than 0'); return; }
    setGenerating(true);
    
    const appointmentId = selected.appointment_id || selected._id || selected.id;

    try {
      await api.post('/receptionist/generate-bill', {
        appointment_id: appointmentId,
        patient_id: selected.patient_id,
        consultation_fee: billForm.consultation_fee,
        lab_charges: billForm.lab_charges,
        total_amount: total,
      });
      
      toast.success('Master Bill generated successfully!');
      
      // 🔥 OPTIMISTIC UI UPDATE
      setAppointments(prev => prev.map(a => {
        const currentId = a.appointment_id || a._id || a.id;
        if (currentId === appointmentId) return { ...a, billing_status: 'generated' };
        return a;
      }));

      setSelected(null);
      fetchData(); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate bill');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      
      {/* --- HEADER --- */}
      <motion.div variants={FADE_UP_SPRING} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <Receipt size={16} />
            <span className="text-sm font-medium tracking-tight">Financial Operations</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Master Billing
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1.5">Automatically aggregate charges and generate final invoices for patients.</p>
        </div>
      </motion.div>

      {/* --- TABLE / EMPTY STATE --- */}
      {appointments.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <CreditCard size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">No Pending Invoices</h3>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-sm">Appointments ready for final billing will appear here automatically.</p>
        </motion.div>
      ) : (
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-5 pl-6">Patient Profile</th>
                  <th className="p-5">Consulting Physician</th>
                  <th className="p-5">Date</th>
                  <th className="p-5">Calculated Total</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {appointments.map(appt => {
                    const actualId = appt.appointment_id || appt._id || appt.id;
                    const previewTotal = (Number(adminFee) || 0) + (Number(appt.lab_charges) || 0);

                    return (
                      <motion.tr 
                        key={actualId} 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="p-5 pl-6">
                          <p className="font-semibold text-slate-900 text-sm tracking-tight">{appt.patient_name || 'Unknown Patient'}</p>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">ID: {appt.patient_id}</p>
                        </td>
                        <td className="p-5 text-sm font-medium text-slate-700">
                          Dr. {appt.doctor_name || 'Unknown'}
                        </td>
                        <td className="p-5 text-sm font-medium text-slate-600">
                          {formatDate(appt.appointment_date)}
                        </td>
                        <td className="p-5 font-semibold text-violet-700 text-sm tracking-tight">
                          {formatCurrency(previewTotal)}
                        </td>
                        <td className="p-5">
                          <StatusBadge status={appt.billing_status || 'not_generated'} />
                        </td>
                        <td className="p-5 pr-6 text-right">
                          <div className="flex items-center justify-end">
                            {(!appt.billing_status || appt.billing_status === 'not_generated') && (
                              <button
                                onClick={() => openGenerateModal(appt)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white rounded-lg text-xs font-semibold transition-colors shadow-sm opacity-80 group-hover:opacity-100 border border-violet-200/60 hover:border-violet-600"
                              >
                                <Calculator size={14} /> Generate Bill
                              </button>
                            )}
                            
                            {(appt.billing_status === 'generated' || appt.billing_status === 'paid') && (
                               <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-2.5 py-1.5 rounded-md uppercase tracking-wider">
                                 <CheckCircle size={14} /> Processed
                               </span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* --- SaaS Generation Modal --- */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !generating && setSelected(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", duration: 0.5, bounce: 0 }} className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
              
              <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <FileText size={18} className="text-violet-500" /> Confirm Master Bill
                </h2>
              </div>
              
              <form onSubmit={handleGenerate} className="p-6 sm:p-8">
                
                {/* Patient Context Card */}
                <div className="bg-violet-50/50 border border-violet-100/60 rounded-xl p-5 mb-6">
                  <p className="text-sm font-semibold text-slate-900 tracking-tight">{selected.patient_name}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5 uppercase tracking-widest">
                    Dr. {selected.doctor_name} • {formatDate(selected.appointment_date)}
                  </p>
                </div>

                {/* Charges List */}
                <div className="space-y-4 mb-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Auto-Fetched Charges</p>
                  
                  {[
                    { key: 'consultation_fee', label: 'Consultation Fee' },
                    { key: 'lab_charges', label: 'Laboratory Charges' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-[13px] font-medium text-slate-600">{label}</label>
                      <div className="text-sm font-semibold text-slate-900">
                        {formatCurrency(billForm[key])}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grand Total */}
                <div className="flex items-center justify-between p-5 bg-slate-900 rounded-2xl mb-8 shadow-inner">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Grand Total</span>
                  <span className="text-2xl font-bold tracking-tight text-white">{formatCurrency(total)}</span>
                </div>

                <div className="flex gap-3">
                  <button type="button" disabled={generating} onClick={() => setSelected(null)} className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors flex-1">Cancel</button>
                  <button type="submit" disabled={generating || total <= 0} className="px-6 py-3 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] disabled:opacity-50 transition-all flex justify-center items-center gap-2 flex-1">
                    {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                    {generating ? 'Processing...' : 'Confirm & Generate'}
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}