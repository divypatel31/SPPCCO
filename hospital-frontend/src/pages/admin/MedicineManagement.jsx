import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, PageHeader, Modal } from '../../components/common';
import { formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Package, Plus, Edit2, Beaker, Activity } from 'lucide-react';

/* =========================
   Medicine Form Component
========================= */
function MedicineForm({ open, onClose, onSubmit, title, form, setForm, saving }) {
  
  // Handle smart auto-selection when the "form" changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'form') {
        if (value === 'Syrup' || value === 'Drops') {
          updated.dispense_type = 'PACK';
          updated.unit = value === 'Syrup' ? 'ml' : 'drop';
          updated.pack_size = value === 'Syrup' ? 100 : 10; 
        } else if (value === 'Tube') {
          updated.dispense_type = 'PACK';
          updated.unit = 'g';
          updated.pack_size = 20; 
        } else {
          updated.dispense_type = 'UNIT';
          updated.unit = 'mg';
          updated.pack_size = 1;
        }
      }
      return updated;
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">

          <div className="col-span-2">
            <label className="label">Medicine Name *</label>
            <input
              className="input-field"
              placeholder="e.g., Paracetamol 500mg"
              name="medicine_name"
              value={form.medicine_name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="label">Category</label>
            <input
              className="input-field"
              placeholder="e.g., Analgesic"
              name="category"
              value={form.category}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="label">Expiry Date</label>
            <input
              type="date"
              className="input-field"
              name="expiry_date"
              value={form.expiry_date}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="label">Unit Price (₹) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              name="unit_price"
              value={form.unit_price}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="label">Stock *</label>
            <input
              type="number"
              min="0"
              className="input-field"
              name="stock"
              value={form.stock}
              onChange={handleChange}
              required
            />
          </div>

        </div>

        <hr className="my-2 border-gray-100" />
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
          <Beaker size={16} className="text-blue-500" /> Dispensing Setup
        </h3>

        <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Physical Form</label>
            <select 
              name="form"
              className="input-field"
              value={form.form}
              onChange={handleChange}
            >
              <option value="Tablet">Tablet / Pill</option>
              <option value="Capsule">Capsule</option>
              <option value="Syrup">Syrup / Liquid</option>
              <option value="Drops">Drops</option>
              <option value="Tube">Cream / Gel Tube</option>
              <option value="Injection">Injection Vial</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Dispense Type</label>
            <select 
              name="dispense_type"
              className="input-field"
              value={form.dispense_type}
              onChange={handleChange}
            >
              <option value="UNIT">By Unit (e.g., 15 tablets)</option>
              <option value="PACK">By Pack (e.g., 1 Bottle)</option>
            </select>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                {form.dispense_type === 'PACK' ? 'Size of 1 Pack' : 'Dose Unit Size (Fixed)'}
              </label>
              <input 
                type="number" 
                name="pack_size"
                required
                className={`input-field ${form.dispense_type === 'UNIT' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                placeholder={form.dispense_type === 'PACK' ? "e.g., 100" : "Fixed at 1"} 
                value={form.pack_size}
                onChange={handleChange}
                readOnly={form.dispense_type === 'UNIT'}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Measurement Unit</label>
              <select 
                name="unit"
                className="input-field"
                value={form.unit}
                onChange={handleChange}
              >
                <option value="mg">mg</option>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="drop">drops</option>
                <option value="tablet">tablet</option>
              </select>
            </div>
          </div>
        </div>

        {form.dispense_type === 'PACK' ? (
          <div className="bg-purple-50 text-purple-700 p-3 rounded-lg text-[11px] font-medium flex gap-2 items-start mt-2">
            <Activity size={14} className="mt-0.5 shrink-0" />
            <p>
              <strong>PACK-based:</strong> If a doctor prescribes 150{form.unit} total, and this pack contains {form.pack_size}{form.unit}, the pharmacy will be instructed to dispense <strong>{Math.ceil(150 / (form.pack_size || 1))} pack(s)</strong>.
            </p>
          </div>
        ) : (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-[11px] font-medium flex gap-2 items-start mt-2">
            <Activity size={14} className="mt-0.5 shrink-0" />
            <p>
              <strong>UNIT-based:</strong> The pharmacist will dispense the exact amount calculated (e.g., 15 tablets).
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? "Saving..." : title}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* =========================
   Main Component
========================= */

export default function MedicineManagement() {

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const emptyForm = {
    medicine_name: '',
    category: '',
    unit_price: '',
    stock: '',
    minimum_threshold: '10',
    expiry_date: '',
    form: 'Tablet',
    dispense_type: 'UNIT',
    pack_size: 1,
    unit: 'mg'
  };

  const [form, setForm] = useState(emptyForm);

  /* Fetch Medicines */
  const fetchMedicines = async () => {
    try {
      const res = await api.get('/pharmacy/medicine');
      setMedicines(res.data || []);
    } catch {
      toast.error('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  /* Add Medicine */
  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.post('/pharmacy/medicine', form);
      toast.success('Medicine added!');
      setShowAdd(false);
      setForm(emptyForm);
      fetchMedicines();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add medicine');
    } finally {
      setSaving(false);
    }
  };

  /* Update Medicine */
  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put(`/pharmacy/medicine/${editItem.medicine_id}`, form);
      toast.success('Medicine updated!');
      setEditItem(null);
      setForm(emptyForm);
      fetchMedicines();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const filteredMedicines = medicines
    .map(med => {
      const today = new Date();
      const expiryDate = med.expiry_date
        ? new Date(med.expiry_date)
        : null;

      const diffDays = expiryDate
        ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
        : null;

      return { ...med, diffDays };
    })
    .filter(med => {
      if (filter === "expired") return med.diffDays < 0;
      if (filter === "alert") return med.diffDays >= 0 && med.diffDays <= 7;
      if (filter === "soon")
        return med.diffDays > 7 && med.diffDays <= 30;
      if (filter === "low") return med.stock <= (med.minimum_threshold || 10);
      return true;
    })
    .sort((a, b) => {
      if (a.diffDays === null) return 1;
      if (b.diffDays === null) return -1;
      return a.diffDays - b.diffDays; // nearest expiry first
    });

  if (loading) return <Spinner />;

  return (
    <div>

      <PageHeader
        title="Medicine Master"
        subtitle="Manage medicine inventory and pricing"
        action={
          <button
            onClick={() => {
              setShowAdd(true);
              setEditItem(null);
              setForm(emptyForm);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Add Medicine
          </button>
        }
      />

      {medicines.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title="No medicines found"
            description="Add medicines to the inventory"
          />
        </div>
      ) : (

        <div className="card p-0">
          <div className="flex gap-3 mb-4 p-4 pb-0">
            {["all", "expired", "alert", "soon", "low"].map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 rounded-full text-sm ${filter === type
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
                  }`}
              >
                {type === "alert"
                  ? "Expiring Alert"
                  : type === "soon"
                    ? "Expiring Soon"
                    : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name & Form</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredMedicines.map(med => {

                  const today = new Date();
                  const expiryDate = med.expiry_date ? new Date(med.expiry_date) : null;

                  const diffDays = expiryDate
                    ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
                    : null;

                  const isExpired = diffDays !== null && diffDays < 0;
                  const isExpiringAlert = diffDays !== null && diffDays >= 0 && diffDays <= 7;
                  const isExpiringSoon = diffDays !== null && diffDays > 7 && diffDays <= 30;
                  const isLow = med.stock <= (med.minimum_threshold || 10);

                  return (
                    <tr
                      key={med.medicine_id}
                      className={isExpired ? "bg-red-50" : ""}
                    >
                      <td>
                        <div className="font-medium text-gray-900">{med.name}</div>
                        <div className="text-[10px] text-gray-500 flex gap-2 items-center mt-0.5">
                           <span className="bg-gray-100 px-1.5 py-0.5 rounded uppercase">{med.form || 'Tablet'}</span>
                           {med.dispense_type === 'PACK' && (
                             <span className="text-purple-600 font-semibold">{med.pack_size}{med.unit} Pack</span>
                           )}
                        </div>
                      </td>

                      <td>{med.category || '—'}</td>
                      <td>{formatCurrency(med.price)}</td>

                      <td className={isLow ? "text-red-600 font-semibold" : ""}>
                        {med.stock}
                      </td>

                      <td>
                        {med.expiry_date
                          ? new Date(med.expiry_date).toLocaleDateString()
                          : "—"}
                      </td>

                      <td>
                        {isExpired ? (
                          <span className="badge bg-red-100 text-red-700">
                            Expired
                          </span>
                        ) : isExpiringAlert ? (
                          <span className="badge bg-red-200 text-red-800">
                            Expiring Alert ({diffDays} days)
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="badge bg-orange-100 text-orange-700">
                            Expiring Soon ({diffDays} days)
                          </span>
                        ) : isLow ? (
                          <span className="badge bg-yellow-100 text-yellow-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="badge bg-green-100 text-green-700">
                            In Stock
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          onClick={() => {
                            setEditItem(med);
                            setShowAdd(false);
                            setForm({
                              medicine_name: med.name || '',
                              category: med.category || '',
                              unit_price: med.price || '',
                              stock: med.stock || '',
                              minimum_threshold: med.minimum_threshold || '10',
                              expiry_date: med.expiry_date
                                ? med.expiry_date.split('T')[0]
                                : '',
                              form: med.form || 'Tablet',
                              dispense_type: med.dispense_type || 'UNIT',
                              pack_size: med.pack_size || 1,
                              unit: med.unit || 'mg'
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Modal */}
      <MedicineForm
        open={showAdd || !!editItem}
        onClose={() => {
          setShowAdd(false);
          setEditItem(null);
          setForm(emptyForm);
        }}
        onSubmit={editItem ? handleUpdate : handleAdd}
        title={editItem ? "Update Medicine" : "Add Medicine"}
        form={form}
        setForm={setForm}
        saving={saving}
      />

    </div>
  );
}