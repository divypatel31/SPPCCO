import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader, Modal } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Users, UserPlus } from 'lucide-react';

const ROLES = ['doctor', 'receptionist', 'lab', 'pharmacist', 'patient'];

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  role: '',
  department: '',
  password: ''
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [activeRole, setActiveRole] = useState('all');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch {
      toast.error("Failed to load staff users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/admin/departments');
        const activeDepartments = res.data.filter(d => d.status === 'active');
        setDepartments(activeDepartments);
      } catch (err) {
        toast.error("Failed to load departments");
      }
    };
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingUserId(null);
    setForm(emptyForm);
    setShowCreate(true);
  };

  const handleEdit = (user) => {
    setForm({
      name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      department: user.department || '',
      password: ''
    });
    setEditingUserId(user.user_id);
    setShowCreate(true);
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.put(`/admin/users/${id}/status`);
      toast.success("User status updated");
      fetchUsers();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // 🔥 NEW: Delete User Logic
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) return;

    try {
      const res = await api.delete(`/admin/users/${id}`);
      toast.success(res.data.message || "User deleted successfully");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete user");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.role) {
      toast.error('Please fill all required fields');
      return;
    }

    setCreating(true);

    try {
      if (editingUserId) {
        // UPDATE Existing User
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

        // Create New User
        await api.post('/auth/register', {
          name: form.name, 
          email: form.email,
          phone: form.phone,
          role: form.role,
          department: form.department,
          password: form.password
        });
        toast.success(`${form.role} account created!`);
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

  const filteredUsers =
    activeRole === 'all'
      ? users
      : users.filter(u => u.role === activeRole);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Create and manage staff accounts"
        action={
          activeRole !== 'patient' && (
            <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
              <UserPlus size={16} /> Create Staff Account
            </button>
          )
        }
      />

      {users.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="No staff accounts found"
            description="Create doctor, receptionist, lab technician, and pharmacist accounts"
          />
          <div className="text-center mt-4">
            <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2">
              <UserPlus size={16} /> Create First Staff Account
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-0">
          <div className="flex gap-2 mb-6 flex-wrap p-4 pb-0">
            {['all', ...ROLES].map(role => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition 
                  ${activeRole === role
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
              >
                {role === 'all'
                  ? `All Staff (${users.length})`
                  : `${role === 'lab'
                    ? 'Lab Technician'
                    : role.charAt(0).toUpperCase() + role.slice(1)
                  } (${users.filter(u => u.role === role).length})`}
              </button>
            ))}
          </div>
          
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.user_id}>
                    <td className="font-medium text-gray-900">{u.full_name}</td>
                    <td className="text-gray-500">{u.email}</td>
                    <td className="capitalize font-medium text-gray-700">{u.role}</td>
                    <td>{u.department || '—'}</td>
                    <td className="text-gray-500">{formatDate(u.created_at)}</td>
                    <td><StatusBadge status={u.status || 'active'} /></td>
                    <td>
                      {u.role !== 'admin' ? (
                        <div className="flex gap-3 items-center">
                          <button
                            onClick={() => handleEdit(u)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleToggleStatus(u.user_id)}
                            className="text-xs font-semibold text-amber-600 hover:text-amber-800 transition-colors"
                          >
                            {u.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                          <span className="text-gray-300">|</span>
                          
                          {/* 🔥 NEW: Delete Button */}
                          <button
                            onClick={() => handleDelete(u.user_id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs font-medium bg-gray-100 px-2 py-1 rounded">Super Admin</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setForm(emptyForm);
          setEditingUserId(null);
        }}
        title={editingUserId ? "Edit Staff Account" : "Create Staff Account"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Role *</label>
            <select
              className="input-field"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              required
              disabled={editingUserId} // role cannot change in edit
            >
              <option value="">Select role</option>
              {ROLES.map(r => (
                <option key={r} value={r}>
                  {r === 'lab' ? 'Lab Technician' : r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Full Name *</label>
            <input
              className="input-field"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              className="input-field"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              className="input-field"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          {['doctor', 'lab'].includes(form.role) && (
            <div>
              <label className="label">Department</label>
              <select
                className="input-field"
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
              >
                <option value="">Select department</option>
                {departments.map(d => (
                  <option key={d.department_id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!editingUserId && (
            <div>
              <label className="label">Temporary Password *</label>
              <input
                type="password"
                className="input-field"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary flex-1">
              {editingUserId ? "Update Account" : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}