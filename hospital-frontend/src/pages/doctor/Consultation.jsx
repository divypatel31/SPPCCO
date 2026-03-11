import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pill, CheckCircle, FlaskConical, Lock, Play } from 'lucide-react';

export default function ConsultationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('consult');
  const [medicineList, setMedicineList] = useState([]);
  const [labTests, setLabTests] = useState([]);

  const [consult, setConsult] = useState({
    symptoms: '',
    diagnosis: '',
    notes: '',
    follow_up: ''
  });

  const [medicines, setMedicines] = useState([
    {
      medicine_id: '',
      dosage: '',
      duration: '',
      morning: false,
      afternoon: false,
      evening: false,
      night: false,
      food_timing: '' 
    }
  ]);

  const [labRequests, setLabRequests] = useState([
    { test: '' }
  ]);

  /* Fetch appointment */
  useEffect(() => {
    api.get(`/doctor/appointments/${id}`)
      .then(res => setAppt(res.data))
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

  /* 🔥 UPDATED: Complete Consultation (Allows empty medicine submission) */
  const completeConsultation = async () => {
    if (!window.confirm('Mark consultation as complete?')) return;

    setSaving(true);
    try {
      // Filter out rows where no medicine was selected
      const finalMedicines = medicines.filter(med => med.medicine_id !== '');

      await api.put(`/doctor/complete/${id}`, {
        medicines: finalMedicines // Sends empty array if no medicines selected
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
          test_price: selectedTest.price
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
    setMedicines([...medicines, { medicine_id: '', dosage: '', duration: '', morning: false, afternoon: false, evening: false, night: false, food_timing: '' }]);

  const removeMedicineRow = (i) => setMedicines(medicines.filter((_, idx) => idx !== i));

  const updateMedicine = (i, field, val) => {
    const updated = [...medicines];
    updated[i][field] = val;
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
  const isLocked = appt.status === 'arrived'; // Lock if patient hasn't been "started"

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
            className={`px-4 py-2 rounded capitalize ${activeTab === tab ? 'bg-teal-600 text-white' : 'bg-gray-100'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="relative">
        {/* 🔥 OVERLAY FOR LOCKED STATE */}
        {isLocked && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 text-center max-w-sm">
              <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={24} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Consultation Locked</h2>
              <p className="text-sm text-gray-500">Please click the <strong>Start</strong> button above to begin.</p>
            </div>
          </div>
        )}

        {/* Content dimming and pointer blocking when locked */}
        <div className={isLocked ? 'opacity-30 pointer-events-none select-none' : 'opacity-100'}>

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
            </div>
          )}

          {/* PRESCRIPTION TAB */}
          {activeTab === 'prescription' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 italic">* Prescription is optional. Leave empty if not required.</p>
              {medicines.map((med, i) => (
                <div key={i} className="card space-y-4 border border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">Medicine {i + 1}</h3>
                    {!isCompleted && medicines.length > 1 && (
                      <button onClick={() => removeMedicineRow(i)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <select
                    className="input-field"
                    disabled={isCompleted}
                    value={med.medicine_id}
                    onChange={e => updateMedicine(i, 'medicine_id', e.target.value)}
                  >
                    <option value="">Select Medicine</option>
                    {medicineList.map(m => (
                      <option key={m.medicine_id} value={m.medicine_id}>{m.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Dosage" className="input-field" disabled={isCompleted} value={med.dosage} onChange={e => updateMedicine(i, 'dosage', e.target.value)} />
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" className="input-field" disabled={isCompleted} value={med.duration} onChange={e => updateMedicine(i, "duration", e.target.value)} />
                      <span>Days</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {['morning', 'afternoon', 'evening', 'night'].map(time => (
                      <label key={time} className="flex items-center gap-2 text-sm capitalize">
                        <input type="checkbox" disabled={isCompleted} checked={med[time]} onChange={e => updateMedicine(i, time, e.target.checked)} />
                        {time}
                      </label>
                    ))}
                  </div>
                  <select className="input-field" disabled={isCompleted} value={med.food_timing} onChange={e => updateMedicine(i, 'food_timing', e.target.value)}>
                    <option value="">Select Timing</option>
                    <option value="before_food">Before Food</option>
                    <option value="after_food">After Food</option>
                  </select>
                </div>
              ))}
              {!isCompleted && (
                <button onClick={addMedicineRow} className="btn-secondary flex items-center gap-2">
                  <Plus size={16} /> Add Another Medicine
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
                    <button onClick={saveLabRequest} className="btn-primary flex items-center gap-2 py-1 text-sm"><FlaskConical size={14} /> Send To Lab</button>
                  </>
                )}
              </div>

              <h3 className="font-semibold mt-8 border-t pt-4">Previous Lab Results</h3>
              {appt.lab_results?.length > 0 ? (
                appt.lab_results.map(result => (
                  <div key={result.request_id} className="p-3 bg-gray-50 rounded-lg border mb-2 text-sm">
                    <p><strong>Test:</strong> {result.test_name}</p>
                    <p><strong>Status:</strong> {result.status}</p>
                    {result.status === 'completed' && <p className="text-teal-700"><strong>Result:</strong> {result.result}</p>}
                  </div>
                ))
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