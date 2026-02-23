import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Calendar, User, FileText, CreditCard,
  Users, Settings, LogOut, Menu, X, FlaskConical,
  Stethoscope, Activity, Package, TrendingUp, ClipboardList,
  UserPlus, Clock, Pill, Building2, BarChart3, Bell
} from 'lucide-react';

const NAV_ITEMS = {
  patient: [
    { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/book-appointment', icon: Calendar, label: 'Book Appointment' },
    { to: '/patient/appointments', icon: ClipboardList, label: 'My Appointments' },
    { to: '/patient/prescriptions', icon: Pill, label: 'Prescriptions' },
    { to: '/patient/bills', icon: CreditCard, label: 'My Bills' },
    { to: '/patient/profile', icon: User, label: 'Profile' },
  ],
  doctor: [
    { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/appointments', icon: Calendar, label: 'Appointments' },
  ],
  receptionist: [
    { to: '/receptionist/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/receptionist/pending-appointments', icon: Clock, label: 'Pending Requests' },
    { to: '/receptionist/queue', icon: Users, label: "Appointment" },
    { to: '/receptionist/billing', icon: CreditCard, label: 'Billing' },
    { to: '/receptionist/register-patient', icon: UserPlus, label: 'Register Patient' },
  ],
  lab: [
    { to: '/lab/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/lab/requests', icon: FlaskConical, label: 'Lab Requests' },
  ],
  pharmacist: [
    { to: '/pharmacist/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pharmacist/prescriptions', icon: Pill, label: 'Prescriptions' },
    { to: '/pharmacist/bills', icon: CreditCard, label: 'Pharmacy Bills' },
  ],
  admin: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'User Management' }, 
    { to: '/admin/departments', icon: Building2, label: 'Departments' },
    { to: '/admin/lab-tests', icon: FlaskConical, label: 'Lab Tests' },
    { to: '/admin/medicines', icon: Package, label: 'Medicine Master' },
    { to: '/admin/revenue', icon: TrendingUp, label: 'Revenue Analytics' },
    { to: '/admin/system-settings', icon: Settings, label: 'Settings' },
  ],
};

const ROLE_COLORS = {
  patient: { bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  doctor: { bg: 'bg-teal-600', light: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
  receptionist: { bg: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  lab: { bg: 'bg-orange-600', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  pharmacist: { bg: 'bg-green-600', light: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  admin: { bg: 'bg-slate-700', light: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

const ROLE_LABELS = {
  patient: 'Patient Portal',
  doctor: 'Doctor Portal',
  receptionist: 'Receptionist Portal',
  lab: 'Lab Technician Portal',
  pharmacist: 'Pharmacist Portal',
  admin: 'Admin Portal',
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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-6 py-5 border-b ${colors.border}`}>
        <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">MediCare HMS</p>
          <p className={`text-xs ${colors.text} font-medium`}>{ROLE_LABELS[role]}</p>
        </div>
      </div>

      {/* User info */}
      <div className={`mx-4 mt-4 p-3 rounded-xl ${colors.light} border ${colors.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full ${colors.bg} flex items-center justify-center text-white font-semibold text-sm`}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 mt-6 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? `${colors.bg} text-white shadow-sm`
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-4 pb-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-white shadow-xl z-50">
            <button
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-gray-900">MediCare HMS</span>
          <div className="w-9" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
