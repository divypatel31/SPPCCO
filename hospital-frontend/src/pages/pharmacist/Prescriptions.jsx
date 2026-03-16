import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader, Modal } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Pill, ShoppingCart, Trash2, Package } from 'lucide-react'; 

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

  // 🔥 THE SMART CALCULATION FUNCTION (Optimized for Tablets, Syrups, & Creams)
  const calculateDispensingQty = (med) => {
    const dose = Number(med.dose) || 1;
    const freq = Number(med.frequency) || 1;
    const days = Number(med.duration) || 1;
    const packSize = Number(med.pack_size) || 1; 

    // Total raw amount needed (e.g., total tablets, total ml, total mg)
    const totalRequired = dose * freq * days;
    const unit = (med.unit || '').toLowerCase();

    // 1️⃣ LIQUIDS & DROPS (Syrups, Suspensions, Eye Drops)
    if (unit === 'ml' || unit === 'drop') {
      // If pack size is defined (e.g. 100ml bottle), calculate how many bottles are needed
      if (packSize > 1) {
        return Math.ceil(totalRequired / packSize);
      }
      // Failsafe: If pack size is missing (1) but total is large (e.g. 75ml), assume 1 bottle covers it.
      // This prevents the system from billing 75 bottles by mistake!
      return totalRequired > 15 ? 1 : Math.ceil(totalRequired); 
    }

    // 2️⃣ CREAMS & OINTMENTS (Tubes)
    if (unit === 'tube') {
      return Math.ceil(dose); // Just return the number of tubes prescribed
    }

    // 3️⃣ TABLETS & CAPSULES (Pack Dispensing vs Loose Units)
    if (med.dispense_type === 'PACK') {
      return Math.ceil(totalRequired / packSize); // E.g., Need 15 tabs, Pack has 10 = 2 Packs
    }

    // Default for loose UNIT dispensing
    return Math.ceil(totalRequired); 
  };

  const openDispense = async (presc) => {
    try {
      setSelected(presc);
      const res = await api.get(`/pharmacy/prescriptions/${presc.prescription_id}`);
      
      const items = res.data.map(m => {
        const calculatedQty = calculateDispensingQty(m);
        
        return {
          ...m,
          qty_dispensed: calculatedQty, 
          unit_price: m.unit_price || 0,
        };
      });
      
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

  // Helper to determine the display name for the dispensing unit
  const getDisplayUnit = (med) => {
    const unit = (med.unit || '').toLowerCase();
    if (unit === 'ml' || unit === 'drop') return 'Bottle(s)';
    if (unit === 'tube') return 'Tube(s)';
    if (med.dispense_type === 'PACK') return 'Pack(s)';
    return (med.form || 'Unit') + '(s)';
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
        width="max-w-4xl" 
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
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Instructions</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qty to Dispense</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Price (₹)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dispenseData.map((med, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      
                      {/* Medicine Info */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900">{med.medicine_name || med.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-bold uppercase">{med.form || 'Tab'}</span>
                          {med.dispense_type === 'PACK' && (
                            <span className="text-[10px] text-purple-600 flex items-center gap-0.5">
                              <Package size={10} /> {med.pack_size}{med.unit}/pack
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] font-bold mt-1 ${med.stock < med.qty_dispensed ? 'text-red-500' : 'text-gray-400'}`}>
                          Stock: {med.stock || 0}
                        </p>
                      </td>

                      {/* Doctor's Orders Summary */}
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <p>{med.dose}{med.unit} × {med.frequency}/day</p>
                        <p>For {med.duration} days</p>
                      </td>

                      {/* Dispense Quantity Input */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={med.stock}
                            className={`w-20 border rounded-lg px-3 py-1.5 text-sm font-bold outline-none transition-all ${
                              med.stock < med.qty_dispensed ? 'border-red-400 focus:ring-red-500 text-red-600 bg-red-50' : 'border-gray-300 focus:ring-teal-500 text-gray-900'
                            }`}
                            value={med.qty_dispensed}
                            onChange={e => {
                              const updated = [...dispenseData];
                              updated[i].qty_dispensed = parseInt(e.target.value) || 0;
                              setDispenseData(updated);
                            }}
                          />
                          <span className="text-xs text-gray-500 font-medium">
                            {getDisplayUnit(med)}
                          </span>
                        </div>
                        {med.stock < med.qty_dispensed && (
                          <p className="text-[10px] text-red-500 mt-1 font-bold">Low Stock!</p>
                        )}
                      </td>

                      {/* Price */}
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

                      {/* Total Line Item */}
                      <td className="px-4 py-3 font-bold text-teal-700">
                        {formatCurrency((med.qty_dispensed || 0) * (med.unit_price || 0))}
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
                disabled={generating || total <= 0 || dispenseData.some(m => m.stock < m.qty_dispensed)}
                className="btn-success flex-1 flex items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50"
                title={dispenseData.some(m => m.stock < m.qty_dispensed) ? "Cannot bill. Insufficient stock." : ""}
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