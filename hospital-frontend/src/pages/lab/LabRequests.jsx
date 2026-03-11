import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader, Modal } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FlaskConical, CheckCircle, Search } from 'lucide-react';

export default function LabRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resultForm, setResultForm] = useState({ result: '', remarks: '', status: 'in_progress' });
  const [completing, setCompleting] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchRequests = async () => {
    try {
      const res = await api.get('/lab/requests');
      setRequests(res.data || []);
    } catch { toast.error('Failed to load lab data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleComplete = async () => {
    if (!resultForm.result.trim() && resultForm.status === 'completed') {
      return toast.error("Please enter test results before completing");
    }

    setCompleting(true);
    try {
      await api.put(`/lab/complete/${selected.request_id}`, {
        result: resultForm.result,
        status: resultForm.status
      });
      toast.success('Test status updated successfully!');
      setSelected(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update test');
    } finally {
      setCompleting(false);
    }
  };

  // 🔥 FIXED: Filter logic to treat 'requested' as 'pending'
  const filtered = filter === 'all' 
    ? requests 
    : requests.filter(r => {
        if (filter === 'pending') return r.status === 'pending' || r.status === 'requested';
        return r.status === filter;
      });

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Laboratory Queue" subtitle="Process medical tests and upload patient results" />

      {/* Filter Chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'in_progress', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
              filter === f ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {f === 'pending' ? 'To Do' : f.replace(/_/g, ' ')} 
            <span className="ml-2 opacity-60">
              {f === 'all' ? requests.length : requests.filter(r => f === 'pending' ? (r.status === 'pending' || r.status === 'requested') : r.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card py-12">
          <EmptyState icon={FlaskConical} title="Queue Clear" description="No lab requests found for this category." />
        </div>
      ) : (
        <div className="card p-0 shadow-sm overflow-hidden border border-gray-100 rounded-2xl">
          <div className="table-container">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th>Test Name</th>
                  <th>Patient Info</th>
                  <th>Requesting Doctor</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr key={req.request_id} className="hover:bg-gray-50 transition-colors">
                    <td className="font-bold text-gray-800">{req.test_name}</td>
                    <td>
                      <p className="font-medium text-gray-900">{req.patient_name}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(req.created_at)}</p>
                    </td>
                    <td className="text-sm font-medium">Dr. {req.doctor_name}</td>
                    <td>
                      {req.priority === 'urgent' ? (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-lg font-bold">URGENT</span>
                      ) : (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-bold">NORMAL</span>
                      )}
                    </td>
                    <td><StatusBadge status={req.status} /></td>
                    <td>
                      {req.status !== 'completed' ? (
                        <button
                          onClick={() => { 
                            setSelected(req); 
                            setResultForm({ result: req.result || '', status: req.status === 'requested' ? 'in_progress' : req.status }); 
                          }}
                          className="bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white p-2 rounded-lg transition-all"
                        >
                          <FlaskConical size={16} />
                        </button>
                      ) : (
                        <span className="text-green-600 font-bold text-xs flex items-center gap-1">
                          <CheckCircle size={14} /> Reported
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Result Entry */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Update Lab Findings">
        {selected && (
          <div className="space-y-4">
            <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
              <p className="font-bold text-teal-900">{selected.test_name}</p>
              <p className="text-xs text-teal-700 font-medium">Patient: {selected.patient_name} · #{selected.request_id}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Process Status</label>
              <select
                className="input-field"
                value={resultForm.status}
                onChange={e => setResultForm({ ...resultForm, status: e.target.value })}
              >
                <option value="requested">Awaiting Collection</option>
                <option value="in_progress">Testing In Progress</option>
                <option value="completed">Ready / Completed</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Result Details</label>
              <textarea
                className="input-field h-32 resize-none font-mono text-sm"
                placeholder="Enter clinical findings and metrics..."
                value={resultForm.result}
                onChange={e => setResultForm({ ...resultForm, result: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Close</button>
              <button 
                onClick={handleComplete} 
                disabled={completing} 
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {completing ? "Saving..." : "Upload Result"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}