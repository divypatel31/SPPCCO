import React, { useState, useEffect } from "react";
import { PageHeader, Modal, EmptyState, Spinner } from "../../components/common";
import api from "../../utils/api";
import toast from "react-hot-toast";
// 🔥 Added Trash2 here
import { FlaskConical, Plus, Trash2 } from "lucide-react";

const emptyForm = {
  name: "",
  department_id: "",
  price: "",
  description: ""
};

export default function LabTestManagement() {
  const [labTests, setLabTests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingTest, setEditingTest] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingTest(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingTest) {
        await api.put(`/admin/lab-tests/${editingTest.lab_test_id}`, form);
        toast.success("Lab test updated");
      } else {
        await api.post("/admin/lab-tests", form);
        toast.success("Lab test created");
      }

      setShowModal(false);
      setForm(emptyForm);
      setEditingTest(null);
      fetchData();
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

  // 🔥 NEW: handleDelete Function
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lab test? This cannot be undone.")) return;

    try {
      await api.delete(`/admin/lab-tests/${id}`);
      toast.success("Lab test deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete test");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Lab Test Master"
        subtitle="Manage available lab tests"
        action={
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Test
          </button>
        }
      />

      {labTests.length === 0 ? (
        <div className="card mt-4">
          <EmptyState
            icon={FlaskConical}
            title="No lab tests found"
            description="Add your first lab test"
          />
          <div className="text-center mt-4">
            <button onClick={openAddModal} className="btn-primary">
              Add Test
            </button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {labTests.map((test) => (
            <div key={test.lab_test_id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between mb-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <FlaskConical size={20} className="text-slate-600" />
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    test.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {test.status}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900">{test.name}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {test.department_name}
              </p>
              <p className="text-sm font-medium mt-2">₹{test.price}</p>

              <div className="flex justify-between mt-4 pt-3 border-t">
                <div className="flex gap-3">
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => {
                      setEditingTest(test);
                      setForm({
                        name: test.name,
                        department_id: test.department_id,
                        price: test.price,
                        description: test.description || ""
                      });
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className={`text-xs hover:underline ${
                      test.status === "active"
                        ? "text-orange-600"
                        : "text-green-600"
                    }`}
                    onClick={() => toggleStatus(test.lab_test_id)}
                  >
                    {test.status === "active" ? "Deactivate" : "Activate"}
                  </button>

                  {/* 🔥 NEW: Delete Button */}
                  <button
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 hover:underline"
                    onClick={() => handleDelete(test.lab_test_id)}
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
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTest(null);
          setForm(emptyForm);
        }}
        title={editingTest ? "Edit Lab Test" : "Add Lab Test"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Test Name *</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Department *</label>
            <select
              className="input-field"
              value={form.department_id}
              onChange={(e) =>
                setForm({ ...form, department_id: e.target.value })
              }
              required
            >
              <option value="">Select Department</option>
              {departments
                .filter((d) => d.status === "active")
                .map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="label">Price (₹) *</label>
            <input
              type="number"
              className="input-field"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field h-20 resize-none"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>

            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {editingTest ? "Update Test" : "Add Test"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}