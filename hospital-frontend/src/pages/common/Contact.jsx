import React from 'react';
import { Phone, Mail, MapPin, Clock, MessageSquare, ShieldCheck, Building2, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Contact() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    // 🔥 Added pt-6 here to fix the gap at the very top!
    <div className="max-w-6xl mx-auto pb-10 pt-6 font-sans">

      {/* Clean, Professional Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Contact Directory
          </h1>
          <p className="text-slate-500 text-sm mt-1">Important contacts and support details for MediCare HMS</p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
          <ShieldCheck className="text-blue-600 w-4 h-4" />
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Internal Network
          </span>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid lg:grid-cols-3 gap-6"
      >
        {/* Main Hospital Contact Card */}
        <motion.div variants={itemVariants} className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="p-8 grid md:grid-cols-3 gap-8">
              {/* Branding Side */}
              <div className="md:col-span-1 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-8 md:pb-0 md:pr-8">
                 <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-5 shadow-sm shadow-blue-200">
                    <Building2 className="text-white" size={28} />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-900 mb-1">MediCare Hospital</h2>
                 <p className="text-slate-500 text-sm">Main Medical District Branch</p>
              </div>

              {/* Info Side */}
              <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                       <MapPin size={14} className="text-blue-500"/> Location
                    </p>
                    <p className="text-slate-800 font-medium text-sm">123 Health Avenue<br/>Cityville, Medical District 40001</p>
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                       <Phone size={14} className="text-blue-500"/> 24/7 Helpline
                    </p>
                    <p className="text-slate-900 font-bold text-lg">+1 (800) 123-4567</p>
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                       <Mail size={14} className="text-blue-500"/> Email Support
                    </p>
                    <p className="text-slate-800 font-medium text-sm">contact@medicare-hms.com</p>
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                       <Clock size={14} className="text-blue-500"/> Operating Hours
                    </p>
                    <p className="text-slate-800 font-medium text-sm">Open 24 Hours</p>
                 </div>
              </div>
           </div>
        </motion.div>

        {/* Department Extensions */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
           <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <Headphones size={20} />
             </div>
             <h3 className="text-lg font-bold text-slate-900">Department Exts</h3>
           </div>

           <div className="space-y-3 flex-1">
             {[
               { label: 'Reception Desk', ext: '101' },
               { label: 'Pharmacy', ext: '204' },
               { label: 'Laboratory', ext: '305' },
               { label: 'Billing Office', ext: '402' }
             ].map((dept) => (
               <div key={dept.ext} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <span className="text-sm font-medium text-slate-700">{dept.label}</span>
                 <span className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-indigo-600">Ext: {dept.ext}</span>
               </div>
             ))}
           </div>
        </motion.div>

        {/* IT Support Section */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
           <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <ShieldCheck size={20} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900">IT & System Support</h3>
              </div>

              <p className="text-slate-500 text-sm leading-relaxed">
                Having trouble logging in, generating bills, or finding patient records? Contact the IT administration team for system access recovery and technical help.
              </p>

              <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors">
                <MessageSquare size={16} /> Open Support Ticket
              </div>
           </div>

           <div className="w-full md:w-64 bg-slate-50 border border-slate-200 p-6 rounded-xl flex flex-col items-center justify-center text-center">
              <Mail className="text-slate-400 mb-3" size={24} />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email IT Support</p>
              <p className="text-base font-bold text-slate-900 mb-3">support@medicare.com</p>
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">
                Response: ~2 Hours
              </div>
           </div>
        </motion.div>

      </motion.div>
    </div>
  );
}