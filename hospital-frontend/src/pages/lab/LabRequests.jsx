import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader, Modal } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FlaskConical, CheckCircle } from 'lucide-react';

export default function LabRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resultForm, setResultForm] = useState({ result: '', remarks: '', status: 'in_progress' });
  const [completing, setCompleting] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchRequests = async () => {
    try {
      const res = await api.get('/lab-request');
      setRequests(res.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.put(`/lab-request/${selected._id || selected.id}/complete`, resultForm);
      toast.success('Test completed and report uploaded!');
      setSelected(null);
      setResultForm({ result: '', remarks: '', status: 'in_progress' });
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete test');
    } finally {
      setCompleting(false);
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Lab Requests" subtitle="Manage and process lab test requests" />

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'pending', 'in_progress', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.replace(/_/g, ' ')} {f === 'all' && `(${requests.length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={FlaskConical} title="No requests found" description="No lab requests match the selected filter" />
        </div>
      ) : (
        <div className="card p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Priority</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr key={req._id || req.id}>
                    <td className="font-medium">{req.test_name || req.test}</td>
                    <td>{req.patient_name || '—'}</td>
                    <td>Dr. {req.doctor_name || '—'}</td>
                    <td>
                      {req.priority === 'urgent' ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">URGENT</span>
                      ) : (
                        <span className="text-xs text-gray-500">Normal</span>
                      )}
                    </td>
                    <td>{formatDate(req.created_at)}</td>
                    <td><StatusBadge status={req.status} /></td>
                    <td>
                      {req.status !== 'completed' && (
                        <button
                          onClick={() => { setSelected(req); setResultForm({ result: '', remarks: '', status: 'in_progress' }); }}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <FlaskConical size={12} /> Process
                        </button>
                      )}
                      {req.status === 'completed' && <span className="text-green-600 text-xs">✓ Done</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process Test Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Process Lab Test">
        {selected && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="font-semibold text-gray-900">{selected.test_name || selected.test}</p>
              <p className="text-xs text-gray-500">Patient: {selected.patient_name} · Dr. {selected.doctor_name}</p>
              {selected.priority === 'urgent' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">URGENT</span>}
            </div>

            <div>
              <label className="label">Update Status</label>
              <select className="input-field" value={resultForm.status} onChange={e => setResultForm({ ...resultForm, status: e.target.value })}>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="label">Test Results</label>
              <textarea
                className="input-field h-24 resize-none"
                placeholder="Enter test results (e.g., Hemoglobin: 12.5 g/dL, WBC: 7500/µL...)"
                value={resultForm.result}
                onChange={e => setResultForm({ ...resultForm, result: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Remarks / Observations</label>
              <textarea
                className="input-field h-16 resize-none"
                placeholder="Any abnormal findings or additional notes..."
                value={resultForm.remarks}
                onChange={e => setResultForm({ ...resultForm, remarks: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleComplete} disabled={completing} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {completing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <CheckCircle size={14} />}
                {resultForm.status === 'completed' ? 'Complete & Upload' : 'Save Progress'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
