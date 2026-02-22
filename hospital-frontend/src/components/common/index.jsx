// Common reusable components

import React from 'react';
import { Loader2 } from 'lucide-react';

// Stat Card for dashboards
export const StatCard = ({ icon: Icon, label, value, color = 'blue', sub }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    teal: 'bg-teal-50 text-teal-600',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// Loading Spinner
export const Spinner = ({ className = '' }) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <Loader2 className="animate-spin text-blue-600" size={32} />
  </div>
);

// Empty State
export const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {Icon && <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <Icon size={28} className="text-gray-400" />
    </div>}
    <h3 className="text-gray-700 font-semibold text-lg">{title}</h3>
    {description && <p className="text-gray-400 text-sm mt-1 max-w-xs">{description}</p>}
  </div>
);

// Status Badge
export const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-blue-100 text-blue-800',
    arrived: 'bg-indigo-100 text-indigo-800',
    in_consultation: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-600',
    generated: 'bg-blue-100 text-blue-800',
    not_generated: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-orange-100 text-orange-800',
    ready_for_billing: 'bg-teal-100 text-teal-800',
    billed: 'bg-green-100 text-green-800',
    low: 'bg-red-100 text-red-800',
  };
  const labels = {
    not_generated: 'Not Generated',
    in_consultation: 'In Consultation',
    in_progress: 'In Progress',
    ready_for_billing: 'Ready for Billing',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status?.toLowerCase()] || status?.replace(/_/g, ' ') || '—'}
    </span>
  );
};

// Modal wrapper
export const Modal = ({ open, onClose, title, children, width = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// Form Input
export const FormField = ({ label, required, children, error }) => (
  <div>
    <label className="label">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

// Page Header
export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);
