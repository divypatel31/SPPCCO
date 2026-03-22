import React, { useState, useEffect } from 'react';
import { Spinner, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Pill, ShoppingCart, Trash2, Package, CheckCircle } from 'lucide-react'; 
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

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [dispenseData, setDispenseData] = useState([]);
  const [generating, setGenerating] = useState(false);

  const fetchPrescriptions = async () => {
    try {
      const res = await api.get('/pharmacy/prescriptions');
      setPrescriptions(res.data || []);
    } catch (err) {
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrescriptions(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this prescription? Use this only if the patient hasn't shown up to collect their medicines.")) return;
    try {
      await api.put(`/pharmacy/cancel/${id}`);
      toast.success("Prescription removed from queue.");
      fetchPrescriptions();
    } catch (err) {
      toast.error("Failed to cancel prescription");
    }
  };

  // 🔥 Smart Calculation Logic (Kept exactly as requested)
  const calculateDispensingQty = (med) => {
    const dose = Number(med.dose) || 1;
    const freq = Number(med.frequency) || 1;
    const days = Number(med.duration) || 1;
    const packSize = Number(med.pack_size) || 1; 

    const totalRequired = dose * freq * days;
    const unit = (med.unit || '').toLowerCase();

    if (unit === 'ml' || unit === 'drop') {
      if (packSize > 1) return Math.ceil(totalRequired / packSize);
      return totalRequired > 15 ? 1 : Math.ceil(totalRequired); 
    }
    if (unit === 'tube') return Math.ceil(dose); 
    if (med.dispense_type === 'PACK') return Math.ceil(totalRequired / packSize); 
    
    return Math.ceil(totalRequired); 
  };

  const openDispense = async (presc) => {
    try {
      setSelected(presc);
      const res = await api.get(`/pharmacy/prescriptions/${presc.prescription_id}`);
      const items = res.data.map(m => ({
        ...m,
        qty_dispensed: calculateDispensingQty(m), 
        unit_price: m.unit_price || 0,
      }));
      setDispenseData(items);
    } catch (err) {
      toast.error("Could not load medicines for this prescription");
    }
  };

  const total = dispenseData.reduce((sum, m) => sum + ((m.qty_dispensed || 0) * (m.unit_price || 0)), 0);

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    if (!selected) return;

    setGenerating(true);
    try {
      await api.post('/pharmacy/sell', {
        prescription_id: selected.prescription_id,
        patient_id: selected.patient_id,
        medicines: dispenseData.map(m => ({
          medicine_id: m.medicine_id,
          quantity_dispensed: m.qty_dispensed,
          unit_price: m.unit_price,
        })),
        total_amount: total,
      });

      toast.success('Pharmacy bill generated!');
      setSelected(null);
      fetchPrescriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate bill');
    } finally {
      setGenerating(false);
    }
  };

  const getDisplayUnit = (med) => {
    const unit = (med.unit || '').toLowerCase();
    if (unit === 'ml' || unit === 'drop') return 'Bottle(s)';
    if (unit === 'tube') return 'Tube(s)';
    if (med.dispense_type === 'PACK') return 'Pack(s)';
    return (med.form || 'Unit') + '(s)';
  };

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      <PageHeader title="Prescription Queue" subtitle="View and dispense active physician prescriptions" />

      {prescriptions.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-[24px] p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Pill size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Queue Clear</h3>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-sm">Active prescriptions containing medicines will appear here.</p>
        </motion.div>
      ) : (
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-5 pl-6">Prescription ID</th>
                  <th className="p-5">Patient Name</th>
                  <th className="p-5">Consulting Doctor</th>
                  <th className="p-5">Items</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {prescriptions.map(presc => {
                    const prescTime = new Date(presc.created_at).getTime();
                    const isOlderThan24Hours = (Date.now() - prescTime) > (24 * 60 * 60 * 1000);

                    return (
                      <motion.tr key={presc.prescription_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group">
                        <td className="p-5 pl-6">
                          <span className="font-mono text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100/60">
                            #{presc.prescription_id}
                          </span>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1.5">{formatDate(presc.created_at)}</p>
                        </td>
                        <td className="p-5 font-semibold text-slate-900 text-sm tracking-tight">{presc.patient_name}</td>
                        <td className="p-5 text-sm font-medium text-slate-600">Dr. {presc.doctor_name}</td>
                        <td className="p-5">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[11px] font-semibold border border-slate-200/60">
                            {presc.item_count} Meds
                          </span>
                        </td>
                        <td className="p-5">
                          <StatusBadge status={presc.dispensing_status || 'pending'} />
                        </td>
                        <td className="p-5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            {presc.dispensing_status !== 'dispensed' && (
                              <button onClick={() => openDispense(presc)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold transition-colors shadow-sm border border-emerald-200/60 hover:border-emerald-600">
                                <ShoppingCart size={14} /> Dispense
                              </button>
                            )}

                            {isOlderThan24Hours && presc.dispensing_status !== 'dispensed' && (
                              <button onClick={() => handleCancel(presc.prescription_id)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-colors border border-rose-200/60 hover:border-rose-600" title="Cancel (No Show)">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* --- SaaS Dispense Modal --- */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !generating && setSelected(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", duration: 0.5, bounce: 0 }} className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-100 flex flex-col">
              
              <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <ShoppingCart size={18} className="text-emerald-500" /> Dispense Medicines & Bill
                </h2>
              </div>
              
              <div className="p-6 sm:p-8 overflow-y-auto hide-scrollbar flex-1">
                
                {/* Context Card */}
                <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-xl p-5 mb-6 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 tracking-tight">{selected.patient_name}</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-widest">
                      Dr. {selected.doctor_name} · {formatDate(selected.created_at)}
                    </p>
                  </div>
                  <span className="bg-white px-3 py-1 rounded-lg text-emerald-800 font-mono text-[11px] shadow-sm border border-emerald-100 uppercase tracking-widest">
                    Rx #{selected.prescription_id}
                  </span>
                </div>

                <div className="border border-slate-200/60 rounded-[16px] overflow-hidden shadow-sm mb-6">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200/60 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-3">Medicine</th>
                        <th className="px-4 py-3">Physician Order</th>
                        <th className="px-4 py-3">Dispense Qty</th>
                        <th className="px-4 py-3">Unit Price</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dispenseData.map((med, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{med.medicine_name || med.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded-md text-slate-600 font-semibold uppercase tracking-widest">{med.form || 'Tab'}</span>
                              {med.dispense_type === 'PACK' && (
                                <span className="text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-1.5 py-0.5 rounded-md flex items-center gap-1 font-semibold uppercase tracking-widest">
                                  <Package size={10} /> {med.pack_size}{med.unit}/pack
                                </span>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-4 py-3 text-xs font-medium text-slate-600">
                            <p>{med.dose}{med.unit} × {med.frequency}/day</p>
                            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-400">{med.duration} days</p>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="number" min="0" max={med.stock}
                                className={`w-20 border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition-all ${
                                  med.stock < med.qty_dispensed ? 'border-rose-400 focus:ring-rose-500 text-rose-700 bg-rose-50' : 'border-slate-200/60 bg-white focus:ring-emerald-500 text-slate-900'
                                }`}
                                value={med.qty_dispensed}
                                onChange={e => {
                                  const updated = [...dispenseData];
                                  updated[i].qty_dispensed = parseInt(e.target.value) || 0;
                                  setDispenseData(updated);
                                }}
                              />
                              <span className="text-[11px] text-slate-500 font-medium uppercase tracking-widest">
                                {getDisplayUnit(med)}
                              </span>
                            </div>
                            <p className={`text-[9px] font-bold uppercase tracking-widest mt-1.5 ${med.stock < med.qty_dispensed ? 'text-rose-500' : 'text-slate-400'}`}>
                              In Stock: {med.stock || 0}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <div className="relative w-24">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                              <input
                                type="number"
                                className="w-full bg-slate-50 border border-slate-200/60 text-slate-600 rounded-lg pl-7 pr-3 py-1.5 text-sm font-semibold outline-none cursor-not-allowed"
                                value={med.unit_price}
                                readOnly
                              />
                            </div>
                          </td>

                          <td className="px-4 py-3 font-bold text-emerald-700 text-right">
                            {formatCurrency((med.qty_dispensed || 0) * (med.unit_price || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center bg-slate-900 p-5 rounded-[16px] shadow-inner">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Grand Total</span>
                  <span className="text-2xl font-bold tracking-tight text-white">{formatCurrency(total)}</span>
                </div>

              </div>
              
              <div className="p-6 sm:p-8 border-t border-slate-100 bg-white shrink-0 flex gap-3">
                <button type="button" disabled={generating} onClick={() => setSelected(null)} className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors flex-1">Cancel</button>
                <button 
                  onClick={handleGenerateBill} 
                  disabled={generating || total <= 0 || dispenseData.some(m => m.stock < m.qty_dispensed)} 
                  className="px-6 py-3 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2 flex-1"
                  title={dispenseData.some(m => m.stock < m.qty_dispensed) ? "Cannot bill. Insufficient stock." : ""}
                >
                  {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                  {generating ? 'Processing...' : 'Confirm & Bill'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}