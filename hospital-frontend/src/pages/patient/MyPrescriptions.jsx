import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Pill, ChevronDown, ChevronUp } from 'lucide-react';

export default function MyPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    // Using test/profile as proxy until patient prescription endpoint
    api.get('/patient/profile')
      .then(res => {
        // profile may have prescriptions embedded
        const presc = res.data?.prescriptions || [];
        setPrescriptions(presc);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      <PageHeader title="My Prescriptions" subtitle={`${prescriptions.length} prescriptions`} />
      <div className="space-y-4">
        {prescriptions.map((presc, idx) => (
          <div key={presc._id || idx} className="card">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpanded(expanded === idx ? null : idx)}
            >
              <div>
                <p className="font-semibold text-gray-900">Prescription #{(presc.prescription_id || presc._id || '').toString().slice(-6).toUpperCase()}</p>
                <p className="text-sm text-gray-500">{formatDate(presc.created_at)} — Dr. {presc.doctor_name || 'Unknown'}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={presc.status || 'active'} />
                {expanded === idx ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </div>
            </div>
            {expanded === idx && presc.medicines && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase">
                      <th className="pb-2">Medicine</th>
                      <th className="pb-2">Dosage</th>
                      <th className="pb-2">Frequency</th>
                      <th className="pb-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presc.medicines.map((med, mi) => (
                      <tr key={mi} className="border-t border-gray-50">
                        <td className="py-2 font-medium">{med.medicine_name || med.name}</td>
                        <td className="py-2 text-gray-600">{med.dosage}</td>
                        <td className="py-2 text-gray-600">{med.frequency}</td>
                        <td className="py-2 text-gray-600">{med.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
