import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 font-sans text-slate-700">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60">
        <Link to="/" className="inline-flex items-center gap-2 text-teal-600 font-semibold mb-8 hover:text-teal-700 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><ShieldCheck size={28} /></div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
        </div>

        <div className="space-y-6 text-sm md:text-base leading-relaxed font-medium text-slate-600">
          <p>Last updated: {new Date().toLocaleDateString('en-IN')}</p>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Information We Collect</h2>
          <p>MediCare HMS collects personal information such as names, contact details, medical history, and billing data to provide healthcare services. We may also collect digital access logs for security purposes.</p>
          
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. How We Use Your Data</h2>
          <p>Your data is used strictly for medical diagnoses, treatment planning, appointment scheduling, and internal hospital management. Your medical records are kept highly confidential.</p>
          
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Data Protection</h2>
          <p>We implement state-of-the-art encryption and strictly adhere to digital healthcare privacy standards (such as HIPAA guidelines) to ensure your Electronic Medical Records (EMR) cannot be accessed by unauthorized personnel.</p>
        </div>
      </div>
    </div>
  );
}