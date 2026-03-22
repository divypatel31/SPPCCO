import React, { useState, useEffect } from 'react';
import { Spinner, StatusBadge, PageHeader } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Pill, ChevronDown, CheckCircle, Clock, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

export default function MyPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/patient/prescriptions').then(res => setPrescriptions(res.data || [])).catch(() => toast.error("Failed to load prescriptions")).finally(() => setLoading(false));
  }, []);

  const getDurationStatus = (createdAt, duration) => {
    if (!duration) return { status: 'none', text: '—' };
    const start = new Date(createdAt); start.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diffTime = now - start;
    const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = Number(duration) - daysPassed;
    if (remaining <= 0) return { status: 'completed', text: 'Course Completed' };
    return { status: 'active', text: `${remaining} Days Left`, total: duration };
  };

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1000px] mx-auto font-sans">
      <PageHeader title="Medical Prescriptions" subtitle="Detailed breakdown of your prescribed medications" />
      
      {prescriptions.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-[24px] p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-center mb-4">
            <Pill size={28} className="text-sky-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">No Prescriptions Yet</h3>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-sm">Your medical prescriptions will appear here automatically after a doctor's visit.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((presc, idx) => (
            <motion.div key={presc.prescription_id || idx} variants={FADE_UP_SPRING} className="bg-white rounded-[24px] border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
              
              {/* Accordion Header */}
              <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => setExpanded(expanded === idx ? null : idx)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-50 border border-sky-100 text-sky-600 rounded-2xl flex items-center justify-center">
                    <Pill size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 tracking-tight">Prescription #{presc.prescription_id}</p>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">{formatDate(presc.created_at)} — Dr. {presc.doctor_name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status="active" />
                  <motion.div animate={{ rotate: expanded === idx ? 180 : 0 }} className="p-2 bg-slate-50 rounded-full text-slate-400">
                    <ChevronDown size={18} />
                  </motion.div>
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {expanded === idx && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-6 pt-0 border-t border-slate-100 bg-slate-50/30">
                      {presc.medicines && presc.medicines.length > 0 ? (
                        <div className="space-y-4 mt-6">
                          {presc.medicines.map((med, mi) => {
                            const progress = getDurationStatus(presc.created_at, med.duration);
                            return (
                              <div key={mi} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-6">
                                
                                <div className="flex-1">
                                  <div className="flex justify-between items-start mb-4">
                                    <div>
                                      <h3 className="text-base font-semibold text-slate-900 tracking-tight">{med.medicine_name || med.name}</h3>
                                      <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                        {med.form || 'Medicine'}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      {progress.status === 'completed' ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold uppercase tracking-widest border border-emerald-200/60">
                                          <CheckCircle size={12} /> {progress.text}
                                        </span>
                                      ) : progress.status === 'active' ? (
                                        <div className="flex flex-col items-end bg-sky-50 px-3 py-2 rounded-xl border border-sky-100/60">
                                          <span className="inline-flex items-center gap-1.5 text-sky-700 font-semibold text-sm tracking-tight">
                                            <Clock size={14} /> {progress.text}
                                          </span>
                                        </div>
                                      ) : <span className="text-slate-400 text-sm">—</span>}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Dosage Amount</p>
                                      <p className="text-sm font-medium text-slate-900">Take <span className="font-semibold text-sky-600">{med.dose || 1} {med.unit || 'tablet'}</span></p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Schedule</p>
                                      <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-widest">
                                        <span className={`px-2 py-1 rounded-md ${med.morning ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-400 line-through opacity-50"}`}>Morn</span>
                                        <span className={`px-2 py-1 rounded-md ${med.afternoon ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-400 line-through opacity-50"}`}>Aft</span>
                                        <span className={`px-2 py-1 rounded-md ${med.evening ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-400 line-through opacity-50"}`}>Eve</span>
                                        <span className={`px-2 py-1 rounded-md ${med.night ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-400 line-through opacity-50"}`}>Night</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-3">
                                    {med.food_timing && (
                                      <span className={`inline-flex items-center px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest rounded-lg border ${med.food_timing === 'before_food' ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'}`}>
                                        {med.food_timing === 'before_food' ? 'Take BEFORE Food' : 'Take AFTER Food'}
                                      </span>
                                    )}
                                    {med.instructions && (
                                      <span className="text-sm font-medium text-slate-600 italic bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 flex-1">
                                        "{med.instructions}"
                                      </span>
                                    )}
                                  </div>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 font-medium text-sm bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm">
                          <Info size={16} /> <p>No specific medicines were recorded for this consultation.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}