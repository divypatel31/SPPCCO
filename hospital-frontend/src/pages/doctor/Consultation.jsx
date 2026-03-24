import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pill, CheckCircle, FlaskConical, Lock, Play, Clock, FileText, History, Activity, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.6 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
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

  const [consult, setConsult] = useState({
    symptoms: '',
    diagnosis: '',
    notes: '',
    follow_up: ''
  });

  const [medicines, setMedicines] = useState([
    {
      medicine_id: '', dose: '', unit: 'tablet', frequency: 0, duration: '',
      morning: false, afternoon: false, evening: false, night: false,
      food_timing: 'after_food', instructions: ''
    }
  ]);

  const [labRequests, setLabRequests] = useState([
    { test: '' }
  ]);

  /* Fetch appointment */
  useEffect(() => {
    api.get(`/doctor/appointments/${id}`)
      .then(res => {
        setAppt(res.data);
        
        if (res.data.medical_record) {
          setConsult({
            symptoms: res.data.medical_record.symptoms || '',
            diagnosis: res.data.medical_record.diagnosis || '',
            notes: res.data.medical_record.clinical_notes || '',
            follow_up: res.data.medical_record.follow_up_date || ''
          });
        }
        
        if (res.data.medicines && res.data.medicines.length > 0) {
          setMedicines(res.data.medicines);
        }
      })
      .catch(() => {
        toast.error("Appointment not found");
        setAppt(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  /* FETCH PATIENT HISTORY ON LOAD */
  useEffect(() => {
    if (appt?.patient_id) {
      api.get(`/doctor/patient-history/${appt.patient_id}?current_appt=${id}`)
        .then(res => setPatientHistory(res.data || []))
        .catch(() => console.error("Failed to load patient history"));
    }
  }, [appt?.patient_id, id]);

  /* Fetch medicines & lab tests */
  useEffect(() => {
    api.get('/pharmacy/medicine').then(res => setMedicineList(res.data || [])).catch(() => {});
    api.get('/test').then(res => setLabTests(res.data || [])).catch(() => {});
  }, []);

  /* INVISIBLE AUTO-SAVE LOGIC */
  useEffect(() => {
    const hasNotes = consult.symptoms || consult.diagnosis || consult.notes;
    const validMedicines = medicines.filter(med => med.medicine_id !== '');

    if (!hasNotes && validMedicines.length === 0) return;
    if (appt?.status === 'completed') return;

    setSaveStatus('Saving...');

    const delayDebounceFn = setTimeout(async () => {
      try {
        if (hasNotes) {
          await api.post('/doctor/medical-record', {
            appointment_id: id,
            symptoms: consult.symptoms,
            diagnosis: consult.diagnosis,
            clinical_notes: consult.notes,
            follow_up_date: consult.follow_up || null
          });
        }

        if (validMedicines.length > 0) {
          const formattedMedicines = validMedicines.map(med => ({
            ...med,
            morning: med.morning ? 1 : 0,
            afternoon: med.afternoon ? 1 : 0,
            evening: med.evening ? 1 : 0,
            night: med.night ? 1 : 0
          }));
          await api.post('/doctor/prescription', { appointment_id: id, medicines: formattedMedicines });
        }

        setSaveStatus('Saved');
        setTimeout(() => setSaveStatus(''), 3000);
      } catch (err) {
        setSaveStatus('Failed to save');
      }
    }, 1500); 

    return () => clearTimeout(delayDebounceFn);
  }, [consult, medicines, id, appt?.status]);

  /* Complete Consultation */
  const completeConsultation = async () => {
    if (!window.confirm('Mark consultation as complete?')) return;

    setSaving(true);
    try {
      const finalMedicines = medicines.filter(med => med.medicine_id !== '');
      const formattedMedicines = finalMedicines.map(med => ({
        ...med,
        morning: med.morning ? 1 : 0, afternoon: med.afternoon ? 1 : 0,
        evening: med.evening ? 1 : 0, night: med.night ? 1 : 0
      }));

      await api.put(`/doctor/complete/${id}`, { medicines: formattedMedicines, ...consult });
      toast.success('Consultation completed successfully!');
      navigate('/doctor/appointments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete');
    } finally {
      setSaving(false);
    }
  };

  const saveLabRequest = async () => {
    const valid = labRequests.filter(l => l.test);
    if (valid.length === 0) return toast.error('Select at least one test');

    setSaving(true);
    try {
      for (const req of valid) {
        const selectedTest = labTests.find(t => t.lab_test_id === Number(req.test));
        await api.post('/lab-request', {
          appointment_id: id,
          test_name: selectedTest.name,
          department: selectedTest.department,
          test_price: selectedTest.price 
        });
      }
      toast.success('Lab request sent!');
      setLabRequests([{ test: '' }]);
      
      const res = await api.get(`/doctor/appointments/${id}`);
      setAppt(res.data);
    } catch (err) {
      toast.error('Failed to submit lab request');
    } finally {
      setSaving(false);
    }
  };

  const downloadLabPDF = (result, pastDoctorName = null) => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(231, 76, 60);
      doc.text("MediCare Pathology Lab", 105, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text("Official Laboratory Report", 105, 28, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Patient: ${appt.patient_name}`, 14, 45);
      doc.text(`Doctor: Dr. ${pastDoctorName || appt.doctor_name || 'Assigned'}`, 14, 52);
      doc.text(`Date: ${formatDate(new Date())}`, 130, 45);

      const tableColumn = ["Test Name", "Result / Findings"];
      const tableRows = [[result.test_name, result.result || "No findings recorded"]];

      autoTable(doc, {
        startY: 65, head: [tableColumn], body: tableRows,
        theme: 'grid', headStyles: { fillColor: [231, 76, 60] },
      });

      doc.setFontSize(9);
      doc.text("This is a computer-generated report and does not require a physical signature.", 105, doc.lastAutoTable.finalY + 20, { align: "center" });

      doc.save(`Lab_Report_${result.test_name.replace(/\s+/g, '_')}_${appt.patient_name}.pdf`);
      toast.success("Lab Report downloaded!");
    } catch (err) {
      toast.error("Error generating PDF");
    }
  };

  const addMedicineRow = () => setMedicines([...medicines, { medicine_id: '', dose: '', unit: 'tablet', frequency: 0, duration: '', morning: false, afternoon: false, evening: false, night: false, food_timing: 'after_food', instructions: '' }]);
  const removeMedicineRow = (i) => setMedicines(medicines.filter((_, idx) => idx !== i));

  const updateMedicine = (i, field, val) => {
    const updated = [...medicines];
    updated[i][field] = val;

    if (field === 'medicine_id' && val !== '') {
      const selectedMed = medicineList.find(m => m.medicine_id === Number(val));
      if (selectedMed) {
        let newUnit = 'tablet';
        if (selectedMed.form === 'Syrup') newUnit = 'ml';
        if (selectedMed.form === 'Drops') newUnit = 'drop';
        if (selectedMed.form === 'Tube') newUnit = 'tube';
        if (selectedMed.form === 'Injection') newUnit = 'ml';
        updated[i].unit = newUnit;
      }
    }

    if (['morning', 'afternoon', 'evening', 'night'].includes(field)) {
      const med = updated[i];
      updated[i].frequency = (med.morning ? 1 : 0) + (med.afternoon ? 1 : 0) + (med.evening ? 1 : 0) + (med.night ? 1 : 0);
    }
    setMedicines(updated);
  };

  const addLabRow = () => setLabRequests([...labRequests, { test: '' }]);
  const updateLab = (i, val) => { const updated = [...labRequests]; updated[i].test = val; setLabRequests(updated); };

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  );

  if (!appt) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <Activity size={48} className="text-slate-300 mb-4" />
      <h3 className="text-xl font-bold text-slate-800">Encounter Not Found</h3>
      <p className="text-slate-500 font-medium">This appointment record could not be located.</p>
    </div>
  );

  const isCompleted = appt.status === 'completed';
  const isLocked = appt.status === 'arrived'; 

  const tabs = [
    { id: 'consult', label: 'Clinical Notes', icon: FileText },
    { id: 'prescription', label: 'Prescription', icon: Pill },
    { id: 'lab', label: 'Diagnostics', icon: FlaskConical },
    { id: 'history', label: 'Patient History', icon: History } 
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="max-w-[1200px] mx-auto font-sans p-4 sm:p-6 pb-24">
      
      {/* --- HEADER --- */}
      <motion.div variants={FADE_UP} className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center font-bold text-lg shadow-sm border border-teal-100">
              {appt.patient_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{appt.patient_name}</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                ID: {appt.patient_id} • {formatDate(appt.appointment_date)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={appt.status} />

          {appt.status === 'arrived' && (
            <button
              onClick={async () => {
                try {
                  await api.put(`/doctor/start/${id}`);
                  toast.success("Consultation started!");
                  setAppt(prev => ({ ...prev, status: 'in_consultation' }));
                } catch (err) { toast.error("Failed to start"); }
              }}
              className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-teal-500/30 hover:bg-teal-700 transition-all"
            >
              <Play size={16} /> Start Encounter
            </button>
          )}

          {appt.status === 'in_consultation' && (
            <button onClick={completeConsultation} disabled={saving} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50">
              <CheckCircle size={16} /> {saving ? 'Finalizing...' : 'Complete Encounter'}
            </button>
          )}
        </div>
      </motion.div>

      {/* --- TABS --- */}
      <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="bg-white p-1.5 rounded-[16px] flex gap-1 overflow-x-auto hide-scrollbar border border-slate-200/60 shadow-sm w-full sm:w-auto">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap flex items-center gap-2 ${isActive ? 'text-teal-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              >
                {isActive && <motion.div layoutId="consultTab" className="absolute inset-0 bg-teal-50 rounded-xl border border-teal-100/50" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                <Icon size={16} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Auto-Save Indicator */}
        {!isCompleted && (
          <AnimatePresence>
            {saveStatus && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border ${saveStatus === 'Failed to save' ? 'bg-rose-50 text-rose-600 border-rose-200' : saveStatus === 'Saving...' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}
              >
                <Save size={12} /> {saveStatus}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* --- CONTENT AREA --- */}
      <motion.div variants={FADE_UP} className="relative">
        
        {/* Locked Overlay */}
        <AnimatePresence>
          {isLocked && activeTab !== 'history' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-50/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-[24px] border border-slate-200/50"
            >
              <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 text-center max-w-sm">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-100">
                  <Lock size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Record Locked</h2>
                <p className="text-sm font-medium text-slate-500 leading-relaxed mb-6">
                  Please initiate the encounter by clicking <strong>Start Encounter</strong> before adding clinical notes or prescriptions.
                </p>
                <button
                  onClick={async () => {
                    try {
                      await api.put(`/doctor/start/${id}`);
                      toast.success("Consultation started!");
                      setAppt(prev => ({ ...prev, status: 'in_consultation' }));
                    } catch (err) { toast.error("Failed to start"); }
                  }}
                  className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={18} /> Start Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`transition-all duration-300 ${isLocked && activeTab !== 'history' ? 'opacity-40 pointer-events-none select-none filter blur-[2px]' : 'opacity-100'}`}>

          {/* === 1. CONSULT TAB === */}
          {activeTab === 'consult' && (
            <motion.div initial="hidden" animate="visible" variants={FADE_UP} className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] space-y-6">
              
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Presenting Symptoms</label>
                <textarea 
                  placeholder="e.g., Fever for 3 days, mild headache..." 
                  className="w-full p-4 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 rounded-2xl text-sm font-medium outline-none transition-all resize-none min-h-[120px]" 
                  disabled={isCompleted} 
                  value={consult.symptoms} 
                  onChange={e => setConsult({ ...consult, symptoms: e.target.value })} 
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Clinical Diagnosis</label>
                <input 
                  placeholder="e.g., Viral Pharyngitis" 
                  className="w-full p-4 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 rounded-2xl text-sm font-medium outline-none transition-all" 
                  disabled={isCompleted} 
                  value={consult.diagnosis} 
                  onChange={e => setConsult({ ...consult, diagnosis: e.target.value })} 
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Physician Notes & Observations</label>
                <textarea 
                  placeholder="Additional medical observations..." 
                  className="w-full p-4 bg-slate-50 border border-slate-200/60 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 rounded-2xl text-sm font-medium outline-none transition-all resize-none min-h-[120px]" 
                  disabled={isCompleted} 
                  value={consult.notes} 
                  onChange={e => setConsult({ ...consult, notes: e.target.value })} 
                />
              </div>
            </motion.div>
          )}

          {/* === 2. PRESCRIPTION TAB === */}
          {activeTab === 'prescription' && (
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-4">
              
              <AnimatePresence>
                {medicines.map((med, i) => (
                  <motion.div key={`med-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] relative group">
                    
                    <div className="grid grid-cols-12 gap-4 mb-5">
                      <div className="col-span-12 md:col-span-5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Select Medicine</label>
                        <select className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10" disabled={isCompleted} value={med.medicine_id} onChange={e => updateMedicine(i, 'medicine_id', e.target.value)}>
                          <option value="">-- Choose from inventory --</option>
                          {medicineList.map(m => <option key={m.medicine_id} value={m.medicine_id}>{m.name}</option>)}
                        </select>
                      </div>

                      <div className="col-span-6 md:col-span-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Dose</label>
                        <input type="number" step="0.5" className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10" disabled={isCompleted} value={med.dose} onChange={e => updateMedicine(i, 'dose', e.target.value)} />
                      </div>

                      <div className="col-span-6 md:col-span-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Unit</label>
                        <select className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10" disabled={isCompleted} value={med.unit} onChange={e => updateMedicine(i, 'unit', e.target.value)}>
                          <option value="tablet">Tablet</option><option value="ml">ml</option><option value="drop">Drop</option><option value="mg">mg</option><option value="tube">Tube</option>
                        </select>
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Duration (Days)</label>
                        <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10" disabled={isCompleted} value={med.duration} onChange={e => updateMedicine(i, 'duration', e.target.value)} placeholder="e.g. 5" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-1"><Clock size={12} /> Intake Schedule</label>
                        <div className="flex flex-wrap gap-4">
                          {['morning', 'afternoon', 'evening', 'night'].map(time => (
                            <label key={time} className="flex items-center gap-2 cursor-pointer group/chk">
                              <div className="relative flex items-center justify-center">
                                <input type="checkbox" className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded checked:bg-teal-500 checked:border-teal-500 cursor-pointer transition-all" disabled={isCompleted} checked={med[time]} onChange={e => updateMedicine(i, time, e.target.checked)} />
                                <CheckCircle size={14} strokeWidth={3} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                              </div>
                              <span className="text-sm font-semibold text-slate-600 capitalize group-hover/chk:text-slate-900">{time}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="lg:border-l lg:border-slate-200 lg:pl-6">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 block">Food Timing</label>
                        <div className="flex gap-6">
                          {['before_food', 'after_food'].map(timing => (
                            <label key={timing} className="flex items-center gap-2 cursor-pointer group/rad">
                              <div className="relative flex items-center justify-center">
                                <input type="radio" name={`food_${i}`} className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-full checked:border-teal-500 cursor-pointer transition-all" disabled={isCompleted} checked={med.food_timing === timing} onChange={() => updateMedicine(i, 'food_timing', timing)} />
                                <div className="absolute w-2.5 h-2.5 bg-teal-500 rounded-full opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                              </div>
                              <span className="text-sm font-semibold text-slate-600 capitalize group-hover/rad:text-slate-900">{timing.replace('_', ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <div className="flex-1">
                        <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10 placeholder:text-slate-400" disabled={isCompleted} value={med.instructions} onChange={e => updateMedicine(i, 'instructions', e.target.value)} placeholder="Specific instructions (e.g. Take with warm water)..." />
                      </div>
                      {!isCompleted && medicines.length > 1 && (
                        <button type="button" onClick={() => removeMedicineRow(i)} className="px-4 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-colors border border-rose-100 hover:border-rose-500 flex items-center justify-center">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {!isCompleted && (
                <button type="button" onClick={addMedicineRow} className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-[24px] hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/50 transition-all flex items-center justify-center gap-2">
                  <Plus size={18} /> Append New Medication
                </button>
              )}
            </motion.div>
          )}

          {/* === 3. LAB TAB === */}
          {activeTab === 'lab' && (
            <motion.div initial="hidden" animate="visible" variants={FADE_UP} className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
              
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Plus size={16} className="text-teal-500"/> Order New Diagnostics</h3>
                <div className="space-y-3">
                  {labRequests.map((req, i) => (
                    <div key={`req-${i}`} className="flex items-center gap-3">
                      <select className="flex-1 p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10" disabled={isCompleted} value={req.test} onChange={e => updateLab(i, e.target.value)}>
                        <option value="">-- Search Diagnostic Test --</option>
                        {labTests.map(test => <option key={`test-${test.lab_test_id}`} value={test.lab_test_id}>{test.name} - ₹{test.price}</option>)}
                      </select>
                      {!isCompleted && (
                        <button onClick={() => setLabRequests(labRequests.filter((_, idx) => idx !== i))} className="p-3 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!isCompleted && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    <button onClick={addLabRow} className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl text-sm flex items-center gap-2 transition-colors">
                      <Plus size={16} /> Add Test
                    </button>
                    <button onClick={saveLabRequest} disabled={saving} className="px-5 py-2.5 bg-teal-600 text-white hover:bg-teal-700 font-bold rounded-xl text-sm flex items-center gap-2 shadow-md transition-colors disabled:opacity-50">
                      <FlaskConical size={16} /> Transmit to Lab
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-8">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><History size={16} className="text-blue-500"/> Associated Lab Results</h3>
                
                {appt.lab_results?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {appt.lab_results.map((result, index) => (
                      <div key={`lab-${result.request_id}-${index}`} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900">{result.test_name}</p>
                            <p className="text-[11px] font-semibold text-slate-500 tracking-wider mt-1 uppercase">Req: {formatDate(result.updated_at || result.created_at || new Date())}</p>
                          </div>
                          <StatusBadge status={result.status} />
                        </div>

                        {result.status === 'completed' && (
                          <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col gap-3">
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Clinical Findings</p>
                              <p className="text-sm font-medium text-slate-800 leading-relaxed">{result.result}</p>
                            </div>
                            <button onClick={() => downloadLabPDF(result)} className="self-start flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-colors border border-blue-100 hover:border-blue-600">
                              <FileText size={14} /> Download Official PDF
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <FlaskConical size={24} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">No diagnostic reports associated with this encounter.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* === 4. HISTORY TAB === */}
          {activeTab === 'history' && (
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-6">
              
              {patientHistory.length === 0 ? (
                <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm text-center py-16">
                  <History size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-base font-bold text-slate-700">No Historical Records</p>
                  <p className="text-sm font-medium text-slate-500 mt-1">This patient does not have any prior completed encounters.</p>
                </div>
              ) : (
                patientHistory.map((record, index) => (
                  <motion.div key={`history-${record.appointment_id}-${index}`} variants={FADE_UP} className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-100 gap-2">
                      <div>
                        <p className="font-black text-slate-900 text-lg tracking-tight">{formatDate(record.appointment_date)}</p>
                        <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mt-1">Dr. {record.doctor_name} ({record.department})</p>
                      </div>
                      <div className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-200">
                        Record #{record.appointment_id}
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Symptoms</p>
                        <p className="text-sm font-medium text-slate-800">{record.symptoms || 'None recorded'}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Diagnosis</p>
                        <p className="text-sm font-bold text-slate-900">{record.diagnosis || 'None recorded'}</p>
                      </div>
                      <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Clinical Notes</p>
                        <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{record.clinical_notes || 'None recorded'}</p>
                      </div>
                    </div>

                    {/* Prescribed Medicines in History */}
                    {record.medicines && record.medicines.length > 0 && (
                      <div className="mt-6">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Pill size={14} className="text-emerald-500" /> Prescribed Medications
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {record.medicines.map((med, mIdx) => {
                            const schedule = [];
                            if (med.morning) schedule.push('Morn');
                            if (med.afternoon) schedule.push('Aft');
                            if (med.evening) schedule.push('Eve');
                            if (med.night) schedule.push('Night');
                            const scheduleText = schedule.length > 0 ? schedule.join('-') : 'As needed';

                            return (
                              <div key={`hist-med-${med.medicine_id}-${mIdx}`} className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-emerald-900 text-sm tracking-tight">{med.medicine_name}</span>
                                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded border border-emerald-200 uppercase tracking-wider">
                                    {med.duration} Days
                                  </span>
                                </div>
                                <div className="text-xs text-emerald-800 font-semibold flex items-center gap-2">
                                  <span>{med.dose} {med.unit}</span>
                                  <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                                  <span className="capitalize">{med.food_timing?.replace('_', ' ')}</span>
                                  <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                                  <span>{scheduleText}</span>
                                </div>
                                {med.instructions && (
                                  <div className="text-xs font-medium text-emerald-600/80 italic bg-white/60 p-2 rounded-lg mt-1">
                                    "{med.instructions}"
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Past Lab Results in History */}
                    {record.lab_results && record.lab_results.length > 0 && (
                      <div className="mt-6">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <FlaskConical size={14} className="text-blue-500" /> Lab Results
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                          {record.lab_results.map((lab, lIdx) => (
                            <div key={`hist-lab-${lab.request_id}-${lIdx}`} className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div>
                                <span className="font-bold text-blue-900 block md:inline">{lab.test_name}</span>
                                <span className="hidden md:inline mx-2 text-blue-200">|</span>
                                <span className="text-sm font-medium text-blue-800 mt-1 md:mt-0 block md:inline">{lab.result || 'No findings recorded'}</span>
                              </div>
                              {lab.status === 'completed' && (
                                <button
                                  onClick={() => downloadLabPDF(lab, record.doctor_name)}
                                  className="text-xs px-3 py-2 bg-white text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white rounded-lg transition-colors font-bold flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                  <FileText size={14} /> View PDF
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
}