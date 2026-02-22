import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader, Modal } from '../../components/common';
import { formatDate, formatTime, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle } from 'lucide-react';

export default function BillingPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [billForm, setBillForm] = useState({ consultation_fee: '', lab_charges: '', medicine_charges: '', other_charges: '' });
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/receptionist/completed-appointments');
      setAppointments(res.data || []);
    } catch { toast.error('Failed to load completed appointments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const total = Object.values(billForm).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

  const handleGenerate = async () => {
    if (total <= 0) { toast.error('Total amount must be greater than 0'); return; }
    setGenerating(true);
    try {
      await api.post('/receptionist/generate-bill', {
        appointment_id: selected._id || selected.id,
        patient_id: selected.patient_id,
        consultation_fee: parseFloat(billForm.consultation_fee) || 0,
        lab_charges: parseFloat(billForm.lab_charges) || 0,
        medicine_charges: parseFloat(billForm.medicine_charges) || 0,
        other_charges: parseFloat(billForm.other_charges) || 0,
        total_amount: total,
      });
      toast.success('Bill generated successfully!');
      setSelected(null);
      setBillForm({ consultation_fee: '', lab_charges: '', medicine_charges: '', other_charges: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate bill');
    } finally {
      setGenerating(false);
    }
  };

  const markPaid = async (id) => {
    try {
      await api.put(`/receptionist/mark-paid/${id}`);
      toast.success('Bill marked as paid!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark paid');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Billing" subtitle="Generate and manage consultation bills" />

      {appointments.length === 0 ? (
        <div className="card">
          <EmptyState icon={CreditCard} title="No completed appointments" description="Completed appointments ready for billing will appear here" />
        </div>
      ) : (
        <div className="card p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Billing Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => (
                  <tr key={appt._id || appt.id}>
                    <td className="font-medium">{appt.patient_name || '—'}</td>
                    <td>Dr. {appt.doctor_name || '—'}</td>
                    <td>{formatDate(appt.appointment_date || appt.date)}</td>
                    <td>{formatTime(appt.start_time)}</td>
                    <td><StatusBadge status={appt.billing_status || 'not_generated'} /></td>
                    <td>
                      {(!appt.billing_status || appt.billing_status === 'not_generated') && (
                        <button
                          onClick={() => { setSelected(appt); setBillForm({ consultation_fee: '', lab_charges: '', medicine_charges: '', other_charges: '' }); }}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          Generate Bill
                        </button>
                      )}
                      {appt.billing_status === 'generated' && appt.payment_status !== 'paid' && (
                        <button
                          onClick={() => markPaid(appt._id || appt.id)}
                          className="btn-success text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <CheckCircle size={12} /> Mark Paid
                        </button>
                      )}
                      {appt.payment_status === 'paid' && <span className="text-green-600 text-xs font-medium">✓ Paid</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bill Generation Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Generate Bill" width="max-w-md">
        {selected && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-sm font-semibold">{selected.patient_name}</p>
              <p className="text-xs text-gray-500">Dr. {selected.doctor_name} · {formatDate(selected.appointment_date)}</p>
            </div>

            {[
              { key: 'consultation_fee', label: 'Consultation Fee' },
              { key: 'lab_charges', label: 'Lab Charges' },
              { key: 'medicine_charges', label: 'Medicine Charges' },
              { key: 'other_charges', label: 'Other Charges' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-sm text-gray-700 w-40">{label}</label>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field pl-7"
                    placeholder="0.00"
                    value={billForm[key]}
                    onChange={e => setBillForm({ ...billForm, [key]: e.target.value })}
                  />
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
              <span className="font-semibold text-gray-900">Total Amount</span>
              <span className="text-xl font-bold text-blue-700">{formatCurrency(total)}</span>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleGenerate} disabled={generating || total <= 0} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {generating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <CreditCard size={14} />}
                {generating ? 'Generating...' : 'Generate Bill'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
