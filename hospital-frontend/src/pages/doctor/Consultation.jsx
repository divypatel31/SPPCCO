import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, StatusBadge, Modal } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Stethoscope, Plus, Trash2, FlaskConical, Pill, CheckCircle } from 'lucide-react';

const MEDICINES = ['Paracetamol 500mg', 'Amoxicillin 250mg', 'Ibuprofen 400mg', 'Metformin 500mg', 'Omeprazole 20mg', 'Cetirizine 10mg', 'Azithromycin 500mg', 'Dolo 650mg', 'Pantoprazole 40mg', 'Vitamin D3'];
const LAB_TESTS = ['CBC (Complete Blood Count)', 'Blood Sugar (Fasting)', 'Blood Sugar (PP)', 'LFT (Liver Function Test)', 'KFT (Kidney Function Test)', 'Lipid Profile', 'Thyroid Profile', 'Urine Analysis', 'X-Ray', 'ECG', 'Ultrasound Abdomen'];

export default function ConsultationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('consult');

  // Consultation form
  const [consult, setConsult] = useState({ symptoms: '', diagnosis: '', notes: '', follow_up: '' });

  // Prescriptions
  const [medicines, setMedicines] = useState([{ medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }]);

  // Lab Requests
  const [labRequests, setLabRequests] = useState([{ test: '', priority: 'normal', instructions: '' }]);

  // Modal for prescription
  const [showPrescModal, setShowPrescModal] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);

  useEffect(() => {
    api.get('/doctor/appointments')
      .then(res => {
        const found = (res.data || []).find(a => (a._id || a.id) === id);
        setAppt(found || null);
      })
      .catch(() => toast.error('Could not load appointment'))
      .finally(() => setLoading(false));
  }, [id]);

  const startConsultation = async () => {
    try {
      await api.put(`/doctor/start/${id}`);
      setAppt(prev => ({ ...prev, status: 'in_consultation' }));
      toast.success('Consultation started');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start');
    }
  };

  const saveMedicalRecord = async () => {
    setSaving(true);
    try {
      await api.post('/doctor/medical-record', {
        appointment_id: id,
        patient_id: appt?.patient_id,
        ...consult,
      });
      toast.success('Medical record saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const savePrescription = async () => {
    const valid = medicines.filter(m => m.medicine.trim());
    if (valid.length === 0) { toast.error('Add at least one medicine'); return; }
    setSaving(true);
    try {
      await api.post('/doctor/prescription', {
        appointment_id: id,
        patient_id: appt?.patient_id,
        medicines: valid,
      });
      toast.success('Prescription saved!');
      setShowPrescModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  const saveLabRequest = async () => {
    const valid = labRequests.filter(l => l.test.trim());
    if (valid.length === 0) { toast.error('Select at least one test'); return; }
    setSaving(true);
    try {
      for (const req of valid) {
        await api.post('/doctor/lab-request', {
          appointment_id: id,
          patient_id: appt?.patient_id,
          test_name: req.test,
          priority: req.priority,
          instructions: req.instructions,
        });
      }
      toast.success('Lab request submitted!');
      setShowLabModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit lab request');
    } finally {
      setSaving(false);
    }
  };

  const completeConsultation = async () => {
    if (!confirm('Mark consultation as complete? This cannot be undone.')) return;
    try {
      await api.put(`/doctor/complete/${id}`);
      toast.success('Consultation completed!');
      navigate('/doctor/appointments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete');
    }
  };

  const addMedicineRow = () => setMedicines([...medicines, { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const removeMedicineRow = (i) => setMedicines(medicines.filter((_, idx) => idx !== i));
  const updateMedicine = (i, field, val) => {
    const updated = [...medicines];
    updated[i][field] = val;
    setMedicines(updated);
  };

  const addLabRow = () => setLabRequests([...labRequests, { test: '', priority: 'normal', instructions: '' }]);

  if (loading) return <Spinner />;
  if (!appt) return (
    <div className="card text-center py-12">
      <p className="text-gray-500">Appointment not found.</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultation</h1>
          <p className="text-gray-500 text-sm mt-1">
            Patient: <strong>{appt.patient_name}</strong> · {formatDate(appt.appointment_date)} · {appt.start_time}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={appt.status} />
          {appt.status === 'arrived' && (
            <button onClick={startConsultation} className="btn-primary flex items-center gap-2">
              <Stethoscope size={16} /> Start Consultation
            </button>
          )}
          {appt.status === 'in_consultation' && (
            <button onClick={completeConsultation} className="btn-success flex items-center gap-2">
              <CheckCircle size={16} /> Complete
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'consult', label: 'Consultation' },
          { key: 'prescription', label: 'Prescription' },
          { key: 'lab', label: 'Lab Tests' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Consultation Tab */}
      {activeTab === 'consult' && (
        <div className="card max-w-2xl">
          <h2 className="font-semibold text-gray-900 mb-4">Medical Record</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Symptoms *</label>
              <textarea
                className="input-field h-24 resize-none"
                placeholder="Describe patient symptoms..."
                value={consult.symptoms}
                onChange={e => setConsult({ ...consult, symptoms: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Diagnosis *</label>
              <input className="input-field" placeholder="Enter diagnosis" value={consult.diagnosis} onChange={e => setConsult({ ...consult, diagnosis: e.target.value })} />
            </div>
            <div>
              <label className="label">Clinical Notes</label>
              <textarea
                className="input-field h-20 resize-none"
                placeholder="BP, vitals, observations..."
                value={consult.notes}
                onChange={e => setConsult({ ...consult, notes: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Follow-up Date</label>
              <input type="date" className="input-field" value={consult.follow_up} onChange={e => setConsult({ ...consult, follow_up: e.target.value })} />
            </div>
            <button onClick={saveMedicalRecord} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : null}
              Save Medical Record
            </button>
          </div>
        </div>
      )}

      {/* Prescription Tab */}
      {activeTab === 'prescription' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Prescription</h2>
            <button onClick={addMedicineRow} className="btn-secondary text-sm flex items-center gap-1">
              <Plus size={14} /> Add Medicine
            </button>
          </div>
          <div className="space-y-3">
            {medicines.map((med, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-start p-3 bg-gray-50 rounded-xl">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Medicine *</label>
                  <select className="input-field text-xs" value={med.medicine} onChange={e => updateMedicine(i, 'medicine', e.target.value)}>
                    <option value="">Select</option>
                    {MEDICINES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Dosage</label>
                  <input className="input-field text-xs" placeholder="500mg" value={med.dosage} onChange={e => updateMedicine(i, 'dosage', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Frequency</label>
                  <select className="input-field text-xs" value={med.frequency} onChange={e => updateMedicine(i, 'frequency', e.target.value)}>
                    <option value="">Select</option>
                    <option>Once daily</option>
                    <option>Twice daily</option>
                    <option>Thrice daily</option>
                    <option>As needed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duration</label>
                  <input className="input-field text-xs" placeholder="5 days" value={med.duration} onChange={e => updateMedicine(i, 'duration', e.target.value)} />
                </div>
                <div className="pt-5">
                  <button onClick={() => removeMedicineRow(i)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={savePrescription} disabled={saving} className="btn-primary mt-4 flex items-center gap-2">
            <Pill size={16} /> Generate Prescription
          </button>
        </div>
      )}

      {/* Lab Tests Tab */}
      {activeTab === 'lab' && (
        <div className="card max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Lab Test Requests</h2>
            <button onClick={addLabRow} className="btn-secondary text-sm flex items-center gap-1">
              <Plus size={14} /> Add Test
            </button>
          </div>
          <div className="space-y-3">
            {labRequests.map((req, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Test Name *</label>
                  <select
                    className="input-field text-sm"
                    value={req.test}
                    onChange={e => {
                      const updated = [...labRequests];
                      updated[i].test = e.target.value;
                      setLabRequests(updated);
                    }}
                  >
                    <option value="">Select test</option>
                    {LAB_TESTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                  <select
                    className="input-field text-sm"
                    value={req.priority}
                    onChange={e => {
                      const updated = [...labRequests];
                      updated[i].priority = e.target.value;
                      setLabRequests(updated);
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Instructions</label>
                  <input
                    className="input-field text-sm"
                    placeholder="Optional notes"
                    value={req.instructions}
                    onChange={e => {
                      const updated = [...labRequests];
                      updated[i].instructions = e.target.value;
                      setLabRequests(updated);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button onClick={saveLabRequest} disabled={saving} className="btn-primary mt-4 flex items-center gap-2">
            <FlaskConical size={16} /> Submit Lab Requests
          </button>
        </div>
      )}
    </div>
  );
}
