import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Calendar, User, FileText, CreditCard,
  Users, Settings, LogOut, Menu, X, FlaskConical,
  Stethoscope, Activity, Package, TrendingUp, ClipboardList,
  UserPlus, Clock, Pill, Building2, BarChart3, Bell, Phone, Bot, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = {
  patient: [
    { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/book-appointment', icon: Calendar, label: 'Book Appointment' },
    { to: '/patient/ai-assistant', icon: Bot, label: 'AI Assistant' },
    { to: '/patient/appointments', icon: ClipboardList, label: 'My Appointments' },
    { to: '/patient/prescriptions', icon: Pill, label: 'Prescriptions' },
    { to: '/patient/bills', icon: CreditCard, label: 'My Bills' },
    { to: '/patient/profile', icon: User, label: 'Profile' },
    { to: '/patient/contact', icon: Phone, label: 'Contact' },
  ],
  doctor: [
    { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/doctor/schedule', icon: Calendar, label: 'My Schedule' },
    { to: '/doctor/profile', icon: User, label: 'Profile' },
    { to: '/doctor/contact', icon: Phone, label: 'Contact' },
  ],
  receptionist: [
    { to: '/receptionist/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/receptionist/pending-appointments', icon: Clock, label: 'Pending Requests' },
    { to: '/receptionist/queue', icon: Users, label: "Appointment Queue" },
    { to: '/receptionist/billing', icon: CreditCard, label: 'Billing' },
    { to: '/receptionist/register-patient', icon: UserPlus, label: 'Register Patient' },
    { to: '/receptionist/schedules', icon: Calendar, label: 'Doctor Schedules' },
    { to: '/receptionist/profile', icon: User, label: 'Profile' },
    { to: '/receptionist/contact', icon: Phone, label: 'Contact' },
  ],
  lab: [
    { to: '/lab/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/lab/requests', icon: FlaskConical, label: 'Lab Requests' },
    { to: '/lab/profile', icon: User, label: 'Profile' },
    { to: '/lab/contact', icon: Phone, label: 'Contact' },
  ],
  pharmacist: [
    { to: '/pharmacist/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pharmacist/prescriptions', icon: Pill, label: 'Prescriptions' },
    { to: '/pharmacist/bills', icon: CreditCard, label: 'Pharmacy Bills' },
    { to: '/pharmacist/profile', icon: User, label: 'Profile' },
    { to: '/pharmacist/contact', icon: Phone, label: 'Contact' },
  ],
  admin: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/departments', icon: Building2, label: 'Departments' },
    { to: '/admin/lab-tests', icon: FlaskConical, label: 'Lab Tests' },
    { to: '/admin/medicines', icon: Package, label: 'Medicine Master' },
    { to: '/admin/revenue', icon: TrendingUp, label: 'Revenue Analytics' },
    { to: '/admin/system-settings', icon: Settings, label: 'Settings' },
    { to: '/admin/profile', icon: User, label: 'Profile' },
    { to: '/admin/contact', icon: Phone, label: 'Contact' },
  ],
};

const ROLE_COLORS = {
  patient: { bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', active: 'bg-blue-600 text-white shadow-md shadow-blue-500/20' },
  doctor: { bg: 'bg-teal-600', light: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', active: 'bg-teal-600 text-white shadow-md shadow-teal-500/20' },
  receptionist: { bg: 'bg-violet-600', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', active: 'bg-violet-600 text-white shadow-md shadow-violet-500/20' },
  lab: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', active: 'bg-amber-500 text-white shadow-md shadow-amber-500/20' },
  pharmacist: { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', active: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' },
  admin: { bg: 'bg-slate-800', light: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200', active: 'bg-slate-800 text-white shadow-md shadow-slate-800/20' },
};

const ROLE_LABELS = {
  patient: 'Patient Portal',
  doctor: 'Physician Portal',
  receptionist: 'Front Desk Portal',
  lab: 'Laboratory Portal',
  pharmacist: 'Pharmacy Portal',
  admin: 'System Admin',
};

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = NAV_ITEMS[role] || [];
  const colors = ROLE_COLORS[role] || ROLE_COLORS.patient;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-white">
      
      {/* --- LOGO AREA (Text & Icon Version) --- */}
      <div className="flex flex-col items-center justify-center p-6 border-b border-slate-100 relative overflow-hidden">
        <div className={`absolute inset-0 opacity-10 ${colors.bg}`}></div>
        
        <div className="relative z-10 flex items-center gap-2 mb-2">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center text-white shadow-md`}>
            <Activity size={24} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">MediCare<span className={colors.text}>.</span></span>
        </div>

        <div className="relative z-10 flex items-center gap-1.5 mt-1">
          <ShieldCheck size={14} className={colors.text} />
          <p className={`text-[11px] font-bold uppercase tracking-widest ${colors.text}`}>{ROLE_LABELS[role]}</p>
        </div>
      </div>

      {/* --- USER PROFILE CARD --- */}
      <div className="px-5 mt-6">
        <div className={`p-4 rounded-2xl ${colors.light} border ${colors.border} flex items-center gap-3 shadow-sm`}>
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center text-white font-bold text-sm shadow-inner`}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{user?.name || 'User'}</p>
            <p className="text-[11px] font-medium text-slate-500 truncate">{user?.email || 'Logged In'}</p>
          </div>
        </div>
      </div>

      {/* --- NAVIGATION LINKS --- */}
      <nav className="flex-1 px-4 mt-6 space-y-1.5 overflow-y-auto hide-scrollbar pb-6">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                isActive
                  ? colors.active
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon 
                  className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:text-slate-700'}`} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* --- LOGOUT BUTTON --- */}
      <div className="p-5 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white transition-all border border-rose-100 hover:border-rose-600 hover:shadow-md hover:shadow-rose-500/20"
        >
          <LogOut size={18} strokeWidth={2.5} />
          Secure Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-slate-800 selection:text-white overflow-hidden">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-slate-200/60 flex-shrink-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <Sidebar />
      </aside>

      {/* --- MOBILE SIDEBAR --- */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => setSidebarOpen(false)} 
            />
            <motion.aside 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="relative flex flex-col w-[280px] bg-white shadow-2xl z-50"
            >
              <button
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors z-50"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
              <Sidebar />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Mobile Top Header */}
        <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 py-3 flex items-center justify-between z-20 sticky top-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <Menu size={20} strokeWidth={2.5} />
          </button>
          
          {/* Mobile Text Logo */}
          <div className="flex items-center gap-2">
            <Activity className="text-slate-800" size={20} strokeWidth={2.5} />
            <span className="text-lg font-black tracking-tight text-slate-900">MediCare</span>
          </div>
          
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto relative z-10 scroll-smooth">
          <Outlet />
        </main>

      </div>
    </div>
  );
}