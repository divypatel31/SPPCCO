import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Pill, ChevronDown, ChevronUp, Info, CheckCircle, Clock } from 'lucide-react';

export default function MyPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/patient/prescriptions')
      .then(res => {
        setPrescriptions(res.data || []);
      })
      .catch(() => {
        toast.error("Failed to load prescriptions");
      })
      .finally(() => setLoading(false));
  }, []);

  // Helper to format the doctor's checkbox timings
  const formatTiming = (med) => {
    const times = [];
    if (med.morning) times.push('Morning');
    if (med.afternoon) times.push('Afternoon');
    if (med.evening) times.push('Evening');
    if (med.night) times.push('Night');
    
    let timeStr = times.length > 0 ? times.join(', ') : (med.frequency || 'As directed');
    
    if (med.food_timing) {
      const foodFormat = med.food_timing === 'before_food' ? 'Before Food' : 'After Food';
      timeStr += ` (${foodFormat})`;
    }
    return timeStr;
  };

  // 🔥 NEW LOGIC: Calculate exactly how many days are left on the medicine course
  const getDurationStatus = (createdAt, duration) => {
    if (!duration) return { status: 'none', text: '—' };
    
    // Normalize both dates to midnight to accurately count calendar days
    const start = new Date(createdAt);
    start.setHours(0, 0, 0, 0);
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const diffTime = now - start;
    const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const remaining = Number(duration) - daysPassed;
    
    if (remaining <= 0) {
      return { status: 'completed', text: 'Course Completed' };
    }
    
    return { status: 'active', text: `${remaining} Days Left`, total: duration };
  };

  if (loading) return <Spinner />;

  if (prescriptions.length === 0) {
    return (
      <div>
        <PageHeader title="My Prescriptions" subtitle="Prescriptions from your consultations" />
        <div className="card">
          <EmptyState icon={Pill} title="No prescriptions yet" description="Prescriptions will appear after your doctor visits" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Prescriptions" subtitle={`${prescriptions.length} prescriptions on file`} />
      <div className="space-y-4">
        {prescriptions.map((presc, idx) => (
          <div key={presc.prescription_id || idx} className="card hover:shadow-md transition-shadow">
            
            {/* Header / Collapsible trigger */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpanded(expanded === idx ? null : idx)}
            >
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  Prescription #{presc.prescription_id}
                </p>
                <p className="text-sm text-gray-600 mt-1 font-medium">
                  {formatDate(presc.created_at)} — Dr. {presc.doctor_name || 'Unknown'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status="active" />
                <div className="p-1 bg-gray-50 rounded-full">
                  {expanded === idx ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                </div>
              </div>
            </div>

            {/* Expanded Medicine Details */}
            {expanded === idx && presc.medicines && (
              <div className="mt-5 border-t border-gray-100 pt-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Prescribed Medicines</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500">
                        <th className="p-3 font-medium rounded-l-lg">Medicine Name</th>
                        <th className="p-3 font-medium">Dosage</th>
                        <th className="p-3 font-medium">Timing & Frequency</th>
                        <th className="p-3 font-medium">Progress</th>
                        <th className="p-3 font-medium rounded-r-lg">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {presc.medicines.map((med, mi) => {
                        const progress = getDurationStatus(presc.created_at, med.duration);
                        
                        return (
                          <tr key={mi} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-3 font-semibold text-gray-900">
                              {med.medicine_name}
                            </td>
                            <td className="p-3 text-gray-700 font-medium">
                              {med.dosage || '—'}
                            </td>
                            <td className="p-3 text-blue-700 font-medium">
                              {formatTiming(med)}
                            </td>
                            
                            {/* 🔥 NEW DYNAMIC PROGRESS UI */}
                            <td className="p-3">
                              {progress.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                                  <CheckCircle size={14} /> {progress.text}
                                </span>
                              ) : progress.status === 'active' ? (
                                <div className="flex flex-col">
                                  <span className="inline-flex items-center gap-1.5 text-blue-700 font-semibold text-sm">
                                    <Clock size={14} /> {progress.text}
                                  </span>
                                  <span className="text-gray-400 text-xs mt-0.5">Out of {progress.total} days</span>
                                </div>
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </td>

                            <td className="p-3 text-gray-500 italic">
                              {med.instructions || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Edge Case: No medicines attached */}
            {expanded === idx && (!presc.medicines || presc.medicines.length === 0) && (
              <div className="mt-4 border-t border-gray-100 pt-4 flex items-center gap-2 text-gray-500 text-sm">
                <Info size={16} />
                <p>No medicines were recorded for this prescription.</p>
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}