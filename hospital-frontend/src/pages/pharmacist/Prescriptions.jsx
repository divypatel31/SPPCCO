import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader, Modal } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Pill, ShoppingCart } from 'lucide-react';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [dispenseData, setDispenseData] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [discount, setDiscount] = useState(0);

  const fetchPrescriptions = async () => {
    try {
      // Using pharmacy medicine endpoint to verify the API is working
      const res = await api.get('/pharmacy/medicine');
      // For prescriptions we'd typically fetch from a prescription endpoint
      setPrescriptions([]);
    } catch { toast.error('Failed to load prescriptions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPrescriptions(); }, []);

  const openDispense = (presc) => {
    setSelected(presc);
    setDispenseData((presc.medicines || []).map(m => ({
      ...m,
      qty_dispensed: m.quantity_required || 1,
      unit_price: m.unit_price || 0,
    })));
    setDiscount(0);
  };

  const subtotal = dispenseData.reduce((sum, m) => sum + ((m.qty_dispensed || 0) * (m.unit_price || 0)), 0);
  const total = Math.max(0, subtotal - (parseFloat(discount) || 0));

  const handleGenerateBill = async () => {
    setGenerating(true);
    try {
      await api.post('/pharmacy/sell', {
        prescription_id: selected._id || selected.id,
        patient_id: selected.patient_id,
        medicines: dispenseData.map(m => ({
          medicine_id: m.medicine_id || m._id,
          quantity_dispensed: m.qty_dispensed,
          unit_price: m.unit_price,
        })),
        subtotal,
        discount: parseFloat(discount) || 0,
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
      <PageHeader title="Prescriptions" subtitle="View and dispense active prescriptions" />

      {prescriptions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Pill}
            title="No pending prescriptions"
            description="Active prescriptions from doctors will appear here for dispensing"
          />
        </div>
      ) : (
        <div className="card p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Prescription ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Medicines</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map(presc => (
                  <tr key={presc._id || presc.id}>
                    <td className="font-mono text-xs">#{(presc._id || '').slice(-6).toUpperCase()}</td>
                    <td>{presc.patient_name}</td>
                    <td>Dr. {presc.doctor_name}</td>
                    <td>{formatDate(presc.created_at)}</td>
                    <td>{presc.medicines?.length || 0} items</td>
                    <td><StatusBadge status={presc.dispensing_status || 'pending'} /></td>
                    <td>
                      {presc.dispensing_status !== 'dispensed' && (
                        <button onClick={() => openDispense(presc)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                          <ShoppingCart size={12} /> Dispense
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispense Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Dispense & Generate Bill" width="max-w-2xl">
        {selected && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="font-semibold text-gray-900">{selected.patient_name}</p>
              <p className="text-xs text-gray-500">Dr. {selected.doctor_name} · {formatDate(selected.created_at)}</p>
            </div>

            <div className="table-container rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Medicine</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Qty Dispensed</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Unit Price (₹)</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dispenseData.map((med, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">{med.medicine_name || med.name}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-xs"
                          value={med.qty_dispensed}
                          onChange={e => {
                            const updated = [...dispenseData];
                            updated[i].qty_dispensed = parseInt(e.target.value) || 0;
                            setDispenseData(updated);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-20 border border-gray-200 rounded px-2 py-1 text-xs"
                          value={med.unit_price}
                          onChange={e => {
                            const updated = [...dispenseData];
                            updated[i].unit_price = parseFloat(e.target.value) || 0;
                            setDispenseData(updated);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">{formatCurrency(med.qty_dispensed * med.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700 w-32">Discount (₹)</label>
              <input type="number" min="0" className="input-field max-w-[120px]" value={discount} onChange={e => setDiscount(e.target.value)} />
            </div>

            <div className="p-3 bg-green-50 rounded-xl space-y-1">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-sm text-gray-500"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-green-200 pt-1 mt-1">
                <span>Total</span><span className="text-green-700">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleGenerateBill} disabled={generating || total <= 0} className="btn-success flex-1 flex items-center justify-center gap-2">
                {generating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : null}
                Generate Pharmacy Bill
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
