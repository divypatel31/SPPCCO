import React, { useState, useEffect } from 'react';
import { PageHeader, Modal, EmptyState, Spinner } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
// 🔥 Added Trash2 here
import { Building2, Plus, Trash2 } from 'lucide-react';

const emptyForm = {
  name: '',
  description: ''
};

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/departments');

      // 🔥 Important: check backend response structure
      setDepartments(res.data || []);
    } catch (err) {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openAddModal = () => {
    setEditingDept(null);
    setForm(emptyForm);
    setShowAdd(true);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingDept) {
        await api.put(`/admin/departments/${editingDept.department_id}`, form);
        toast.success("Department updated successfully!");
      } else {
        await api.post('/admin/departments', form);
        toast.success("Department added successfully!");
      }

      setShowAdd(false);
      setEditingDept(null);
      setForm(emptyForm);
      fetchDepartments();

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

  // 🔥 NEW: handleDelete Function
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department? This cannot be undone.")) return;

    try {
      await api.delete(`/admin/departments/${id}`);
      toast.success("Department deleted successfully");
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete department");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader 
        title="Department Management"
        subtitle="Manage hospital departments"
        action={
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Department
          </button>
        }
      />

      {departments.length === 0 ? (
        <div className="card mt-4">
          <EmptyState
            icon={Building2}
            title="No departments found"
            description="Add your first hospital department"
          />
          <div className="text-center mt-4">
            <button onClick={openAddModal} className="btn-primary">
              Add Department
            </button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {departments.map((dept) => (
            <div key={dept.department_id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Building2 size={20} className="text-slate-600" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  dept.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {dept.status}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900">{dept.name}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {dept.description || 'No description'}
              </p>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <div className="flex gap-3">
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => {
                      setEditingDept(dept);
                      setForm({
                        name: dept.name,
                        description: dept.description || ''
                      });
                      setShowAdd(true);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className={`text-xs hover:underline ${
                      dept.status === "active"
                        ? "text-orange-600"
                        : "text-green-600"
                    }`}
                    onClick={() => handleToggleStatus(dept.department_id)}
                  >
                    {dept.status === "active" ? "Deactivate" : "Activate"}
                  </button>

                  {/* 🔥 NEW: Delete Button */}
                  <button
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 hover:underline"
                    onClick={() => handleDelete(dept.department_id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setEditingDept(null);
          setForm(emptyForm);
        }}
        title={editingDept ? "Edit Department" : "Add Department"}
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Department Name *</label>
            <input
              className="input-field"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field h-20 resize-none"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>

            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {editingDept ? "Update Department" : "Add Department"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}