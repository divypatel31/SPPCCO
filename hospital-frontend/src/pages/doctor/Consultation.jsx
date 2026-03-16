import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pill, CheckCircle, FlaskConical, Lock, Play, Clock } from 'lucide-react';

export default function ConsultationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('consult');
  const [medicineList, setMedicineList] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [saveStatus, setSaveStatus] = useState(''); // 🔥 Added for auto-save indicator

  const [consult, setConsult] = useState({
    symptoms: '',
    diagnosis: '',
    notes: '',
    follow_up: ''
  });

  const [medicines, setMedicines] = useState([
    {
      medicine_id: '',
      dose: '',
      unit: 'tablet',
      frequency: 0,
      duration: '',
      morning: false,
      afternoon: false,
      evening: false,
      night: false,
      food_timing: 'after_food',
      instructions: ''
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
        
        // 🔥 Pre-fill auto-saved notes
        if (res.data.medical_record) {
          setConsult({
            symptoms: res.data.medical_record.symptoms || '',
            diagnosis: res.data.medical_record.diagnosis || '',
            notes: res.data.medical_record.clinical_notes || '',
            follow_up: res.data.medical_record.follow_up_date || ''
          });
        }
        
        // 🔥 Pre-fill auto-saved medicines
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

  /* Fetch medicines */
  useEffect(() => {
    api.get('/pharmacy/medicine')
      .then(res => setMedicineList(res.data || []))
      .catch(err => {
        console.log(err.response?.data);
        toast.error('Failed to load medicines');
      });
  }, []);

  /* Fetch lab tests */
  useEffect(() => {
    api.get('/test')
      .then(res => setLabTests(res.data || []))
      .catch(() => toast.error("Failed to load lab tests"));
  }, []);

  /* 🔥 INVISIBLE AUTO-SAVE LOGIC (No Buttons!) */
  useEffect(() => {
    const hasNotes = consult.symptoms || consult.diagnosis || consult.notes;
    const validMedicines = medicines.filter(med => med.medicine_id !== '');

    // Skip if nothing is typed or if already completed
    if (!hasNotes && validMedicines.length === 0) return;
    if (appt?.status === 'completed') return;

    setSaveStatus('Saving...');

    const delayDebounceFn = setTimeout(async () => {
      try {
        // Save Clinical Notes
        if (hasNotes) {
          await api.post('/doctor/medical-record', {
            appointment_id: id,
            symptoms: consult.symptoms,
            diagnosis: consult.diagnosis,
            clinical_notes: consult.notes,
            follow_up_date: consult.follow_up || null
          });
        }

        // Save Prescriptions
        if (validMedicines.length > 0) {
          const formattedMedicines = validMedicines.map(med => ({
            ...med,
            morning: med.morning ? 1 : 0,
            afternoon: med.afternoon ? 1 : 0,
            evening: med.evening ? 1 : 0,
            night: med.night ? 1 : 0
          }));
          await api.post('/doctor/prescription', { 
            appointment_id: id, 
            medicines: formattedMedicines 
          });
        }

        setSaveStatus('Saved');
        setTimeout(() => setSaveStatus(''), 3000);
      } catch (err) {
        setSaveStatus('Failed to save');
      }
    }, 1500); // Waits 1.5 seconds after you stop typing

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
        morning: med.morning ? 1 : 0,
        afternoon: med.afternoon ? 1 : 0,
        evening: med.evening ? 1 : 0,
        night: med.night ? 1 : 0
      }));

      await api.put(`/doctor/complete/${id}`, {
        medicines: formattedMedicines,
        ...consult
      });

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
    if (valid.length === 0) {
      toast.error('Select at least one test');
      return;
    }

    setSaving(true);
    try {
      for (const req of valid) {
        const selectedTest = labTests.find(t => t.lab_test_id === Number(req.test));
        await api.post('/lab-request', {
          appointment_id: id,
          test_name: selectedTest.name,
          department: selectedTest.department,
          test_price: selectedTest.price // 🔥 FIXED THE LAB 500 ERROR
        });
      }
      toast.success('Lab request sent!');
      setLabRequests([{ test: '' }]);
    } catch (err) {
      toast.error('Failed to submit lab request');
    } finally {
      setSaving(false);
    }
  };

  const addMedicineRow = () =>
    setMedicines([...medicines, { 
      medicine_id: '', dose: '', unit: 'tablet', frequency: 0, duration: '', 
      morning: false, afternoon: false, evening: false, night: false, 
      food_timing: 'after_food', instructions: '' 
    }]);

  const removeMedicineRow = (i) => setMedicines(medicines.filter((_, idx) => idx !== i));

  const updateMedicine = (i, field, val) => {
    const updated = [...medicines];
    updated[i][field] = val;

    // 🔥 FIX 3.1: Auto-select unit when medicine is chosen
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
      const freq = (med.morning ? 1 : 0) + (med.afternoon ? 1 : 0) + (med.evening ? 1 : 0) + (med.night ? 1 : 0);
      updated[i].frequency = freq;
    }

    setMedicines(updated);
  };

  const addLabRow = () => setLabRequests([...labRequests, { test: '' }]);

  const updateLab = (i, val) => {
    const updated = [...labRequests];
    updated[i].test = val;
    setLabRequests(updated);
  };

  if (loading) return <Spinner />;
  if (!appt) return <div className="card text-center py-12">Appointment not found.</div>;

  const isCompleted = appt.status === 'completed';
  const isLocked = appt.status === 'arrived'; 

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

          {/* START CONSULTATION BUTTON */}
          {appt.status === 'arrived' && (
            <button
              onClick={async () => {
                try {
                  await api.put(`/doctor/start/${id}`);
                  toast.success("Consultation started!");
                  setAppt(prev => ({ ...prev, status: 'in_consultation' }));
                } catch (err) {
                  toast.error(err.response?.data?.message || "Failed to start");
                }
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Play size={16} /> Start
            </button>
          )}

          {/* COMPLETE CONSULTATION BUTTON */}
          {appt.status === 'in_consultation' && (
            <button
              onClick={completeConsultation}
              disabled={saving}
              className="btn-success flex items-center gap-2"
            >
              <CheckCircle size={16} />
              {saving ? 'Processing...' : 'Complete'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['consult', 'prescription', 'lab'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded capitalize font-medium transition-colors ${
              activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}

        {/* Auto-Save Indicator */}
        {!isCompleted && saveStatus && (
          <div className="ml-auto self-center text-xs font-bold text-gray-400">
            <span className={saveStatus === 'Failed to save' ? 'text-red-500' : 'text-blue-500'}>
              {saveStatus}
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative">
        {/* OVERLAY FOR LOCKED STATE */}
        {isLocked && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 text-center max-w-sm">
              <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={24} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Consultation Locked</h2>
              <p className="text-sm text-gray-500">Please click the <strong>Start</strong> button above to begin.</p>
            </div>
          </div>
        )}

        <div className={isLocked ? 'opacity-30 pointer-events-none select-none' : 'opacity-100 transition-opacity'}>

          {/* CONSULT TAB */}
          {activeTab === 'consult' && (
            <div className="card space-y-4">
              <textarea
                placeholder="Symptoms"
                className="input-field min-h-[100px]"
                disabled={isCompleted}
                value={consult.symptoms}
                onChange={e => setConsult({ ...consult, symptoms: e.target.value })}
              />
              <input
                placeholder="Diagnosis"
                className="input-field"
                disabled={isCompleted}
                value={consult.diagnosis}
                onChange={e => setConsult({ ...consult, diagnosis: e.target.value })}
              />
              <textarea
                placeholder="Additional Notes"
                className="input-field min-h-[80px]"
                disabled={isCompleted}
                value={consult.notes}
                onChange={e => setConsult({ ...consult, notes: e.target.value })}
              />
            </div>
          )}

          {/* PRESCRIPTION TAB */}
          {activeTab === 'prescription' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Pill className="text-blue-600" size={20} /> Prescribe Medicines
                </h3>
                <p className="text-xs text-gray-500 italic">* Leave empty if no medicine required.</p>
              </div>

              {medicines.map((med, i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
                  
                  {/* Top Row: Medicine, Dose, Unit, Days */}
                  <div className="grid grid-cols-12 gap-4 mb-4">
                    <div className="col-span-12 md:col-span-4">
                      <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Medicine</label>
                      <select 
                        className="input-field py-2"
                        disabled={isCompleted}
                        value={med.medicine_id}
                        onChange={e => updateMedicine(i, 'medicine_id', e.target.value)}
                      >
                        <option value="">Select Medicine...</option>
                        {medicineList.map(m => (
                          <option key={m.medicine_id} value={m.medicine_id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-4 md:col-span-2">
                      <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Dose</label>
                      <input 
                        type="number" 
                        step="0.5"
                        className="input-field py-2"
                        disabled={isCompleted}
                        value={med.dose} 
                        onChange={e => updateMedicine(i, 'dose', e.target.value)}
                        placeholder="e.g. 1"
                      />
                    </div>

                    <div className="col-span-4 md:col-span-2">
                      <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Unit</label>
                      <select 
                        className="input-field py-2"
                        disabled={isCompleted}
                        value={med.unit}
                        onChange={e => updateMedicine(i, 'unit', e.target.value)}
                      >
                        <option value="tablet">Tablet(s)</option>
                        <option value="ml">ml</option>
                        <option value="drop">Drop(s)</option>
                        <option value="mg">mg</option>
                        <option value="tube">Tube</option>
                      </select>
                    </div>

                    <div className="col-span-4 md:col-span-3">
                      <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Duration</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          className="input-field py-2"
                          disabled={isCompleted}
                          value={med.duration} 
                          onChange={e => updateMedicine(i, 'duration', e.target.value)}
                          placeholder="Days"
                        />
                        <span className="text-sm font-medium text-gray-500">Days</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Timings & Food */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    
                    {/* Checkboxes for Time of Day */}
                    <div>
                      <label className="text-xs text-gray-500 font-bold uppercase mb-2 flex items-center gap-1">
                        <Clock size={14} /> Schedule
                      </label>
                      <div className="flex flex-wrap gap-4">
                        {['morning', 'afternoon', 'evening', 'night'].map(time => (
                          <label key={time} className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                              disabled={isCompleted}
                              checked={med[time]}
                              onChange={e => updateMedicine(i, time, e.target.checked)}
                            />
                            <span className="text-sm font-medium text-gray-700 capitalize">{time}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Food Timing */}
                    <div>
                      <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Food Timing</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name={`food_${i}`} 
                            className="w-4 h-4 text-blue-600 cursor-pointer"
                            disabled={isCompleted}
                            checked={med.food_timing === 'before_food'}
                            onChange={() => updateMedicine(i, 'food_timing', 'before_food')}
                          />
                          <span className="text-sm font-medium text-gray-700">Before Food</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name={`food_${i}`} 
                            className="w-4 h-4 text-blue-600 cursor-pointer"
                            disabled={isCompleted}
                            checked={med.food_timing === 'after_food'}
                            onChange={() => updateMedicine(i, 'food_timing', 'after_food')}
                          />
                          <span className="text-sm font-medium text-gray-700">After Food</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Instructions & Remove */}
                  <div className="mt-4 flex gap-4 items-end">
                    <div className="flex-1">
                      <input 
                        type="text" 
                        className="input-field py-2 text-sm"
                        disabled={isCompleted}
                        value={med.instructions} 
                        onChange={e => updateMedicine(i, 'instructions', e.target.value)}
                        placeholder="Additional instructions (e.g. Take with warm water)..."
                      />
                    </div>
                    
                    {!isCompleted && medicines.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeMedicineRow(i)}
                        className="p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                        title="Remove Medicine"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!isCompleted && (
                <button 
                  type="button"
                  onClick={addMedicineRow}
                  className="w-full py-3 mt-2 border-2 border-dashed border-blue-200 text-blue-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                >
                  <Plus size={18} /> Add Another Medicine
                </button>
              )}
            </div>
          )}

          {/* LAB TAB */}
          {activeTab === 'lab' && (
            <div className="card space-y-3">
              {labRequests.map((req, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <select className="input-field" disabled={isCompleted} value={req.test} onChange={e => updateLab(i, e.target.value)}>
                    <option value="">Select Test</option>
                    {labTests.map(test => (
                      <option key={test.lab_test_id} value={test.lab_test_id}>{test.name} - ₹{test.price}</option>
                    ))}
                  </select>
                  {!isCompleted && (
                    <button onClick={() => setLabRequests(labRequests.filter((_, idx) => idx !== i))} className="text-red-500">
                      <Trash2 size={16} />
                    </button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {appt.lab_results.map(result => (
                    <div key={result.request_id} className="p-3 bg-gray-50 rounded-lg border mb-2 text-sm">
                      <p><strong>Test:</strong> {result.test_name}</p>
                      <p><strong>Status:</strong> {result.status}</p>
                      {result.status === 'completed' && <p className="text-teal-700 whitespace-pre-wrap"><strong>Result:</strong><br/>{result.result}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No lab results found for this appointment.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}