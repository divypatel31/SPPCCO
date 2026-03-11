import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader, Modal } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Pill, ShoppingCart, Trash2 } from 'lucide-react'; // 🔥 Added Trash2 icon

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [dispenseData, setDispenseData] = useState([]);
  const [generating, setGenerating] = useState(false);

  const fetchPrescriptions = async () => {
    try {
      const res = await api.get('/pharmacy/prescriptions');
      setPrescriptions(res.data || []);
    } catch (err) {
      toast.error('Failed to load prescriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  // 🔥 NEW: Handle Cancelling an Old Prescription
  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this prescription? Use this only if the patient hasn't shown up to collect their medicines.")) return;
    
    try {
      await api.put(`/pharmacy/cancel/${id}`);
      toast.success("Prescription removed from queue.");
      fetchPrescriptions();
    } catch (err) {
      toast.error("Failed to cancel prescription");
    }
  };

  const openDispense = async (presc) => {
    try {
      setSelected(presc);
      const res = await api.get(`/pharmacy/prescriptions/${presc.prescription_id}`);
      
      const items = res.data.map(m => ({
        ...m,
        qty_dispensed: m.quantity_required,
        unit_price: m.unit_price || 0,
      }));
      
      setDispenseData(items);
    } catch (err) {
      console.error("Error loading medicines:", err);
      toast.error("Could not load medicines for this prescription");
    }
  };

  const total = dispenseData.reduce(
    (sum, m) => sum + ((m.qty_dispensed || 0) * (m.unit_price || 0)),
    0
  );

  const handleGenerateBill = async () => {
    if (!selected) return;

    setGenerating(true);
    try {
      await api.post('/pharmacy/sell', {
        prescription_id: selected.prescription_id,
        patient_id: selected.patient_id,
        medicines: dispenseData.map(m => ({
          medicine_id: m.medicine_id,
          quantity_dispensed: m.qty_dispensed,
          unit_price: m.unit_price,
        })),
        total_amount: total,
      });

      toast.success('Pharmacy bill generated!');
      setSelected(null);
      fetchPrescriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate bill');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Prescriptions Queue"
        subtitle="View and dispense active prescriptions"
      />

      {prescriptions.length === 0 ? (
        <div className="card py-12">
          <EmptyState
            icon={Pill}
            title="No pending prescriptions"
            description="Active prescriptions containing medicines will appear here."
          />
        </div>
      ) : (
        <div className="card p-0 shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th>ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map(presc => {
                  // 🔥 LOGIC: Check if prescription is older than 24 hours
                  const prescTime = new Date(presc.created_at).getTime();
                  const isOlderThan24Hours = (Date.now() - prescTime) > (24 * 60 * 60 * 1000);

                  return (
                    <tr key={presc.prescription_id} className="hover:bg-gray-50 transition-colors">
                      <td className="font-mono text-xs text-blue-600">
                        #{presc.prescription_id}
                      </td>
                      <td className="font-bold text-gray-900">{presc.patient_name}</td>
                      <td className="text-gray-600 font-medium">Dr. {presc.doctor_name}</td>
                      <td className="text-sm text-gray-500">{formatDate(presc.created_at)}</td>
                      
                      {/* Using the item_count we generated in the new SQL query */}
                      <td><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">{presc.item_count} Meds</span></td>
                      
                      <td>
                        <StatusBadge status={presc.dispensing_status || 'pending'} />
                      </td>

                      <td className="flex items-center gap-2">
                        {presc.dispensing_status !== 'dispensed' && (
                          <button
                            onClick={() => openDispense(presc)}
                            className="bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all font-bold"
                          >
                            <ShoppingCart size={14} /> Dispense
                          </button>
                        )}

                        {/* 🔥 NEW: Show Cancel Button ONLY if 24 hours have passed */}
                        {isOlderThan24Hours && presc.dispensing_status !== 'dispensed' && (
                          <button
                            onClick={() => handleCancel(presc.prescription_id)}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-1.5 rounded-lg transition-all"
                            title="Cancel: Patient did not show up"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DISPENSE MODAL */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Dispense Medicines & Bill"
        width="max-w-3xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-bold text-teal-900 text-lg">{selected.patient_name}</p>
                <p className="text-sm text-teal-700 font-medium">
                  Dr. {selected.doctor_name} · {formatDate(selected.created_at)}
                </p>
              </div>
              <span className="bg-white px-3 py-1 rounded-lg text-teal-800 font-mono text-sm shadow-sm border border-teal-100">
                #{selected.prescription_id}
              </span>
            </div>

            <div className="table-container rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Medicine</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qty Required</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Price (₹)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dispenseData.map((med, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-800">
                        {med.medicine_name}
                        <p className="text-[10px] text-gray-400 font-normal mt-0.5">Current Stock: {med.stock}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max={med.stock}
                          className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
                          value={med.quantity_required}
                          onChange={e => {
                            const updated = [...dispenseData];
                            updated[i].quantity_required = parseInt(e.target.value) || 0;
                            setDispenseData(updated);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-gray-50"
                          value={med.unit_price}
                          readOnly
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-teal-700">
                        {formatCurrency((med.quantity_required || 0) * (med.unit_price || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
              <span className="text-gray-600 font-medium">Grand Total</span>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelected(null)}
                className="btn-secondary flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateBill}
                disabled={generating || total <= 0}
                className="btn-success flex-1 flex items-center justify-center gap-2 py-2.5 text-sm"
              >
                {generating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>Generate Final Bill</>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}