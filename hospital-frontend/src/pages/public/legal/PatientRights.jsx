import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';

export default function PatientRights() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 font-sans text-slate-700">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60">
        <Link to="/" className="inline-flex items-center gap-2 text-teal-600 font-semibold mb-8 hover:text-teal-700 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><Heart size={28} /></div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Patient Rights & Responsibilities</h1>
        </div>

        <div className="space-y-6 text-sm md:text-base leading-relaxed font-medium text-slate-600">
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Your Rights</h2>
          <ul className="list-disc pl-5 space-y-3">
            <li>To receive considerate, respectful, and compassionate medical care.</li>
            <li>To be provided with complete information regarding your diagnosis, treatment, and prognosis in understandable terms.</li>
            <li>To have total privacy and confidentiality regarding your medical records.</li>
            <li>To know the names and roles of the healthcare professionals treating you.</li>
          </ul>
          
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Your Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-3">
            <li>To provide accurate and complete information about your health history and current medications.</li>
            <li>To follow the treatment plan recommended by your assigned physician.</li>
            <li>To treat hospital staff, doctors, and other patients with respect.</li>
            <li>To ensure timely payment of hospital bills and consultation fees.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}