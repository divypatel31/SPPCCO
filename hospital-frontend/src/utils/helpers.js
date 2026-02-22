import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isValid(d) ? format(d, 'dd MMM yyyy') : '—';
  } catch { return '—'; }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isValid(d) ? format(d, 'dd MMM yyyy, hh:mm a') : '—';
  } catch { return '—'; }
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  try {
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    return format(d, 'hh:mm a');
  } catch { return timeStr; }
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0.00';
  return `₹${parseFloat(amount).toFixed(2)}`;
};

export const getStatusBadgeClass = (status) => {
  const map = {
    pending: 'badge-pending',
    scheduled: 'badge-active',
    arrived: 'badge-active',
    in_consultation: 'badge-completed',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
    paid: 'badge-active',
    unpaid: 'badge-pending',
    active: 'badge-active',
    inactive: 'badge-cancelled',
    generated: 'badge-completed',
    not_generated: 'badge-pending',
  };
  return map[status?.toLowerCase()] || 'badge-pending';
};

export const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  LAB: 'lab',
  PHARMACIST: 'pharmacist',
  ADMIN: 'admin',
};

export const ROLE_DASHBOARDS = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  receptionist: '/receptionist/dashboard',
  lab: '/lab/dashboard',
  pharmacist: '/pharmacist/dashboard',
  admin: '/admin/dashboard',
};
