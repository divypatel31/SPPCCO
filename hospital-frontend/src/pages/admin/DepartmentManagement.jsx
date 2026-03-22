import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Building2, Plus, Trash2, Edit3, Search, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const emptyForm = { name: '', description: '' };

// --- Animation Variants ---
const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

// --- Premium Modal Component ---
function DepartmentModal({ open, onClose, onSubmit, form, setForm, saving, editingDept }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", duration: 0.5, bounce: 0 }} className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-medium text-slate-900 tracking-tight">
            {editingDept ? "Edit Department" : "Create Department"}
          </h2>
        </div>
        
        <div className="p-6 sm:p-8 overflow-y-auto hide-scrollbar">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Department Name *</label>
              <input
                className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-2.5 px-4 text-sm font-normal transition-all outline-none"
                placeholder="e.g. Cardiology"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Description</label>
              <textarea
                className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 px-4 text-sm font-normal transition-all outline-none h-28 resize-none"
                placeholder="Describe the department's focus or location..."
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors w-full">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] transition-all w-full">
                {editingDept ? "Save Changes" : "Deploy Department"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// --- Main Page Component ---
export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      setDepartments(res.data || []);
    } catch (err) { 
      toast.error('Failed to load departments'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const openAddModal = () => { setEditingDept(null); setForm(emptyForm); setShowAdd(true); };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDept) {
        await api.put(`/admin/departments/${editingDept.department_id}`, form);
        toast.success("Department updated successfully!");
      } else {
        await api.post('/admin/departments', form);
        toast.success("Department created successfully!");
      }
      setShowAdd(false); setEditingDept(null); setForm(emptyForm); fetchDepartments();
    } catch { 
      toast.error("Operation failed"); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleToggleStatus = async (id) => {
    try { 
      await api.patch(`/admin/departments/${id}/toggle`); 
      toast.success("Status updated"); 
      fetchDepartments(); 
    } catch { 
      toast.error("Failed to update status"); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this department permanently? All associated unassigned staff may be affected.")) return;
    try { 
      await api.delete(`/admin/departments/${id}`); 
      toast.success("Department deleted"); 
      fetchDepartments(); 
    } catch (err) { 
      toast.error(err.response?.data?.message || "Failed to delete department"); 
    }
  };

  // Search Filter
  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (dept.description && dept.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            <Building2 size={16} />
            <span className="text-sm font-medium tracking-tight">Facility Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Department Control
          </h1>
        </div>
        <motion.button 
          whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} 
          onClick={openAddModal} 
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] hover:bg-slate-800 transition-colors"
        >
          <Plus size={16} /> Create Department
        </motion.button>
      </motion.div>

      {/* --- SEARCH BAR --- */}
      <motion.div variants={FADE_UP_SPRING} className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search departments by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-sm font-normal text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]"
          />
        </div>
      </motion.div>

      {/* --- GRID / EMPTY STATE --- */}
      {departments.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Building2 size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 tracking-tight">No Departments Found</h3>
          <p className="text-sm text-slate-500 font-normal mt-1 max-w-sm">Initialize the system by adding your first medical department to the database.</p>
        </motion.div>
      ) : filteredDepartments.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <Search size={32} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 tracking-tight">No results found</h3>
          <p className="text-sm text-slate-500 font-normal mt-1">No departments match your current search query.</p>
        </motion.div>
      ) : (
        <motion.div variants={STAGGER_CONTAINER} className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {filteredDepartments.map((dept) => (
              <motion.div 
                key={dept.department_id} 
                variants={FADE_UP_SPRING} 
                layout 
                className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 hover:shadow-md transition-all group flex flex-col h-full relative overflow-hidden"
              >
                {/* Decorative Background Glow */}
                <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full filter blur-[40px] opacity-20 transition-opacity duration-500 group-hover:opacity-40 ${dept.status === 'active' ? 'bg-blue-400' : 'bg-slate-400'}`} />

                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="w-11 h-11 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <Building2 size={20} strokeWidth={2} />
                  </div>
                  
                  {/* Proper Green Check Status Badge */}
                  {dept.status === 'active' ? (
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-medium uppercase tracking-widest">
                      <CheckCircle2 size={14} /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-500 border border-slate-200/60 text-[11px] font-medium uppercase tracking-widest">
                      <XCircle size={14} /> Inactive
                    </span>
                  )}
                </div>

                <div className="flex-1 relative z-10 mb-4">
                  <h3 className="text-base font-semibold text-slate-900 tracking-tight">{dept.name}</h3>
                  <p className="text-[13px] text-slate-500 mt-1.5 font-normal leading-relaxed line-clamp-2">
                    {dept.description || 'No description provided for this department.'}
                  </p>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 relative z-10 opacity-60 group-hover:opacity-100 transition-opacity">
                  
                  {/* SaaS-Style Toggle Switch */}
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleToggleStatus(dept.department_id)}>
                    <button
                      type="button"
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${dept.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${dept.status === 'active' ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                      Status
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingDept(dept); setForm({ name: dept.name, description: dept.description || '' }); setShowAdd(true); }} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Edit Department">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(dept.department_id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Department">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Render the Form Modal */}
      <AnimatePresence>
        {showAdd && (
          <DepartmentModal 
            open={showAdd} 
            onClose={() => { setShowAdd(false); setEditingDept(null); setForm(emptyForm); }} 
            onSubmit={handleAdd} 
            form={form} 
            setForm={setForm} 
            saving={saving} 
            editingDept={editingDept}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
}