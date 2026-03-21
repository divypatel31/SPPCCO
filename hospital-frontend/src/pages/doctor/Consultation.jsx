import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pill, CheckCircle, FlaskConical, Lock, Play, Clock, FileText, History } from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  if (loading) return <Spinner />;
  if (!appt) return <div className="card text-center py-12">Appointment not found.</div>;

  const isCompleted = appt.status === 'completed';
  const isLocked = appt.status === 'arrived'; 

  const tabs = [
    { id: 'consult', label: 'Consult' },
    { id: 'prescription', label: 'Prescription' },
    { id: 'lab', label: 'Lab Tests' },
    { id: 'history', label: 'History' } 
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Consultation</h1>
          <p className="text-gray-500 text-sm">
            Patient: <strong>{appt.patient_name}</strong> · {formatDate(appt.appointment_date)}
          </p>
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
              className="btn-primary flex items-center gap-2"
            >
              <Play size={16} /> Start
            </button>
          )}

          {appt.status === 'in_consultation' && (
            <button onClick={completeConsultation} disabled={saving} className="btn-success flex items-center gap-2">
              <CheckCircle size={16} /> {saving ? 'Processing...' : 'Complete'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            {tab.label}
          </button>
        ))}
        {!isCompleted && saveStatus && <div className="ml-auto self-center text-xs font-bold text-gray-400"><span className={saveStatus === 'Failed to save' ? 'text-red-500' : 'text-blue-500'}>{saveStatus}</span></div>}
      </div>

      {/* Main Content Area */}
      <div className="relative">
        {isLocked && activeTab !== 'history' && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 text-center max-w-sm">
              <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={24} /></div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Consultation Locked</h2>
              <p className="text-sm text-gray-500">Please click the <strong>Start</strong> button above to begin filling records.</p>
            </div>
          </div>
        )}

        <div className={isLocked && activeTab !== 'history' ? 'opacity-30 pointer-events-none select-none' : 'opacity-100 transition-opacity'}>

          {/* CONSULT TAB */}
          {activeTab === 'consult' && (
            <div className="card space-y-4">
              <textarea placeholder="Symptoms" className="input-field min-h-[100px]" disabled={isCompleted} value={consult.symptoms} onChange={e => setConsult({ ...consult, symptoms: e.target.value })} />
              <input placeholder="Diagnosis" className="input-field" disabled={isCompleted} value={consult.diagnosis} onChange={e => setConsult({ ...consult, diagnosis: e.target.value })} />
              <textarea placeholder="Additional Notes" className="input-field min-h-[80px]" disabled={isCompleted} value={consult.notes} onChange={e => setConsult({ ...consult, notes: e.target.value })} />
            </div>
          )}

          {/* PRESCRIPTION TAB */}
          {activeTab === 'prescription' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Pill className="text-blue-600" size={20} /> Prescribe Medicines</h3>
              </div>

              {medicines.map((med, i) => (
                <div key={`med-${i}`} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
                  <div className="grid grid-cols-12 gap-4 mb-4">
                    <div className="col-span-12 md:col-span-4">
                      <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Medicine</label>
                      <select className="input-field py-2" disabled={isCompleted} value={med.medicine_id} onChange={e => updateMedicine(i, 'medicine_id', e.target.value)}>
                        <option value="">Select Medicine...</option>
                        {medicineList.map(m => <option key={m.medicine_id} value={m.medicine_id}>{m.name}</option>)}
                      </select>
                    </div>

                    <div className="col-span-4 md:col-span-2">
                      <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Dose</label>
                      <input type="number" step="0.5" className="input-field py-2" disabled={isCompleted} value={med.dose} onChange={e => updateMedicine(i, 'dose', e.target.value)} />
                    </div>

                    <div className="col-span-4 md:col-span-2">
                      <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Unit</label>
                      <select className="input-field py-2" disabled={isCompleted} value={med.unit} onChange={e => updateMedicine(i, 'unit', e.target.value)}>
                        <option value="tablet">Tablet(s)</option><option value="ml">ml</option><option value="drop">Drop(s)</option><option value="mg">mg</option><option value="tube">Tube</option>
                      </select>
                    </div>

                    <div className="col-span-4 md:col-span-3">
                      <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Duration</label>
                      <div className="flex items-center gap-2">
                        <input type="number" className="input-field py-2" disabled={isCompleted} value={med.duration} onChange={e => updateMedicine(i, 'duration', e.target.value)} />
                        <span className="text-sm font-medium text-gray-500">Days</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div>
                      <label className="text-xs text-gray-500 font-bold uppercase mb-2 flex items-center gap-1"><Clock size={14} /> Schedule</label>
                      <div className="flex flex-wrap gap-4">
                        {['morning', 'afternoon', 'evening', 'night'].map(time => (
                          <label key={time} className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded cursor-pointer" disabled={isCompleted} checked={med[time]} onChange={e => updateMedicine(i, time, e.target.checked)} />
                            <span className="text-sm font-medium text-gray-700 capitalize">{time}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Food Timing</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="radio" name={`food_${i}`} className="w-4 h-4 text-blue-600 cursor-pointer" disabled={isCompleted} checked={med.food_timing === 'before_food'} onChange={() => updateMedicine(i, 'food_timing', 'before_food')} />
                          <span className="text-sm font-medium text-gray-700">Before Food</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="radio" name={`food_${i}`} className="w-4 h-4 text-blue-600 cursor-pointer" disabled={isCompleted} checked={med.food_timing === 'after_food'} onChange={() => updateMedicine(i, 'food_timing', 'after_food')} />
                          <span className="text-sm font-medium text-gray-700">After Food</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-4 items-end">
                    <div className="flex-1">
                      <input type="text" className="input-field py-2 text-sm" disabled={isCompleted} value={med.instructions} onChange={e => updateMedicine(i, 'instructions', e.target.value)} placeholder="Additional instructions..." />
                    </div>
                    {!isCompleted && medicines.length > 1 && (
                      <button type="button" onClick={() => removeMedicineRow(i)} className="p-2.5 bg-red-50 text-red-500 rounded-lg"><Trash2 size={18} /></button>
                    )}
                  </div>
                </div>
              ))}

              {!isCompleted && (
                <button type="button" onClick={addMedicineRow} className="w-full py-3 mt-2 border-2 border-dashed border-blue-200 text-blue-600 font-semibold rounded-xl flex items-center justify-center gap-2"><Plus size={18} /> Add Another Medicine</button>
              )}
            </div>
          )}

          {/* LAB TAB */}
          {activeTab === 'lab' && (
            <div className="card space-y-3">
              {labRequests.map((req, i) => (
                <div key={`req-${i}`} className="grid grid-cols-2 gap-2">
                  <select className="input-field" disabled={isCompleted} value={req.test} onChange={e => updateLab(i, e.target.value)}>
                    <option value="">Select Test</option>
                    {labTests.map(test => <option key={`test-${test.lab_test_id}`} value={test.lab_test_id}>{test.name} - ₹{test.price}</option>)}
                  </select>
                  {!isCompleted && (
                    <button onClick={() => setLabRequests(labRequests.filter((_, idx) => idx !== i))} className="text-red-500"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                {!isCompleted && (
                  <>
                    <button onClick={addLabRow} className="btn-secondary flex items-center gap-2 py-1 text-sm"><Plus size={14} /> Add Test</button>
                    <button onClick={saveLabRequest} disabled={saving} className="btn-primary flex items-center gap-2 py-1 text-sm"><FlaskConical size={14} /> Send To Lab</button>
                  </>
                )}
              </div>

              <h3 className="font-semibold mt-8 border-t pt-4">Previous Lab Results</h3>
              {appt.lab_results?.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 mt-2">
                  {appt.lab_results.map((result, index) => (
                    <div key={`lab-${result.request_id}-${index}`} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-900">{result.test_name}</p>
                          <p className="text-xs text-gray-500 mt-1">Requested: {formatDate(result.updated_at || result.created_at || new Date())}</p>
                        </div>
                        <StatusBadge status={result.status} />
                      </div>

                      {result.status === 'completed' && (
                        <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <p className="text-sm text-gray-600 line-clamp-1 flex-1 pr-4"><strong>Findings:</strong> {result.result}</p>
                          <button onClick={() => downloadLabPDF(result)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-colors">
                            <FileText size={14} /> Download PDF
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No lab results found for this appointment.</p>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <History className="text-blue-600" size={20} /> Past Medical Records
              </h3>
              
              {patientHistory.length === 0 ? (
                <div className="card bg-gray-50 border-gray-100 text-center py-10">
                  <p className="text-gray-500">No past medical history found for this patient.</p>
                </div>
              ) : (
                patientHistory.map((record, index) => (
                  <div key={`history-${record.appointment_id}-${index}`} className="card p-5 bg-white shadow-sm border border-gray-200 mb-4 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{formatDate(record.appointment_date)}</p>
                        <p className="text-sm text-blue-600 font-medium">Dr. {record.doctor_name} ({record.department})</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Symptoms</p>
                        <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded">{record.symptoms || 'None recorded'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Diagnosis</p>
                        <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded font-medium">{record.diagnosis || 'None recorded'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Clinical Notes</p>
                        <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded whitespace-pre-wrap">{record.clinical_notes || 'None recorded'}</p>
                      </div>
                    </div>

                    {/* 🔥 NEW: DISPLAY PRESCRIBED MEDICINES IN HISTORY */}
                    {record.medicines && record.medicines.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-2 flex items-center gap-1">
                          <Pill size={14} className="text-green-600" /> Prescribed Medicines
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {record.medicines.map((med, mIdx) => {
                            // Build a quick schedule string (e.g., "Morn-Night")
                            const schedule = [];
                            if (med.morning) schedule.push('Morn');
                            if (med.afternoon) schedule.push('Aft');
                            if (med.evening) schedule.push('Eve');
                            if (med.night) schedule.push('Night');
                            const scheduleText = schedule.length > 0 ? schedule.join('-') : 'As needed';

                            return (
                              <div key={`hist-med-${med.medicine_id}-${mIdx}`} className="bg-green-50/50 p-3 rounded-lg border border-green-100 flex flex-col gap-1">
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-green-900 text-sm">{med.medicine_name}</span>
                                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                    {med.duration} Days
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 font-medium">
                                  {med.dose} {med.unit} | <span className="text-gray-500 capitalize">{med.food_timing?.replace('_', ' ')}</span> | {scheduleText}
                                </div>
                                {med.instructions && (
                                  <div className="text-xs text-gray-500 italic mt-1 border-t border-green-100 pt-1">
                                    "{med.instructions}"
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* DISPLAY PAST LAB RESULTS IN HISTORY */}
                    {record.lab_results && record.lab_results.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-2 flex items-center gap-1">
                          <FlaskConical size={14} className="text-blue-600" /> Associated Lab Results
                        </p>
                        <div className="flex flex-col gap-2">
                          {record.lab_results.map((lab, lIdx) => (
                            <div key={`hist-lab-${lab.request_id}-${lIdx}`} className="text-sm bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                              <div>
                                <span className="font-semibold text-blue-900">{lab.test_name}</span>
                                <span className="mx-2 text-gray-400">|</span>
                                <span className="text-gray-700">{lab.result || 'Pending / No findings'}</span>
                              </div>
                              {lab.status === 'completed' && (
                                <button
                                  onClick={() => downloadLabPDF(lab, record.doctor_name)}
                                  className="text-xs px-2 py-1 bg-white text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white rounded transition-colors font-bold flex items-center gap-1"
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
}