import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Heart, Brain, Stethoscope, Baby, ArrowRight, ShieldCheck, Phone, Mail, MapPin, CheckCircle } from 'lucide-react';

const FADE_UP = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 1 } }
};

const STAGGER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function LandingPage() {
  // Smooth scroll helper for the # links
  const handleScroll = (e, targetId) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-500 selection:text-white">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 inset-x-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">MediCare<span className="text-teal-600">.</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#about" onClick={(e) => handleScroll(e, 'about')} className="hover:text-teal-600 transition-colors cursor-pointer relative z-50">About Us</a>
            <a href="#departments" onClick={(e) => handleScroll(e, 'departments')} className="hover:text-teal-600 transition-colors cursor-pointer relative z-50">Departments</a>
            <a href="#facilities" onClick={(e) => handleScroll(e, 'facilities')} className="hover:text-teal-600 transition-colors cursor-pointer relative z-50">Facilities</a>
          </div>

          <Link to="/login" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] flex items-center gap-2 relative z-50">
            Portal Login <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop" 
            alt="Hospital Background" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-slate-900/70 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent"></div>
        </div>

        <motion.div initial="hidden" animate="visible" variants={STAGGER} className="relative z-20 max-w-7xl mx-auto px-6 text-center pointer-events-auto">
          <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-300 text-sm font-semibold tracking-wide uppercase mb-6">
            <ShieldCheck size={16} /> Advanced Healthcare System
          </motion.div>
          <motion.h1 variants={FADE_UP} className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight">
            Protecting your health <br/> with <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">expert care.</span>
          </motion.h1>
          <motion.p variants={FADE_UP} className="text-lg md:text-xl text-slate-300 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            Experience world-class medical facilities, distinguished doctors, and compassionate care—all managed through our state-of-the-art digital infrastructure.
          </motion.p>
          <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-30">
            <Link to="/login" className="px-8 py-4 bg-teal-500 text-white rounded-xl font-bold text-lg hover:bg-teal-400 transition-all shadow-[0_0_40px_8px_rgba(20,184,166,0.3)] w-full sm:w-auto cursor-pointer">
              Book Appointment
            </Link>
            <a href="#departments" onClick={(e) => handleScroll(e, 'departments')} className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all w-full sm:w-auto cursor-pointer">
              Explore Departments
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* --- LIVE STATS SECTION --- */}
      <section id="about" className="relative z-30 -mt-12 max-w-7xl mx-auto px-6 mb-24 scroll-mt-32">
        <div className="bg-white rounded-[24px] shadow-xl border border-slate-100 p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-100">
            {[
              { label: "Happy Patients", value: "25,000+" },
              { label: "Successful Operations", value: "4,200+" },
              { label: "Expert Doctors", value: "150+" },
              { label: "Years of Excellence", value: "12+" },
            ].map((stat, i) => (
              <div key={i} className="text-center px-4">
                <p className="text-3xl md:text-4xl font-black text-slate-900 mb-2">{stat.value}</p>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- DEPARTMENTS SECTION --- */}
      <section id="departments" className="py-20 bg-slate-50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Centers of Excellence</h2>
            <p className="text-slate-600 font-medium max-w-2xl mx-auto">Comprehensive healthcare services tailored to your specific medical needs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Cardiology", desc: "Advanced heart care and surgery.", icon: Heart, color: "text-rose-500", bg: "bg-rose-50" },
              { name: "Neurology", desc: "Expert treatment for brain and nerves.", icon: Brain, color: "text-violet-500", bg: "bg-violet-50" },
              { name: "Pediatrics", desc: "Compassionate care for children.", icon: Baby, color: "text-blue-500", bg: "bg-blue-50" },
              { name: "General Surgery", desc: "Minimally invasive surgical procedures.", icon: Stethoscope, color: "text-emerald-500", bg: "bg-emerald-50" },
            ].map((dept, i) => (
              <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-200/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className={`w-14 h-14 rounded-2xl ${dept.bg} ${dept.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <dept.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{dept.name}</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">{dept.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- INSIDE THE HOSPITAL (FACILITIES) --- */}
      <section id="facilities" className="py-20 bg-white scroll-mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 tracking-tight">
                  State-of-the-art Infrastructure
                </h2>
                <p className="text-slate-600 font-medium leading-relaxed mb-8 text-base">
                  At MediCare, we believe that a healing environment is just as important as the clinical care provided. Our facilities are equipped with the latest medical technology, ultra-clean operation theaters, and comfortable patient recovery suites designed to make your stay safe and relaxing.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    '24/7 Emergency & Trauma Center',
                    'Advanced Imaging (MRI, CT, PET)',
                    'Fully Automated Pathology Lab',
                    'Modular Operation Theaters'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 font-semibold text-slate-800 text-sm">
                      <CheckCircle className="text-teal-500 shrink-0" size={20} /> {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* 🔥 UPDATED PHOTO ADJUSTMENT HERE */}
            <div className="w-full lg:w-1/2">
              <div className="grid grid-cols-2 gap-6 items-center">
                <motion.img 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  src="https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=1000&auto=format&fit=crop" 
                  alt="Modern Laboratory" 
                  className="rounded-3xl w-full h-72 object-cover shadow-lg border-4 border-white -mb-12 relative z-10" 
                />
                <motion.img 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1000&auto=format&fit=crop" 
                  alt="Advanced CT Scanner" 
                  className="rounded-3xl w-full h-72 object-cover shadow-lg border-4 border-white -mt-12" 
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 relative z-30">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-teal-500" size={24} />
              <span className="text-xl font-black text-white">MediCare HMS</span>
            </div>
            <p className="text-sm font-medium max-w-xs mb-6">Providing world-class healthcare solutions with compassion and innovation.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Contact</h4>
            <div className="space-y-3 text-sm font-medium">
              <p className="flex items-center gap-2"><Phone size={16}/> +91 1800-123-4567</p>
              <p className="flex items-center gap-2"><Mail size={16}/> contact@medicare.com</p>
              <p className="flex items-center gap-2"><MapPin size={16}/> 123 Health Avenue, Medical City</p>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Legal</h4>
            <div className="space-y-3 text-sm font-medium flex flex-col items-start">
              <Link to="/privacy" className="hover:text-white transition-colors relative z-50">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition-colors relative z-50">Terms of Service</Link>
              <Link to="/patient-rights" className="hover:text-white transition-colors relative z-50">Patient Rights</Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-800 text-sm text-center font-medium">
          &copy; {new Date().getFullYear()} MediCare Hospital Management System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}