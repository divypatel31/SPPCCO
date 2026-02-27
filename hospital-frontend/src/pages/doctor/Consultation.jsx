import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pill, CheckCircle, FlaskConical } from 'lucide-react';

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
      food_timing: '' // before_food or after_food
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

  useEffect(() => {
    api.get('/test')
      .then(res => setLabTests(res.data || []))
      .catch(() => toast.error("Failed to load lab tests"));
  }, []);


  /* Complete Consultation */
  /* Complete Consultation */
  const completeConsultation = async () => {
    if (!window.confirm('Mark consultation as complete?')) return;

    setSaving(true);

    try {
      // Call correct backend route
      await api.put(`/doctor/complete/${id}`);

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

        const selectedTest = labTests.find(
          t => t.lab_test_id === Number(req.test)
        );

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
      console.log(err.response?.data);
      toast.error('Failed to submit lab request');
    } finally {
      setSaving(false);
    }
  };
  const addMedicineRow = () =>
    setMedicines([
      ...medicines,
      {
        medicine_id: '',
        dosage: '',
        duration: '',
        morning: false,
        afternoon: false,
        evening: false,
        food_timing: ''
      }
    ]);

  const removeMedicineRow = (i) =>
    setMedicines(medicines.filter((_, idx) => idx !== i));

  const updateMedicine = (i, field, val) => {
    const updated = [...medicines];
    updated[i][field] = val;
    setMedicines(updated);
  };

  const addLabRow = () =>
    setLabRequests([...labRequests, { test: '' }]);

  const updateLab = (i, val) => {
    const updated = [...labRequests];
    updated[i].test = val;
    setLabRequests(updated);
  };

  if (loading) return <Spinner />;
  if (!appt) return <div className="card text-center py-12">Appointment not found.</div>;

  const isCompleted = appt.status === 'completed';

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

          {/* Show START if patient arrived */}
          {appt.status === 'arrived' && (
            <button
              onClick={async () => {
                try {
                  await api.put(`/doctor/start/${id}`);
                  toast.success("Consultation started!");
                  window.location.reload();
                } catch (err) {
                  toast.error(err.response?.data?.message || "Failed to start");
                }
              }}
              className="btn-primary"
            >
              Start
            </button>
          )}

          {/* Show COMPLETE if consultation started */}
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
            className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-teal-600 text-white' : 'bg-gray-100'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONSULT TAB */}
      {activeTab === 'consult' && (
        <div className="card space-y-4">
          <textarea
            placeholder="Symptoms"
            className="input-field"
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

          {medicines.map((med, i) => (
            <div key={i} className="card space-y-4 border border-gray-200">

              {/* Top Row */}
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">
                  Medicine {i + 1}
                </h3>

                {!isCompleted && medicines.length > 1 && (
                  <button
                    onClick={() => removeMedicineRow(i)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* Medicine Select */}
              <select
                className="input-field"
                disabled={isCompleted}
                value={med.medicine_id}
                onChange={e => updateMedicine(i, 'medicine_id', e.target.value)}
              >
                <option value="">Select Medicine</option>
                {medicineList.map(m => (
                  <option key={m.medicine_id} value={m.medicine_id}>
                    {m.name}
                  </option>
                ))}
              </select>

              {/* Dosage & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Dosage (e.g. 500mg)"
                  className="input-field"
                  disabled={isCompleted}
                  value={med.dosage}
                  onChange={e => updateMedicine(i, 'dosage', e.target.value)}
                />

                <input
                  placeholder="Duration (e.g. 5 days)"
                  className="input-field"
                  disabled={isCompleted}
                  value={med.duration}
                  onChange={e => updateMedicine(i, 'duration', e.target.value)}
                />
              </div>

              {/* Timing Checkboxes */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Take at:
                </p>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={isCompleted}
                      checked={med.morning}
                      onChange={e => updateMedicine(i, 'morning', e.target.checked)}
                    />
                    Morning
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={isCompleted}
                      checked={med.afternoon}
                      onChange={e => updateMedicine(i, 'afternoon', e.target.checked)}
                    />
                    Afternoon
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={isCompleted}
                      checked={med.evening}
                      onChange={e => updateMedicine(i, 'evening', e.target.checked)}
                    />
                    Evening
                  </label>
                </div>
              </div>

              {/* Food Timing */}
              <select
                className="input-field"
                disabled={isCompleted}
                value={med.food_timing}
                onChange={e => updateMedicine(i, 'food_timing', e.target.value)}
              >
                <option value="">Food Timing</option>
                <option value="before_food">Before Food</option>
                <option value="after_food">After Food</option>
              </select>

            </div>
          ))}

          {/* Bottom Buttons */}
          {!isCompleted && (
            <div className="flex gap-3">
              <button
                onClick={addMedicineRow}
                className="btn-secondary flex items-center gap-2"
              >
                <Plus size={16} /> Add Medicine
              </button>

            </div>
          )}
        </div>
      )}

      {/* LAB TAB */}
      {activeTab === 'lab' && (
        <div className="card space-y-3">
          {labRequests.map((req, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <select
                className="input-field"
                disabled={isCompleted}
                value={req.test}
                onChange={e => updateLab(i, e.target.value)}
              >
                <option value="">Select Test</option>
                {labTests.map(test => (
                  <option key={test.lab_test_id} value={test.lab_test_id}>
                    {test.name} - ₹{test.price}
                  </option>
                ))}
              </select>

              {!isCompleted && (
                <button onClick={() => setLabRequests(labRequests.filter((_, idx) => idx !== i))}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <h3 className="font-semibold mt-6">Lab Results</h3>

          {appt.lab_results?.map(result => (
            <div key={result.request_id} className="card mt-2">
              <p><strong>Test:</strong> {result.test_name}</p>
              <p><strong>Status:</strong> {result.status}</p>
              {result.status === 'completed' && (
                <p><strong>Result:</strong> {result.result}</p>
              )}
            </div>
          ))}
          {!isCompleted && (
            <div className="flex gap-3 mt-3">
              <button
                onClick={addLabRow}
                className="btn-secondary flex items-center gap-2"
              >
                <Plus size={14} /> Add Test
              </button>

              <button
                onClick={saveLabRequest}
                className="btn-primary flex items-center gap-2"
              >
                <FlaskConical size={16} /> Send To Lab
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}