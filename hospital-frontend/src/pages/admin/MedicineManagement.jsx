import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Package, Plus, Edit3, Beaker, Activity, Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animation Variants ---
const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

// --- Premium Modal Form Component ---
function MedicineForm({ open, onClose, onSubmit, title, form, setForm, saving }) {
  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'form') {
        if (value === 'Syrup' || value === 'Drops') { updated.dispense_type = 'PACK'; updated.unit = value === 'Syrup' ? 'ml' : 'drop'; updated.pack_size = value === 'Syrup' ? 100 : 10; } 
        else if (value === 'Tube') { updated.dispense_type = 'PACK'; updated.unit = 'g'; updated.pack_size = 20; } 
        else { updated.dispense_type = 'UNIT'; updated.unit = 'mg'; updated.pack_size = 1; }
      }
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", duration: 0.5, bounce: 0 }} className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{title}</h2>
        </div>
        
        <div className="p-6 sm:p-8 overflow-y-auto hide-scrollbar">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Medicine Nomenclature *</label>
                <input className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none" placeholder="e.g. Paracetamol 500mg" name="medicine_name" value={form.medicine_name} onChange={handleChange} required />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Category</label>
                <input className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none" placeholder="e.g. Analgesic" name="category" value={form.category} onChange={handleChange} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Expiry Date</label>
                <input type="date" className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none" name="expiry_date" value={form.expiry_date} onChange={handleChange} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Unit Price (₹) *</label>
                <input type="number" min="0" step="0.01" className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none" name="unit_price" value={form.unit_price} onChange={handleChange} required />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Stock Quantity *</label>
                <input type="number" min="0" className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none" name="stock" value={form.stock} onChange={handleChange} required />
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-6 mt-2">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-5 tracking-tight text-sm">
                <Beaker size={16} className="text-indigo-500" /> Dispensing Architecture
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Physical Form</label>
                  <select name="form" className="w-full border border-slate-200/60 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none appearance-none" value={form.form} onChange={handleChange}>
                    <option value="Tablet">Tablet / Pill</option><option value="Capsule">Capsule</option><option value="Syrup">Syrup / Liquid</option><option value="Drops">Drops</option><option value="Tube">Cream / Gel Tube</option><option value="Injection">Injection Vial</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Dispense Type</label>
                  <select name="dispense_type" className="w-full border border-slate-200/60 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none appearance-none" value={form.dispense_type} onChange={handleChange}>
                    <option value="UNIT">By Unit (e.g. 15 tablets)</option><option value="PACK">By Pack (e.g. 1 Bottle)</option>
                  </select>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-5 mt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">{form.dispense_type === 'PACK' ? 'Size of 1 Pack' : 'Dose Unit Size (Fixed)'}</label>
                    <input type="number" name="pack_size" required className={`w-full border border-slate-200/60 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none ${form.dispense_type === 'UNIT' ? 'bg-slate-100 cursor-not-allowed text-slate-400' : ''}`} placeholder={form.dispense_type === 'PACK' ? "e.g. 100" : "Fixed at 1"} value={form.pack_size} onChange={handleChange} readOnly={form.dispense_type === 'UNIT'} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Measurement Unit</label>
                    <select name="unit" className="w-full border border-slate-200/60 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 px-4 text-sm font-medium transition-all outline-none appearance-none" value={form.unit} onChange={handleChange}>
                      <option value="mg">mg</option><option value="g">g</option><option value="ml">ml</option><option value="drop">drops</option><option value="tablet">tablet</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {form.dispense_type === 'PACK' ? (
                <div className="bg-indigo-50/50 text-indigo-700 p-4 rounded-xl text-xs font-medium flex gap-3 items-start mt-6 border border-indigo-100/50"><Activity size={16} className="shrink-0 text-indigo-500" /><p><strong>PACK-based:</strong> Pharmacy dispenses in full packs (e.g. bottles) based on total prescribed.</p></div>
              ) : (
                <div className="bg-emerald-50/50 text-emerald-700 p-4 rounded-xl text-xs font-medium flex gap-3 items-start mt-6 border border-emerald-100/50"><Activity size={16} className="shrink-0 text-emerald-500" /><p><strong>UNIT-based:</strong> Pharmacy dispenses exact individual units (e.g. 15 tablets).</p></div>
              )}
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors w-full">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] transition-all w-full">{saving ? "Saving..." : title}</button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// --- Main Page Component ---
export default function MedicineManagement() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const emptyForm = { medicine_name: '', category: '', unit_price: '', stock: '', minimum_threshold: '10', expiry_date: '', form: 'Tablet', dispense_type: 'UNIT', pack_size: 1, unit: 'mg' };
  const [form, setForm] = useState(emptyForm);

  const fetchMedicines = async () => {
    try { 
      const res = await api.get('/pharmacy/medicine'); 
      setMedicines(res.data || []); 
    } 
    catch { toast.error('Failed to load medicines'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMedicines(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/pharmacy/medicine', form); toast.success('Medicine added successfully!'); setShowAdd(false); setForm(emptyForm); fetchMedicines(); } 
    catch (err) { toast.error(err.response?.data?.message || 'Failed to add medicine'); } 
    finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.put(`/pharmacy/medicine/${editItem.medicine_id}`, form); toast.success('Medicine updated successfully!'); setEditItem(null); setForm(emptyForm); fetchMedicines(); } 
    catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); } 
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this medicine from the inventory?")) return;
    try {
      await api.delete(`/pharmacy/medicine/${id}`);
      toast.success("Medicine deleted successfully!");
      fetchMedicines();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete medicine");
    }
  };

  // 1. Map days until expiry
  const processedMedicines = medicines.map(med => {
    const today = new Date(); const expiryDate = med.expiry_date ? new Date(med.expiry_date) : null;
    const diffDays = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
    return { ...med, diffDays };
  });

  // 2. Apply Filters (Status + Search)
  const filteredAndSearchedMedicines = processedMedicines.filter(med => {
    // Search Filter
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (med.category && med.category.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    // Status Filter
    if (filter === "expired") return med.diffDays < 0;
    if (filter === "alert") return med.diffDays >= 0 && med.diffDays <= 7;
    if (filter === "soon") return med.diffDays > 7 && med.diffDays <= 30;
    if (filter === "low") return med.stock <= (med.minimum_threshold || 10);
    return true;
  }).sort((a, b) => {
    if (a.diffDays === null) return 1; if (b.diffDays === null) return -1;
    return a.diffDays - b.diffDays;
  });

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans">
      
      {/* --- HEADER --- */}
      <motion.div variants={FADE_UP_SPRING} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <Package size={16} />
            <span className="text-sm font-medium tracking-tight">Inventory Control</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Medicine Master
          </h1>
        </div>
        <motion.button 
          whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} 
          onClick={() => { setShowAdd(true); setEditItem(null); setForm(emptyForm); }} 
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] hover:bg-slate-800 transition-colors"
        >
          <Plus size={16} /> Register Medicine
        </motion.button>
      </motion.div>

      {/* --- CONTROLS: SEARCH & TABS --- */}
      <motion.div variants={FADE_UP_SPRING} className="flex flex-col xl:flex-row justify-between gap-4 mb-6">
        
        {/* Search Bar */}
        <div className="relative w-full xl:max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]"
          />
        </div>

        {/* Animated Segmented Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 overflow-x-auto hide-scrollbar border border-slate-200/50 shadow-inner w-full xl:w-auto">
          {["all", "expired", "alert", "soon", "low"].map(type => {
            const isActive = filter === type;
            const label = type === "alert" ? "Expiring Alert" : type === "soon" ? "Expiring Soon" : type.charAt(0).toUpperCase() + type.slice(1);
            return (
              <button 
                key={type} onClick={() => setFilter(type)} 
                className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex-1 xl:flex-none ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                {isActive && <motion.div layoutId="medFilterTab" className="absolute inset-0 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/50" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>

      </motion.div>

      {/* --- TABLE / EMPTY STATE --- */}
      {medicines.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Package size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Inventory Empty</h3>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-sm">No medical supplies are currently registered in the system database.</p>
        </motion.div>
      ) : filteredAndSearchedMedicines.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <Search size={32} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">No results found</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">Try adjusting your search or filter criteria.</p>
        </motion.div>
      ) : (
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-5 pl-6">Nomenclature & Form</th>
                  <th className="p-5">Category</th>
                  <th className="p-5">Unit Price</th>
                  <th className="p-5">Stock Level</th>
                  <th className="p-5">Expiration</th>
                  <th className="p-5">Health Status</th>
                  <th className="p-5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredAndSearchedMedicines.map((med) => {
                    const isExpired = med.diffDays !== null && med.diffDays < 0;
                    const isExpiringAlert = med.diffDays !== null && med.diffDays >= 0 && med.diffDays <= 7;
                    const isExpiringSoon = med.diffDays !== null && med.diffDays > 7 && med.diffDays <= 30;
                    const isLow = med.stock <= (med.minimum_threshold || 10);

                    return (
                      <motion.tr 
                        key={med.medicine_id} 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                        className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group ${isExpired ? "bg-rose-50/30" : ""}`}
                      >
                        <td className="p-5 pl-6">
                          <div className="font-semibold text-slate-900 tracking-tight text-sm">{med.name}</div>
                          <div className="text-[10px] font-semibold text-slate-500 flex gap-2 items-center mt-1.5 uppercase tracking-wider">
                             <span className="bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded-md">{med.form || 'Tablet'}</span>
                             {med.dispense_type === 'PACK' && <span className="text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-1.5 py-0.5 rounded-md">{med.pack_size}{med.unit} Pack</span>}
                          </div>
                        </td>
                        <td className="p-5 text-sm font-medium text-slate-600">{med.category || '—'}</td>
                        <td className="p-5 text-sm font-semibold text-slate-900">{formatCurrency(med.price)}</td>
                        <td className="p-5">
                          <span className={`text-sm font-bold ${isLow ? "text-rose-600" : "text-slate-700"}`}>{med.stock}</span>
                        </td>
                        <td className="p-5 text-sm font-medium text-slate-600">
                          {med.expiry_date ? new Date(med.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                        </td>
                        <td className="p-5">
                          {isExpired ? <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md bg-rose-50 text-rose-700 border border-rose-200/60">Expired</span>
                          : isExpiringAlert ? <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md bg-rose-50 text-rose-700 border border-rose-200/60">Alert ({med.diffDays}d)</span>
                          : isExpiringSoon ? <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">Soon ({med.diffDays}d)</span>
                          : isLow ? <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md bg-orange-50 text-orange-700 border border-orange-200/60">Low Stock</span>
                          : <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">Optimal</span>}
                        </td>
                        <td className="p-5 pr-6">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { setEditItem(med); setShowAdd(true); setForm({ medicine_name: med.name || '', category: med.category || '', unit_price: med.price || '', stock: med.stock || '', minimum_threshold: med.minimum_threshold || '10', expiry_date: med.expiry_date ? med.expiry_date.split('T')[0] : '', form: med.form || 'Tablet', dispense_type: med.dispense_type || 'UNIT', pack_size: med.pack_size || 1, unit: med.unit || 'mg' }); }} 
                              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Configuration"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(med.medicine_id)} 
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Medicine"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Render the Form Modal via AnimatePresence condition inside the component */}
      <AnimatePresence>
        {showAdd && (
          <MedicineForm 
            open={showAdd} 
            onClose={() => { setShowAdd(false); setEditItem(null); setForm(emptyForm); }} 
            onSubmit={editItem ? handleUpdate : handleAdd} 
            title={editItem ? "Configure Medicine" : "Register Medicine"} 
            form={form} setForm={setForm} saving={saving} 
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
}