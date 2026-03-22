import React, { useState, useEffect } from 'react';
import { Spinner, StatusBadge, PageHeader } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FlaskConical, CheckCircle, FileText, Activity } from 'lucide-react';
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

export default function LabRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  // Modal State
  const [selected, setSelected] = useState(null);
  const [resultForm, setResultForm] = useState({ result: '', remarks: '', status: 'in_progress' });
  const [completing, setCompleting] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/lab/requests');
      setRequests(res.data || []);
    } catch { 
      toast.error('Failed to load lab data'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!resultForm.result.trim() && resultForm.status === 'completed') {
      return toast.error("Please enter clinical findings before completing.");
    }

    setCompleting(true);
    try {
      await api.put(`/lab/complete/${selected.request_id}`, {
        result: resultForm.result,
        status: resultForm.status
      });
      toast.success('Test status updated securely!');
      setSelected(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update test');
    } finally {
      setCompleting(false);
    }
  };

  // Filter logic treating 'requested' as 'pending'
  const filtered = filter === 'all' 
    ? requests 
    : requests.filter(r => {
        if (filter === 'pending') return r.status === 'pending' || r.status === 'requested';
        return r.status === filter;
      });

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      
      <PageHeader title="Laboratory Queue" subtitle="Process medical tests and upload patient results to the EMR." />

      {/* --- Segmented Animated Tabs --- */}
      <motion.div variants={FADE_UP_SPRING} className="mb-6 bg-slate-100 p-1.5 rounded-2xl flex gap-1 overflow-x-auto hide-scrollbar border border-slate-200/50 shadow-inner w-fit">
        {['all', 'pending', 'in_progress', 'completed'].map(f => {
          const isActive = filter === f;
          const count = f === 'all' ? requests.length : requests.filter(r => f === 'pending' ? (r.status === 'pending' || r.status === 'requested') : r.status === f).length;
          const label = f === 'pending' ? 'To Do' : f.replace(/_/g, ' ');

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap capitalize flex items-center gap-2 ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              {isActive && <motion.div layoutId="labFilterTab" className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/50" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />}
              <span className="relative z-10">{label}</span>
              <span className={`relative z-10 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${isActive ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/50 text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* --- TABLE / EMPTY STATE --- */}
      {filtered.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-[24px] p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <FlaskConical size={28} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Queue Clear</h3>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-sm">No lab requests found for this specific category.</p>
        </motion.div>
      ) : (
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-5 pl-6">Test Detail</th>
                  <th className="p-5">Patient Profile</th>
                  <th className="p-5">Requesting Physician</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map(req => (
                    <motion.tr 
                      key={req.request_id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-5 pl-6">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-slate-900 text-sm tracking-tight">{req.test_name}</p>
                          {req.priority === 'urgent' && (
                            <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200/60 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest">Urgent</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{formatDate(req.created_at)}</p>
                      </td>
                      <td className="p-5">
                        <p className="font-medium text-slate-900 text-sm">{req.patient_name}</p>
                      </td>
                      <td className="p-5 text-sm font-medium text-slate-600">
                        Dr. {req.doctor_name}
                      </td>
                      <td className="p-5">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="p-5 pr-6 text-right">
                        {req.status !== 'completed' ? (
                          <button
                            onClick={() => { 
                              setSelected(req); 
                              setResultForm({ result: req.result || '', status: req.status === 'requested' ? 'in_progress' : req.status }); 
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white rounded-lg text-xs font-semibold transition-colors shadow-sm opacity-80 group-hover:opacity-100 border border-orange-200/60 hover:border-orange-600"
                          >
                            <Activity size={14} /> Process
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-2.5 py-1.5 rounded-md uppercase tracking-wider">
                            <CheckCircle size={14} /> Reported
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* --- SaaS Result Entry Modal --- */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !completing && setSelected(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", duration: 0.5, bounce: 0 }} className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
              
              <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <FileText size={18} className="text-orange-500" /> Update Lab Findings
                </h2>
              </div>
              
              <form onSubmit={handleComplete} className="p-6 sm:p-8">
                
                {/* Context Card */}
                <div className="bg-orange-50/50 border border-orange-100/60 rounded-xl p-5 mb-6">
                  <p className="text-sm font-semibold text-slate-900 tracking-tight">{selected.test_name}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-widest">Patient: {selected.patient_name} · Req #{selected.request_id}</p>
                  {selected.priority === 'urgent' && (
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-rose-700 bg-rose-100/50 w-fit px-2 py-1 rounded-md border border-rose-200/50 uppercase tracking-widest">
                      Urgent Processing Required
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Process Status</label>
                    <select
                      className="w-full border border-slate-200/60 bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none appearance-none"
                      value={resultForm.status}
                      onChange={e => setResultForm({ ...resultForm, status: e.target.value })}
                    >
                      <option value="requested">Awaiting Collection</option>
                      <option value="in_progress">Testing In Progress</option>
                      <option value="completed">Ready / Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Result Details</label>
                    <textarea
                      className="w-full border border-slate-200/60 bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 rounded-xl py-3 px-4 text-[13px] font-medium transition-all outline-none h-32 resize-none leading-relaxed"
                      placeholder="Enter clinical findings, metrics, and reference ranges..."
                      value={resultForm.result}
                      onChange={e => setResultForm({ ...resultForm, result: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-8">
                  <button type="button" disabled={completing} onClick={() => setSelected(null)} className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors w-full">Cancel</button>
                  <button type="submit" disabled={completing} className="px-6 py-2.5 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2 w-full">
                    {completing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                    {completing ? 'Uploading...' : 'Save Result'}
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