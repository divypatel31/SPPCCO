import React, { useState, useEffect } from 'react';
import { Spinner, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Users, UserPlus, Edit3, Power, Trash2, ShieldCheck, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ROLES = ['doctor', 'receptionist', 'lab', 'pharmacist', 'patient'];

const emptyForm = { name: '', email: '', phone: '', role: '', department: '', password: '' };

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
function UserFormModal({ open, onClose, onSubmit, form, setForm, saving, editingUserId, departments }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", duration: 0.5, bounce: 0 }} className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-medium text-slate-900 tracking-tight">
            {editingUserId ? "Edit Staff Profile" : "Create Staff Account"}
          </h2>
        </div>
        
        <div className="p-6 sm:p-8 overflow-y-auto hide-scrollbar">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Role *</label>
                <select className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-2.5 px-4 text-sm font-normal transition-all outline-none appearance-none" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} required disabled={editingUserId}>
                  <option value="">Select identity...</option>
                  {/* 🔥 THE FIX: Filter out 'patient' so they can only create staff roles here */}
                  {ROLES.filter(r => r !== 'patient').map(r => (
                    <option key={r} value={r}>
                      {r === 'lab' ? 'Lab Technician' : r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {['doctor', 'lab'].includes(form.role) && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Department</label>
                  <select className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-2.5 px-4 text-sm font-normal transition-all outline-none appearance-none" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                    <option value="">Select allocation...</option>
                    {departments.map(d => <option key={d.department_id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Full Legal Name *</label>
              <input className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-2.5 px-4 text-sm font-normal transition-all outline-none" placeholder="e.g. Dr. Sarah Jenkins" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Official Email *</label>
                <input type="email" className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-2.5 px-4 text-sm font-normal transition-all outline-none" placeholder="name@hospital.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                <input className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-2.5 px-4 text-sm font-normal transition-all outline-none" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            {!editingUserId && (
              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">Temporary Password *</label>
                <input type="password" className="w-full border border-slate-200/60 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-2.5 px-4 text-sm font-normal transition-all outline-none" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>
            )}

            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors w-full">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] transition-all w-full">
                {editingUserId ? "Update Profile" : "Deploy Account"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// --- Main Page Component ---
export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [activeRole, setActiveRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    try { const res = await api.get('/admin/users'); setUsers(res.data); } 
    catch { toast.error("Failed to load staff users"); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/admin/departments');
        setDepartments(res.data.filter(d => d.status === 'active'));
      } catch (err) { toast.error("Failed to load departments"); }
    };
    fetchDepartments();
  }, []);

  const openCreateModal = () => { setEditingUserId(null); setForm(emptyForm); setShowCreate(true); };

  const handleEdit = (user) => {
    setForm({ name: user.full_name, email: user.email, phone: user.phone || '', role: user.role, department: user.department || '', password: '' });
    setEditingUserId(user.user_id);
    setShowCreate(true);
  };

  const handleToggleStatus = async (id) => {
    try { await api.put(`/admin/users/${id}/status`); toast.success("User status updated"); fetchUsers(); } 
    catch { toast.error("Failed to update status"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) return;
    try { const res = await api.delete(`/admin/users/${id}`); toast.success(res.data.message || "User deleted successfully"); fetchUsers(); } 
    catch (err) { toast.error(err.response?.data?.message || "Failed to delete user"); }
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role) return toast.error('Please fill all required fields');
    setCreating(true);

    try {
      if (editingUserId) {
        // Edit existing user
        await api.put(`/admin/users/${editingUserId}`, { 
          full_name: form.name, 
          email: form.email, 
          phone: form.phone, 
          department: form.department 
        });
        toast.success("User updated successfully");
      } else {
        if (!form.password) { 
          toast.error("Password required"); 
          setCreating(false); 
          return; 
        }
        
        // 🔥 CHANGED THIS LINE: Point to the new admin staff route!
        await api.post('/admin/staff', { 
          full_name: form.name, // Make sure this is full_name, not just name
          email: form.email, 
          phone: form.phone, 
          role: form.role, 
          department: form.department, 
          password: form.password 
        });
        toast.success(`${form.role} account created & credentials emailed!`);
      }
      setShowCreate(false); 
      setForm(emptyForm); 
      setEditingUserId(null); 
      fetchUsers();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Operation failed'); 
    } finally { 
      setCreating(false); 
    }
  };

  // Filter and Search Logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = activeRole === 'all' || u.role === activeRole;
    return matchesSearch && matchesRole;
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
            <Users size={16} />
            <span className="text-sm font-medium tracking-tight">Identity & Access</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            User Management
          </h1>
        </div>
        <motion.button 
          whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} 
          onClick={openCreateModal} 
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] hover:bg-slate-800 transition-colors"
        >
          <UserPlus size={16} /> Deploy Account
        </motion.button>
      </motion.div>

      {/* --- CONTROLS: SEARCH & TABS --- */}
      <motion.div variants={FADE_UP_SPRING} className="flex flex-col xl:flex-row justify-between gap-4 mb-6">
        
        {/* Search Bar */}
        <div className="relative w-full xl:max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search personnel by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-sm font-normal text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]"
          />
        </div>

        {/* Animated Segmented Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 overflow-x-auto hide-scrollbar border border-slate-200/50 shadow-inner w-full xl:w-auto">
          {['all', ...ROLES].map(role => {
            const isActive = activeRole === role;
            const count = role === 'all' ? users.length : users.filter(u => u.role === role).length;
            const label = role === 'all' ? 'All Staff' : role === 'lab' ? 'Lab Techs' : role.charAt(0).toUpperCase() + role.slice(1);
            
            return (
              <button 
                key={role} onClick={() => setActiveRole(role)} 
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 flex-1 xl:flex-none justify-center ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                {isActive && <motion.div layoutId="userTab" className="absolute inset-0 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/50" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />}
                <span className="relative z-10 flex items-center gap-1.5">
                  {label}
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/50 text-slate-400'}`}>
                    {count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

      </motion.div>

      {/* --- TABLE / EMPTY STATE --- */}
      {users.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 tracking-tight">System Empty</h3>
          <p className="text-sm text-slate-500 font-normal mt-1 max-w-sm">There are currently no staff accounts registered in the database.</p>
        </motion.div>
      ) : filteredUsers.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <Search size={32} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 tracking-tight">No personnel found</h3>
          <p className="text-sm text-slate-500 font-normal mt-1">Try adjusting your search query or role filter.</p>
        </motion.div>
      ) : (
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-medium">
                  <th className="p-4 pl-6">Personnel Profile</th>
                  <th className="p-4">Division</th>
                  <th className="p-4">Onboarded Date</th>
                  <th className="p-4">Health Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredUsers.map((u) => (
                    <motion.tr 
                      key={u.user_id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-600 font-medium text-sm shadow-sm">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm tracking-tight">{u.full_name}</p>
                            <p className="text-xs text-slate-500 font-normal mt-0.5">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="capitalize text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md tracking-wide">
                            {u.role === 'lab' ? 'Lab Tech' : u.role}
                          </span>
                          {u.department && <span className="text-xs text-slate-500 font-normal ml-1 flex items-center gap-1">• {u.department}</span>}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-normal text-slate-600">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="p-4">
                        {u.status === 'active' 
                          ? <span className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">Active</span>
                          : <span className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider rounded-md bg-slate-50 text-slate-600 border border-slate-200/60">Inactive</span>
                        }
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {u.role !== 'admin' ? (
                            <>
                              <button onClick={() => handleEdit(u)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Edit Profile">
                                <Edit3 size={16} />
                              </button>
                              <button onClick={() => handleToggleStatus(u.user_id)} className={`p-2 rounded-lg transition-colors ${u.status === 'active' ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`} title={u.status === 'active' ? 'Deactivate' : 'Activate'}>
                                <Power size={16} />
                              </button>
                              <button onClick={() => handleDelete(u.user_id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Remove Access">
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100/60 px-2 py-1 rounded-md uppercase tracking-wider">
                              <ShieldCheck size={14} /> Root Admin
                            </span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Render the Form Modal via AnimatePresence condition */}
      <AnimatePresence>
        {showCreate && (
          <UserFormModal 
            open={showCreate} 
            onClose={() => { setShowCreate(false); setForm(emptyForm); setEditingUserId(null); }} 
            onSubmit={handleSubmit} 
            form={form} 
            setForm={setForm} 
            saving={creating} 
            editingUserId={editingUserId}
            departments={departments}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
}