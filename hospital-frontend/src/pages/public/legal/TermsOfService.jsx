import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 font-sans text-slate-700">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60">
        <Link to="/" className="inline-flex items-center gap-2 text-teal-600 font-semibold mb-8 hover:text-teal-700 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText size={28} /></div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Terms of Service</h1>
        </div>

        <div className="space-y-6 text-sm md:text-base leading-relaxed font-medium text-slate-600">
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>By accessing the MediCare Hospital Management System, whether as a patient, doctor, or staff member, you agree to comply with our digital policies and terms of usage.</p>
          
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. Portal Usage</h2>
          <p>The patient portal is provided for convenience to book appointments and view records. It is not intended for medical emergencies. In case of an emergency, visit the hospital immediately.</p>
          
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Appointment & Cancellation Policy</h2>
          <p>Appointments can be cancelled or rescheduled via the portal. Continuous "no-shows" may result in a temporary suspension of portal booking privileges. A standard consultation fee may be charged as per hospital rules.</p>
        </div>
      </div>
    </div>
  );
}