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

  const openDispense = async (presc) => {
    try {
      setSelected(presc);

      const res = await api.get(
        `/pharmacy/prescriptions/${presc.prescription_id}`
      );

      const items = res.data.map(m => ({
        ...m,
        qty_dispensed: m.quantity_required,
        unit_price: m.unit_price || 0,
      }));


      setDispenseData(items);

    } catch (err) {
      console.error("Error loading medicines:", err);
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
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Prescriptions"
        subtitle="View and dispense active prescriptions"
      />

      {prescriptions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Pill}
            title="No pending prescriptions"
            description="Active prescriptions from doctors will appear here"
          />
        </div>
      ) : (
        <div className="card p-0">
          <div className="table-container">
            <table className="table">
              <thead>
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
                {prescriptions.map(presc => (
                  <tr key={presc.prescription_id}>
                    <td className="font-mono text-xs">
                      #{presc.prescription_id}
                    </td>

                    <td>{presc.patient_name}</td>

                    <td>Dr. {presc.doctor_name}</td>

                    <td>{formatDate(presc.created_at)}</td>

                    <td>{presc.medicines?.length || 0}</td>

                    <td>
                      <StatusBadge status={presc.dispensing_status || 'pending'} />
                    </td>

                    <td>
                      {presc.dispensing_status !== 'dispensed' && (
                        <button
                          onClick={() => openDispense(presc)}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                        >
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

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Dispense & Generate Bill"
        width="max-w-2xl"
      >
        {selected && (
          <div className="space-y-4">

            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="font-semibold">{selected.patient_name}</p>
              <p className="text-xs text-gray-500">
                Dr. {selected.doctor_name} · {formatDate(selected.created_at)}
              </p>
            </div>

            {/* Medicine Table */}
            <div className="table-container rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Medicine</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Qty</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Unit ₹</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dispenseData.map((med, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">
                        {med.medicine_name}
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          className="w-16 border rounded px-2 py-1 text-xs"
                          value={med.quantity_required}
                          onChange={e => {
                            const updated = [...dispenseData];
                            updated[i].quantity_required= parseInt(e.target.value) || 0;
                            setDispenseData(updated);
                          }}
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-20 border rounded px-2 py-1 text-xs"
                          value={med.unit_price}
                          onChange={e => {
                            const updated = [...dispenseData];
                            updated[i].unit_price = parseFloat(e.target.value) || 0;
                            setDispenseData(updated);
                          }}
                        />
                      </td>

                      <td className="px-3 py-2 font-medium">
                        {formatCurrency(med.quantity_required * med.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


            <div className="flex gap-3">
              <button
                onClick={() => setSelected(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>

              <button
                onClick={handleGenerateBill}
                disabled={generating || total <= 0}
                className="btn-success flex-1 flex items-center justify-center gap-2"
              >
                {generating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                Generate Pharmacy Bill
              </button>
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
}