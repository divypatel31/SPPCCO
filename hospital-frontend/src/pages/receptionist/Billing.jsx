import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader, Modal } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle, Calculator } from 'lucide-react';

export default function BillingPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  
  const [billForm, setBillForm] = useState({
    consultation_fee: 0,
    lab_charges: 0,
    medicine_charges: 0,
    other_charges: 0
  });
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/receptionist/completed-appointments');
      setAppointments(res.data || []);
    } catch { 
      toast.error('Failed to load completed appointments'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const total = 
    Number(billForm.consultation_fee) + 
    Number(billForm.lab_charges) + 
    Number(billForm.medicine_charges) + 
    Number(billForm.other_charges);

  const openGenerateModal = (appt) => {
    setSelected(appt);
    setBillForm({
      consultation_fee: Number(appt.consultation_fee) || 0,
      lab_charges: Number(appt.lab_charges) || 0,
      medicine_charges: Number(appt.medicine_charges) || 0,
      other_charges: 0 
    });
  };

  const handleGenerate = async () => {
    if (total <= 0) { toast.error('Total amount must be greater than 0'); return; }
    setGenerating(true);
    
    const appointmentId = selected.appointment_id || selected._id || selected.id;

    try {
      await api.post('/receptionist/generate-bill', {
        appointment_id: appointmentId,
        patient_id: selected.patient_id,
        consultation_fee: billForm.consultation_fee,
        lab_charges: billForm.lab_charges,
        medicine_charges: billForm.medicine_charges,
        other_charges: billForm.other_charges,
        total_amount: total,
      });
      toast.success('Master Bill generated successfully!');
      setSelected(null);
      fetchData(); // Refreshes the table so it immediately shows "Completed"
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate bill');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Master Billing" subtitle="Automatically aggregate charges and generate final invoices" />

      {appointments.length === 0 ? (
        <div className="card py-12">
          <EmptyState icon={CreditCard} title="No pending bills" description="Appointments ready for final billing will appear here." />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden shadow-sm border border-gray-100 rounded-2xl">
          <div className="table-container">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Auto-Calculated Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => {
                  const actualId = appt.appointment_id || appt._id || appt.id;
                  
                  const previewTotal = 
                    (Number(appt.consultation_fee) || 0) + 
                    (Number(appt.lab_charges) || 0) + 
                    (Number(appt.medicine_charges) || 0);

                  return (
                    <tr key={actualId} className="hover:bg-gray-50 transition-colors">
                      <td className="font-bold text-gray-900">{appt.patient_name || 'Unknown Patient'}</td>
                      <td className="font-medium text-gray-700">Dr. {appt.doctor_name || 'Unknown Doctor'}</td>
                      <td>
                        <p className="text-sm font-medium">{formatDate(appt.appointment_date)}</p>
                      </td>
                      <td className="font-bold text-blue-700">
                        {formatCurrency(previewTotal)}
                      </td>
                      <td>
                        <StatusBadge status={appt.billing_status || 'not_generated'} />
                      </td>
                      <td className="flex items-center gap-2">
                        {/* GENERATE BILL BUTTON */}
                        {(!appt.billing_status || appt.billing_status === 'not_generated') && (
                          <button
                            onClick={() => openGenerateModal(appt)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 font-bold transition-colors"
                          >
                            <Calculator size={14} /> Generate Master Bill
                          </button>
                        )}
                        
                        {/* COMPLETED STATE (Replaces the Mark Paid Button) */}
                        {appt.billing_status === 'generated' && (
                           <span className="text-gray-400 text-xs italic font-medium flex items-center gap-1">
                             <CheckCircle size={12} className="text-green-500" /> Completed
                           </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auto-Bill Generation Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Confirm Master Bill" width="max-w-md">
        {selected && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-blue-900">{selected.patient_name}</p>
                <p className="text-xs text-blue-700 font-medium">Dr. {selected.doctor_name} · {formatDate(selected.appointment_date)}</p>
              </div>
            </div>

            <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Auto-Fetched Charges</p>
              
              {[
                { key: 'consultation_fee', label: 'Consultation Fee' },
                { key: 'lab_charges', label: 'Laboratory Charges' },
                { key: 'medicine_charges', label: 'Pharmacy Charges' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-600">{label}</label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                    <input
                      type="number"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg pl-8 pr-3 py-1.5 text-sm font-bold outline-none cursor-not-allowed"
                      value={billForm[key]}
                      readOnly 
                    />
                  </div>
                </div>
              ))}
              
              <div className="border-t border-gray-100 pt-3 mt-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-600">Other / Misc Charges</label>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg pl-8 pr-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={billForm.other_charges}
                    onChange={e => setBillForm({ ...billForm, other_charges: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl">
              <span className="font-medium text-gray-300">Grand Total</span>
              <span className="text-2xl font-bold text-white">{formatCurrency(total)}</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1 py-2.5">Cancel</button>
              <button 
                onClick={handleGenerate} 
                disabled={generating || total <= 0} 
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 shadow-md"
              >
                {generating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <CheckCircle size={16} />}
                {generating ? 'Processing...' : 'Confirm & Generate'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}