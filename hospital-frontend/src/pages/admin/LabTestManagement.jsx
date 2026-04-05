import React, { useState, useEffect } from "react";
import { Spinner } from "../../components/common";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { FlaskConical, Plus, Trash2, Edit3, Search, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

const emptyForm = { name: "", department_id: "", price: "", description: "" };

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
function LabTestModal({ open, onClose, onSubmit, form, setForm, saving, editingTest, departments }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", duration: 0.5, bounce: 0 }} className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-medium text-slate-900 tracking-tight">
            {editingTest ? "Edit Diagnostic Test" : "Create Diagnostic Test"}
          </h2>
        </div>
        
        <div className="p-6 sm:p-8 overflow-y-auto hide-scrollbar">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Test Name *</label>
              <input className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-2.5 px-4 text-sm font-normal transition-all outline-none" placeholder="e.g. Complete Blood Count (CBC)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Department *</label>
                <select className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-2.5 px-4 text-sm font-normal transition-all outline-none appearance-none" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} required>
                  <option value="">Select Department...</option>
                  {departments.filter((d) => d.status === "active").map((d) => (
                    <option key={d.department_id} value={d.department_id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Price (₹) *</label>
                <input type="number" min="0" className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-2.5 px-4 text-sm font-normal transition-all outline-none" placeholder="e.g. 500" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Clinical Description</label>
              <textarea className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 px-4 text-sm font-normal transition-all outline-none h-24 resize-none" placeholder="Details or instructions for this lab test..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors w-full">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] transition-all w-full">
                {editingTest ? "Update Test" : "Deploy Test"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// --- Main Component ---
export default function LabTestManagement() {
  const [labTests, setLabTests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingTest, setEditingTest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      const [testsRes, deptRes] = await Promise.all([
        api.get("/admin/lab-tests"), 
        api.get("/admin/departments")
      ]);
      setLabTests(testsRes.data || []);
      setDepartments(deptRes.data || []);
    } catch { 
      toast.error("Failed to load data"); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAddModal = () => { setEditingTest(null); setForm(emptyForm); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    
    // 🔥 DUPLICATE CHECK LOGIC
    const normalizedInputName = form.name.trim().toLowerCase();
    
    if (!normalizedInputName) {
      return toast.error("Test name cannot be empty.");
    }

    const isDuplicate = labTests.some(test => {
      const isSameName = test.name.toLowerCase() === normalizedInputName;
      // If editing, ignore the current test's own name
      const isSameTest = editingTest && test.lab_test_id === editingTest.lab_test_id;
      return isSameName && !isSameTest;
    });

    if (isDuplicate) {
      return toast.error("A lab test with this name already exists!");
    }

    setSaving(true);
    try {
      if (editingTest) { 
        await api.put(`/admin/lab-tests/${editingTest.lab_test_id}`, form); 
        toast.success("Lab test updated"); 
      } else { 
        await api.post("/admin/lab-tests", form); 
        toast.success("Lab test created"); 
      }
      setShowModal(false); setForm(emptyForm); setEditingTest(null); fetchData();
    } catch { 
      toast.error("Operation failed"); 
    } finally { 
      setSaving(false); 
    }
  };

  const toggleStatus = async (id) => {
    try { 
      await api.patch(`/admin/lab-tests/${id}/toggle`); 
      toast.success("Status updated"); 
      fetchData(); 
    } catch { 
      toast.error("Failed to update status"); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this lab test?")) return;
    try { 
      await api.delete(`/admin/lab-tests/${id}`); 
      toast.success("Lab test deleted"); 
      fetchData(); 
    } catch (err) { 
      toast.error(err.response?.data?.message || "Failed to delete test"); 
    }
  };

  // Search Filter
  const filteredTests = labTests.filter(test => 
    test.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    test.department_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <FlaskConical size={16} />
            <span className="text-sm font-medium tracking-tight">Diagnostics Control</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Lab Test Master
          </h1>
        </div>
        <motion.button 
          whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} 
          onClick={openAddModal} 
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] hover:bg-slate-800 transition-colors"
        >
          <Plus size={16} /> Create Test
        </motion.button>
      </motion.div>

      {/* --- SEARCH BAR --- */}
      <motion.div variants={FADE_UP_SPRING} className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search tests by name or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-sm font-normal text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]"
          />
        </div>
      </motion.div>

      {/* --- GRID / EMPTY STATE --- */}
      {labTests.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <FlaskConical size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 tracking-tight">No Lab Tests Found</h3>
          <p className="text-sm text-slate-500 font-normal mt-1 max-w-sm">Initialize the system by adding your first diagnostic test to the database.</p>
        </motion.div>
      ) : filteredTests.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <Search size={32} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 tracking-tight">No results found</h3>
          <p className="text-sm text-slate-500 font-normal mt-1">No tests match your current search query.</p>
        </motion.div>
      ) : (
        <motion.div variants={STAGGER_CONTAINER} className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {filteredTests.map((test) => (
              <motion.div 
                key={test.lab_test_id} 
                variants={FADE_UP_SPRING} 
                layout 
                className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 hover:shadow-md transition-all group flex flex-col h-full relative overflow-hidden"
              >
                {/* Decorative Background Glow */}
                <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full filter blur-[40px] opacity-20 transition-opacity duration-500 group-hover:opacity-40 ${test.status === 'active' ? 'bg-indigo-400' : 'bg-slate-400'}`} />

                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="w-11 h-11 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <FlaskConical size={20} strokeWidth={2} />
                  </div>
                  
                  {/* Proper Green Check Status Badge */}
                  {test.status === 'active' ? (
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-medium uppercase tracking-widest">
                      <CheckCircle2 size={14} /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-500 border border-slate-200/60 text-[11px] font-medium uppercase tracking-widest">
                      <XCircle size={14} /> Inactive
                    </span>
                  )}
                </div>

                <div className="flex-1 relative z-10">
                  <h3 className="text-base font-semibold text-slate-900 tracking-tight">{test.name}</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-widest">{test.department_name}</p>
                  <p className="text-xl font-semibold text-slate-900 mt-3">₹{test.price}</p>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 relative z-10 opacity-60 group-hover:opacity-100 transition-opacity">
                  
                  {/* SaaS-Style Toggle Switch */}
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleStatus(test.lab_test_id)}>
                    <button
                      type="button"
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${test.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${test.status === 'active' ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                      Status
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingTest(test); setForm({ name: test.name, department_id: test.department_id, price: test.price, description: test.description || "" }); setShowModal(true); }} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Edit Configuration">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(test.lab_test_id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Test">
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
        {showModal && (
          <LabTestModal 
            open={showModal} 
            onClose={() => { setShowModal(false); setEditingTest(null); setForm(emptyForm); }} 
            onSubmit={handleSubmit} 
            form={form} 
            setForm={setForm} 
            saving={saving} 
            editingTest={editingTest}
            departments={departments}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
}