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

  // 🔥 Calculate exactly how many days are left on the medicine course
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
    <div className="pb-12">
      <PageHeader title="My Prescriptions" subtitle={`${prescriptions.length} prescriptions on file`} />
      
      <div className="space-y-4 max-w-5xl mx-auto">
        {prescriptions.map((presc, idx) => (
          <div key={presc.prescription_id || idx} className="card hover:shadow-md transition-shadow p-5">
            
            {/* Header / Collapsible trigger */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpanded(expanded === idx ? null : idx)}
            >
              <div>
                <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Pill className="text-blue-500" size={20} />
                  Prescription #{presc.prescription_id}
                </p>
                <p className="text-sm text-gray-600 mt-1 font-medium ml-7">
                  {formatDate(presc.created_at)} — Dr. {presc.doctor_name || 'Unknown'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status="active" />
                <div className="p-1.5 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                  {expanded === idx ? <ChevronUp size={20} className="text-gray-600" /> : <ChevronDown size={20} className="text-gray-600" />}
                </div>
              </div>
            </div>

            {/* Expanded Medicine Details - Card Layout */}
            {expanded === idx && presc.medicines && presc.medicines.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-5">
                <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider ml-1">
                  Prescribed Medicines
                </h4>
                
                <div className="space-y-4">
                  {presc.medicines.map((med, mi) => {
                    const progress = getDurationStatus(presc.created_at, med.duration);
                    
                    return (
                      <div key={mi} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-blue-200 transition-colors">
                        
                        {/* Top Header: Name & Progress */}
                        <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{med.medicine_name || med.name}</h3>
                            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              {med.form || 'Medicine'}
                            </span>
                          </div>
                          
                          {/* Progress Badge */}
                          <div className="text-right">
                            {progress.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold border border-green-200">
                                <CheckCircle size={14} /> {progress.text}
                              </span>
                            ) : progress.status === 'active' ? (
                              <div className="flex flex-col items-end bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                <span className="inline-flex items-center gap-1.5 text-blue-700 font-bold text-sm">
                                  <Clock size={14} /> {progress.text}
                                </span>
                                <span className="text-blue-500/80 text-[10px] font-bold uppercase mt-0.5">Duration: {progress.total} days</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </div>
                        </div>

                        {/* Middle Section: Instructions */}
                        <div className="bg-gray-50/60 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                          
                          {/* How much to take */}
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Dosage Amount</p>
                            <p className="text-gray-900 font-medium text-lg">
                              Take <span className="font-bold text-blue-700">{med.dose || 1} {med.unit || 'tablet'}</span>
                            </p>
                            <p className="text-sm text-gray-600 mt-0.5">({med.frequency || 1} times a day)</p>
                          </div>

                          {/* When to take it */}
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-2">Schedule</p>
                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                              <span className={`px-2 py-1 rounded-md ${med.morning ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-gray-100 text-gray-400 line-through opacity-70"}`}>Morning</span>
                              <span className={`px-2 py-1 rounded-md ${med.afternoon ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-gray-100 text-gray-400 line-through opacity-70"}`}>Afternoon</span>
                              <span className={`px-2 py-1 rounded-md ${med.evening ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-gray-100 text-gray-400 line-through opacity-70"}`}>Evening</span>
                              <span className={`px-2 py-1 rounded-md ${med.night ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-gray-100 text-gray-400 line-through opacity-70"}`}>Night</span>
                            </div>
                          </div>
                          
                          {/* Bottom Row: Food & Notes */}
                          <div className="md:col-span-2 pt-3 mt-1 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
                            {med.food_timing && (
                              <span className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg border shadow-sm shrink-0 ${
                                med.food_timing === 'before_food' 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {med.food_timing === 'before_food' ? '🍽️ Take BEFORE Food' : '🍽️ Take AFTER Food'}
                              </span>
                            )}
                            
                            {med.instructions && (
                              <span className="text-sm text-gray-700 italic bg-white px-3 py-1.5 rounded-lg border border-gray-200 flex-1 shadow-sm">
                                "{med.instructions}"
                              </span>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Edge Case: No medicines attached */}
            {expanded === idx && (!presc.medicines || presc.medicines.length === 0) && (
              <div className="mt-4 border-t border-gray-100 pt-4 flex items-center justify-center gap-2 text-gray-400 text-sm bg-gray-50/50 rounded-lg p-4">
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