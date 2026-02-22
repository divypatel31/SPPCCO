import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, PageHeader, Modal } from '../../components/common';
import { formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Package, Plus, Edit2 } from 'lucide-react';

/* =========================
   Medicine Form Component
========================= */
function MedicineForm({ open, onClose, onSubmit, title, form, setForm, saving }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">

          <div className="col-span-2">
            <label className="label">Medicine Name *</label>
            <input
              className="input-field"
              placeholder="e.g., Paracetamol 500mg"
              value={form.medicine_name}
              onChange={e => setForm({ ...form, medicine_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Category</label>
            <input
              className="input-field"
              placeholder="e.g., Analgesic"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Unit Price *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={form.unit_price}
              onChange={e => setForm({ ...form, unit_price: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Stock *</label>
            <input
              type="number"
              min="0"
              className="input-field"
              value={form.stock}
              onChange={e => setForm({ ...form, stock: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Minimum Threshold</label>
            <input
              type="number"
              min="0"
              className="input-field"
              value={form.minimum_threshold}
              onChange={e => setForm({ ...form, minimum_threshold: e.target.value })}
            />
          </div>

          <div className="col-span-2">
            <label className="label">Expiry Date</label>
            <input
              type="date"
              className="input-field"
              value={form.expiry_date}
              onChange={e => setForm({ ...form, expiry_date: e.target.value })}
            />
          </div>

        </div>

        <div className="flex gap-3">
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
    minimum_threshold: '',
    expiry_date: ''
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
      if (filter === "low") return med.stock <= 10;
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
          <div className="flex gap-3 mb-4">
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
                  <th>Name</th>
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
                  const isExpiringSoon =
                    diffDays !== null && diffDays > 7 && diffDays <= 30;

                  const isLow = med.stock <= 10;

                  return (
                    <tr
                      key={med.medicine_id}
                      className={isExpired ? "bg-red-50" : ""}
                    >
                      <td className="font-medium">
                        {med.name}
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
                              minimum_threshold: med.minimum_threshold || '',
                              expiry_date: med.expiry_date
                                ? med.expiry_date.split('T')[0]
                                : '',
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={14} />
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