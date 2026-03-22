import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import { Settings, Save, IndianRupee, ShieldCheck, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

// --- Animation Variants ---
const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

export default function SystemSettings() {
  const [form, setForm] = useState({ consultation_fee: 0 });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/admin/consultation-fee");
        setForm({ consultation_fee: res.data.fee || 0 });
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault(); 
    setLoading(true); 
    setSuccess(false);
    try {
      await api.put("/admin/consultation-fee", form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const finalTotal = Number(form.consultation_fee) || 0;

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1200px] mx-auto font-sans">
      
      {/* --- HEADER --- */}
      <motion.div variants={FADE_UP_SPRING} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <Settings size={16} />
            <span className="text-sm font-medium tracking-tight">Core Configurations</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            System Settings
          </h1>
          <p className="text-slate-500 text-sm font-normal mt-1.5">Manage global hospital parameters and financial defaults.</p>
        </div>
      </motion.div>

      {/* --- MAIN CONTENT CARD --- */}
      <motion.div variants={FADE_UP_SPRING} className="bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 rounded-[24px] overflow-hidden">
        
        {/* Header Ribbon */}
        <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex items-center gap-3">
          <ShieldCheck className="text-indigo-500" size={20} />
          <h2 className="text-base font-semibold text-slate-800 tracking-tight">Financial Rules</h2>
        </div>

        <form onSubmit={handleSave} className="p-8 sm:p-10">
          <div className="grid lg:grid-cols-5 gap-12 items-start">
            
            {/* --- INPUTS SECTION --- */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-2 block">Standard Consultation Fee *</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 transition-colors group-focus-within:text-blue-500">
                    <IndianRupee size={18} strokeWidth={2} />
                  </div>
                  <input
                    type="number"
                    min="0"
                    name="consultation_fee"
                    value={form.consultation_fee}
                    onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
                    className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-3.5 pl-11 pr-4 text-base font-medium text-slate-900 transition-all outline-none"
                    required
                  />
                </div>
                <p className="text-[13px] font-normal text-slate-400 mt-3 leading-relaxed">
                  This base fee is automatically applied to all new patient registrations and consultations prior to any secondary diagnostics.
                </p>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] disabled:opacity-60 sm:w-auto w-full"
                >
                  <Save size={18} /> {loading ? "Updating System..." : "Commit Changes"}
                </button>
                
                <AnimatePresence>
                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-emerald-600 mt-4 font-medium text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                        System configuration updated successfully.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* --- LIVE RECEIPT PREVIEW SECTION --- */}
            <div className="lg:col-span-2 bg-slate-50/50 rounded-2xl p-6 border border-slate-200/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full filter blur-[40px]" />
              
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-blue-500">
                  <CreditCard size={16} />
                </div>
                <h3 className="font-semibold text-slate-800 tracking-tight text-sm">Receipt Preview</h3>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-100 relative z-10">
                <div className="border-b border-dashed border-slate-200 pb-4 mb-4">
                  <div className="flex justify-between items-center text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-3">
                    <span>Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-700 text-sm">General Consultation</span>
                    <span className="font-medium text-slate-900 text-sm">₹{finalTotal.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-slate-500">Total Due</span>
                  <span className="text-lg font-semibold text-blue-600 tracking-tight">₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>
              
            </div>

          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}