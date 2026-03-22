import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pill, CheckCircle, FlaskConical, Lock, Play, Clock, FileText, History } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animation Variants ---
const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

export default function ConsultationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('consult');
  const [medicineList, setMedicineList] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [patientHistory, setPatientHistory] = useState([]); 
  const [saveStatus, setSaveStatus] = useState(''); 

  const [consult, setConsult] = useState({ symptoms: '', diagnosis: '', notes: '', follow_up: '' });
  const [medicines, setMedicines] = useState([{ medicine_id: '', dose: '', unit: 'tablet', frequency: 0, duration: '', morning: false, afternoon: false, evening: false, night: false, food_timing: 'after_food', instructions: '' }]);
  const [labRequests, setLabRequests] = useState([{ test: '' }]);

  useEffect(() => {
    api.get(`/doctor/appointments/${id}`).then(res => {
      setAppt(res.data);
      if (res.data.medical_record) setConsult({ symptoms: res.data.medical_record.symptoms || '', diagnosis: res.data.medical_record.diagnosis || '', notes: res.data.medical_record.clinical_notes || '', follow_up: res.data.medical_record.follow_up_date || '' });
      if (res.data.medicines && res.data.medicines.length > 0) setMedicines(res.data.medicines);
    }).catch(() => { toast.error("Appointment not found"); setAppt(null); }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (appt?.patient_id) {
      api.get(`/doctor/patient-history/${appt.patient_id}?current_appt=${id}`)
         .then(res => setPatientHistory(res.data || []))
         .catch(() => console.error("Failed to load patient history"));
    }
  }, [appt?.patient_id, id]);

  useEffect(() => {
    api.get('/pharmacy/medicine').then(res => setMedicineList(res.data || [])).catch(() => {});
    api.get('/test').then(res => setLabTests(res.data || [])).catch(() => {});
  }, []);

  // Invisible Auto-Save
  useEffect(() => {
    const hasNotes = consult.symptoms || consult.diagnosis || consult.notes;
    const validMedicines = medicines.filter(med => med.medicine_id !== '');
    if (!hasNotes && validMedicines.length === 0) return;
    if (appt?.status === 'completed') return;

    setSaveStatus('Saving...');
    const delayDebounceFn = setTimeout(async () => {
      try {
        if (hasNotes) await api.post('/doctor/medical-record', { appointment_id: id, symptoms: consult.symptoms, diagnosis: consult.diagnosis, clinical_notes: consult.notes, follow_up_date: consult.follow_up || null });
        if (validMedicines.length > 0) {
          const formattedMeds = validMedicines.map(med => ({ ...med, morning: med.morning ? 1 : 0, afternoon: med.afternoon ? 1 : 0, evening: med.evening ? 1 : 0, night: med.night ? 1 : 0 }));
          await api.post('/doctor/prescription', { appointment_id: id, medicines: formattedMeds });
        }
        setSaveStatus('Saved'); setTimeout(() => setSaveStatus(''), 3000);
      } catch (err) { setSaveStatus('Failed to save'); }
    }, 1500); 
    return () => clearTimeout(delayDebounceFn);
  }, [consult, medicines, id, appt?.status]);

  const completeConsultation = async () => {
    if (!window.confirm('Finalize and close this consultation?')) return;
    setSaving(true);
    try {
      const formattedMeds = medicines.filter(m => m.medicine_id !== '').map(m => ({ ...m, morning: m.morning ? 1 : 0, afternoon: m.afternoon ? 1 : 0, evening: m.evening ? 1 : 0, night: m.night ? 1 : 0 }));
      await api.put(`/doctor/complete/${id}`, { medicines: formattedMeds, ...consult });
      toast.success('Consultation completed successfully!');
      navigate('/doctor/appointments');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to complete'); } 
    finally { setSaving(false); }
  };

  const saveLabRequest = async () => {
    const valid = labRequests.filter(l => l.test);
    if (valid.length === 0) return toast.error('Select at least one test');
    setSaving(true);
    try {
      for (const req of valid) {
        const selectedTest = labTests.find(t => t.lab_test_id === Number(req.test));
        await api.post('/lab-request', { appointment_id: id, test_name: selectedTest.name, department: selectedTest.department, test_price: selectedTest.price });
      }
      toast.success('Lab request sent!'); setLabRequests([{ test: '' }]);
      const res = await api.get(`/doctor/appointments/${id}`); setAppt(res.data);
    } catch { toast.error('Failed to submit lab request'); } 
    finally { setSaving(false); }
  };

  const downloadLabPDF = (result, pastDoctorName = null) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22); doc.setTextColor(13, 148, 136); // Teal-600
      doc.text("MediCare Lab Report", 105, 20, { align: "center" });
      
      doc.setFontSize(12); doc.setTextColor(100, 100, 100); 
      doc.text("Official Laboratory Report", 105, 28, { align: "center" });
      
      doc.setFontSize(10); doc.setTextColor(0, 0, 0); 
      doc.text(`Patient: ${appt.patient_name}`, 14, 45); 
      doc.text(`Date: ${formatDate(new Date())}`, 130, 45);
      
      autoTable(doc, { 
        startY: 65, 
        head: [["Test Name", "Result / Findings"]], 
        body: [[result.test_name, result.result || "Pending / No findings"]], 
        theme: 'grid', 
        headStyles: { fillColor: [13, 148, 136] } 
      });
      
      doc.save(`Lab_Report_${result.test_name.replace(/\s+/g, '_')}_${appt.patient_name}.pdf`);
      toast.success("Lab Report downloaded!");
    } catch { toast.error("Error generating PDF"); }
  };

  const updateMedicine = (i, field, val) => {
    const updated = [...medicines]; updated[i][field] = val;
    if (field === 'medicine_id' && val !== '') {
      const selectedMed = medicineList.find(m => m.medicine_id === Number(val));
      if (selectedMed) {
        let newUnit = 'tablet'; if (selectedMed.form === 'Syrup') newUnit = 'ml'; if (selectedMed.form === 'Drops') newUnit = 'drop'; if (selectedMed.form === 'Tube') newUnit = 'tube'; if (selectedMed.form === 'Injection') newUnit = 'ml';
        updated[i].unit = newUnit;
      }
    }
    if (['morning', 'afternoon', 'evening', 'night'].includes(field)) {
      const med = updated[i]; updated[i].frequency = (med.morning ? 1 : 0) + (med.afternoon ? 1 : 0) + (med.evening ? 1 : 0) + (med.night ? 1 : 0);
    }
    setMedicines(updated);
  };

  if (loading) return <div className="min-h-screen p-8 flex items-center justify-center"><div className="w-6 h-6 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" /></div>;
  if (!appt) return <div className="p-8 text-center text-slate-500 font-medium">Appointment not found.</div>;

  const isCompleted = appt.status === 'completed';
  const isLocked = appt.status === 'arrived'; 

  const tabs = [ { id: 'consult', label: 'Consultation Notes' }, { id: 'prescription', label: 'Prescription' }, { id: 'lab', label: 'Diagnostics' }, { id: 'history', label: 'Patient History' } ];

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      
      {/* --- Header --- */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Clinical Encounter</h1>
          <p className="text-slate-500 text-sm font-medium mt-1 flex items-center gap-2">
            Patient: <span className="font-semibold text-slate-800">{appt.patient_name}</span> • {formatDate(appt.appointment_date)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={appt.status} />

          {appt.status === 'arrived' && (
            <button onClick={async () => { try { await api.put(`/doctor/start/${id}`); toast.success("Consultation started!"); setAppt(prev => ({ ...prev, status: 'in_consultation' })); } catch { toast.error("Failed to start"); } }} className="bg-teal-600 text-white hover:bg-teal-700 px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-[0_4px_10px_-2px_rgba(20,184,166,0.3)] transition-all">
              <Play size={16} /> Start Encounter
            </button>
          )}

          {appt.status === 'in_consultation' && (
            <button onClick={completeConsultation} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] transition-all">
              <CheckCircle size={16} /> {saving ? 'Processing...' : 'Finalize & Close'}
            </button>
          )}
        </div>
      </div>

      {/* --- Animated Tabs --- */}
      <div className="flex items-center gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/50 shadow-inner">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-colors z-10 ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
            {activeTab === tab.id && <motion.div layoutId="consultTab" className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/60 -z-10" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />}
            {tab.label}
          </button>
        ))}
        {!isCompleted && saveStatus && <span className="text-[11px] font-semibold ml-4 uppercase tracking-widest" style={{ color: saveStatus === 'Failed to save' ? '#ef4444' : '#10b981' }}>{saveStatus}</span>}
      </div>

      {/* --- Content Area --- */}
      <div className="relative">
        
        {/* Glassmorphic Lock Overlay */}
        {isLocked && activeTab !== 'history' && (
          <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-[24px] border border-slate-200/60">
            <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 text-center max-w-sm">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 border border-amber-100/60 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={20} /></div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Encounter Locked</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Click "Start Encounter" above to begin editing the medical records.</p>
            </div>
          </div>
        )}

        <div className={`bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 min-h-[500px] p-6 sm:p-8 transition-opacity ${isLocked && activeTab !== 'history' ? 'opacity-40 pointer-events-none select-none' : 'opacity-100'}`}>

          {/* 1. CONSULT TAB */}
          {activeTab === 'consult' && (
            <motion.div variants={FADE_UP_SPRING} className="space-y-6">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Presenting Symptoms</label>
                <textarea placeholder="Describe patient symptoms..." className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none min-h-[120px] resize-none" disabled={isCompleted} value={consult.symptoms} onChange={e => setConsult({ ...consult, symptoms: e.target.value })} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Clinical Diagnosis</label>
                <input placeholder="Primary diagnosis..." className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none" disabled={isCompleted} value={consult.diagnosis} onChange={e => setConsult({ ...consult, diagnosis: e.target.value })} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Physician Notes & Recommendations</label>
                <textarea placeholder="Additional clinical notes..." className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none min-h-[120px] resize-none" disabled={isCompleted} value={consult.notes} onChange={e => setConsult({ ...consult, notes: e.target.value })} />
              </div>
            </motion.div>
          )}

          {/* 2. PRESCRIPTION TAB */}
          {activeTab === 'prescription' && (
            <motion.div variants={FADE_UP_SPRING} className="space-y-6">
              {medicines.map((med, i) => (
                <div key={`med-${i}`} className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/60 relative">
                  <div className="grid grid-cols-12 gap-5 mb-5">
                    <div className="col-span-12 md:col-span-4">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">Select Medicine</label>
                      <select className="w-full border border-slate-200/60 bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 rounded-xl py-2.5 px-3 text-sm font-medium transition-all outline-none appearance-none" disabled={isCompleted} value={med.medicine_id} onChange={e => updateMedicine(i, 'medicine_id', e.target.value)}>
                        <option value="">Search inventory...</option>
                        {medicineList.map(m => <option key={m.medicine_id} value={m.medicine_id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">Dose</label>
                      <input type="number" step="0.5" className="w-full border border-slate-200/60 bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 rounded-xl py-2.5 px-3 text-sm font-medium transition-all outline-none" disabled={isCompleted} value={med.dose} onChange={e => updateMedicine(i, 'dose', e.target.value)} />
                    </div>
                    <div className="col-span-4 md:col-span-3">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">Duration (Days)</label>
                      <input type="number" className="w-full border border-slate-200/60 bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 rounded-xl py-2.5 px-3 text-sm font-medium transition-all outline-none" disabled={isCompleted} value={med.duration} onChange={e => updateMedicine(i, 'duration', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center bg-white p-4 rounded-xl border border-slate-200/60">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Clock size={12} /> Daily Schedule</label>
                      <div className="flex flex-wrap gap-3">
                        {['morning', 'afternoon', 'evening', 'night'].map(time => (
                          <label key={time} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500" disabled={isCompleted} checked={med[time]} onChange={e => updateMedicine(i, time, e.target.checked)} />
                            <span className="text-[13px] font-medium text-slate-700 capitalize">{time}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 block">Food Interaction</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name={`food_${i}`} className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500" disabled={isCompleted} checked={med.food_timing === 'before_food'} onChange={() => updateMedicine(i, 'food_timing', 'before_food')} />
                          <span className="text-[13px] font-medium text-slate-700">Before Food</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name={`food_${i}`} className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500" disabled={isCompleted} checked={med.food_timing === 'after_food'} onChange={() => updateMedicine(i, 'food_timing', 'after_food')} />
                          <span className="text-[13px] font-medium text-slate-700">After Food</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-4 items-end">
                    <div className="flex-1">
                      <input type="text" className="w-full border border-slate-200/60 bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 rounded-xl py-2.5 px-4 text-sm font-medium transition-all outline-none" disabled={isCompleted} value={med.instructions} onChange={e => updateMedicine(i, 'instructions', e.target.value)} placeholder="Special instructions (e.g. Take with warm water)..." />
                    </div>
                    {!isCompleted && medicines.length > 1 && (
                      <button type="button" onClick={() => setMedicines(medicines.filter((_, idx) => idx !== i))} className="p-2.5 bg-white border border-slate-200/60 text-rose-500 rounded-xl hover:bg-rose-50 transition-colors shadow-sm">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!isCompleted && (
                <button type="button" onClick={() => setMedicines([...medicines, { medicine_id: '', dose: '', unit: 'tablet', frequency: 0, duration: '', morning: false, afternoon: false, evening: false, night: false, food_timing: 'after_food', instructions: '' }])} className="w-full py-3 border-2 border-dashed border-teal-200/60 text-teal-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-teal-50/50 transition-colors">
                  <Plus size={16} /> Add Medication
                </button>
              )}
            </motion.div>
          )}

          {/* 3. LAB TAB */}
          {activeTab === 'lab' && (
            <motion.div variants={FADE_UP_SPRING} className="space-y-6">
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/60">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-4">Request New Diagnostics</h3>
                {labRequests.map((req, i) => (
                  <div key={`req-${i}`} className="flex gap-3 mb-3">
                    <select className="flex-1 border border-slate-200/60 bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 rounded-xl py-2.5 px-4 text-sm font-medium transition-all outline-none appearance-none shadow-sm" disabled={isCompleted} value={req.test} onChange={e => { const updated = [...labRequests]; updated[i].test = e.target.value; setLabRequests(updated); }}>
                      <option value="">Select Diagnostic Test...</option>
                      {labTests.map(test => <option key={test.lab_test_id} value={test.lab_test_id}>{test.name} - ₹{test.price}</option>)}
                    </select>
                    {!isCompleted && (
                      <button onClick={() => setLabRequests(labRequests.filter((_, idx) => idx !== i))} className="p-2.5 bg-white border border-slate-200/60 text-rose-500 rounded-xl hover:bg-rose-50 shadow-sm transition-colors"><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
                {!isCompleted && (
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setLabRequests([...labRequests, { test: '' }])} className="px-4 py-2 bg-white border border-slate-200/60 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"><Plus size={14} /> Add Line</button>
                    <button onClick={saveLabRequest} disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[13px] font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-md"><FlaskConical size={14} /> Transmit to Lab</button>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-4">Associated Results</h3>
                {appt.lab_results?.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {appt.lab_results.map((result, index) => (
                      <div key={`lab-${result.request_id}-${index}`} className="p-5 bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-slate-900 tracking-tight text-sm">{result.test_name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-widest">{formatDate(result.updated_at || result.created_at)}</p>
                          </div>
                          <StatusBadge status={result.status} />
                        </div>
                        {result.status === 'completed' && (
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                            <p className="text-[13px] text-slate-600 font-medium line-clamp-1 flex-1"><strong>Findings:</strong> {result.result}</p>
                            <button onClick={() => downloadLabPDF(result)} className="text-[11px] font-bold uppercase tracking-widest text-teal-600 bg-teal-50 hover:bg-teal-600 hover:text-white px-3 py-1.5 rounded-md transition-colors border border-teal-100 shrink-0">PDF</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[13px] text-slate-500 font-medium">No diagnostics have been requested or completed yet.</p>}
              </div>
            </motion.div>
          )}

          {/* 4. HISTORY TAB */}
          {activeTab === 'history' && (
            <motion.div variants={FADE_UP_SPRING} className="space-y-5">
              {patientHistory.length === 0 ? (
                <div className="bg-slate-50/50 border border-slate-200/60 rounded-[24px] p-12 text-center">
                  <History className="mx-auto text-slate-300 mb-3" size={28} />
                  <p className="text-sm text-slate-500 font-medium">No previous encounters recorded for this patient.</p>
                </div>
              ) : (
                patientHistory.map((record, index) => (
                  <div key={`history-${record.appointment_id}-${index}`} className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-900 tracking-tight text-lg">{formatDate(record.appointment_date)}</p>
                        <p className="text-[13px] text-slate-500 font-medium mt-1 flex items-center gap-2">
                          Dr. {record.doctor_name} <span className="bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-widest">{record.department}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Symptoms</p>
                        <p className="text-[13px] text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{record.symptoms || 'None recorded'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Diagnosis</p>
                        <p className="text-[13px] text-slate-900 font-semibold leading-relaxed bg-teal-50/50 border border-teal-100/60 p-4 rounded-xl">{record.diagnosis || 'None recorded'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Clinical Notes</p>
                        <p className="text-[13px] text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">{record.clinical_notes || 'None recorded'}</p>
                      </div>
                    </div>

                    {/* 🔥 Render Historical Medicines */}
                    {record.medicines && record.medicines.length > 0 && (
                      <div className="mt-6 pt-5 border-t border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Pill size={12} className="text-teal-500"/> Prescribed Medications</p>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {record.medicines.map((med, mIdx) => {
                            const schedule = [];
                            if (med.morning) schedule.push('Morn'); if (med.afternoon) schedule.push('Aft'); if (med.evening) schedule.push('Eve'); if (med.night) schedule.push('Night');
                            const scheduleText = schedule.length > 0 ? schedule.join('-') : 'As needed';
                            return (
                              <div key={`hist-med-${mIdx}`} className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-[13px] font-semibold text-slate-900 tracking-tight">{med.medicine_name}</p>
                                  <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">{med.duration} Days</span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">{med.dose} {med.unit} • {scheduleText}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 🔥 Render Historical Lab Results (Your Snippet added here!) */}
                    {record.lab_results && record.lab_results.length > 0 && (
                      <div className="mt-6 pt-5 border-t border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <FlaskConical size={12} className="text-teal-500" /> Associated Lab Results
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {record.lab_results.map((lab, lIdx) => (
                            <div key={`hist-lab-${lab.request_id}-${lIdx}`} className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex justify-between items-center shadow-sm">
                              <div>
                                <p className="text-[13px] font-semibold text-slate-900">{lab.test_name}</p>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{lab.result || 'Pending / No findings'}</p>
                              </div>
                              {lab.status === 'completed' && (
                                <button
                                  onClick={() => downloadLabPDF(lab, record.doctor_name)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-white text-teal-600 border border-teal-200/60 hover:bg-teal-50 hover:border-teal-300 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-widest shadow-sm"
                                >
                                  <FileText size={12} /> PDF
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                ))
              )}
            </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  );
}