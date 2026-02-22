import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard } from 'lucide-react';

export default function MyBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/billing/my-bills')
      .then(res => setBills(res.data || []))
      .catch(() => toast.error('Failed to load bills'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const total = bills.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
  const paid = bills.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

  return (
    <div>
      <PageHeader title="My Bills" subtitle="View all your consultation, lab and pharmacy bills" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card bg-blue-50 border-blue-100">
          <p className="text-sm text-blue-700">Total Bills</p>
          <p className="text-2xl font-bold text-blue-900">{bills.length}</p>
        </div>
        <div className="card bg-green-50 border-green-100">
          <p className="text-sm text-green-700">Amount Paid</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(paid)}</p>
        </div>
        <div className="card bg-orange-50 border-orange-100">
          <p className="text-sm text-orange-700">Total Amount</p>
          <p className="text-2xl font-bold text-orange-900">{formatCurrency(total)}</p>
        </div>
      </div>

      {bills.length === 0 ? (
        <div className="card">
          <EmptyState icon={CreditCard} title="No bills found" description="Bills will appear after your consultations" />
        </div>
      ) : (
        <div className="card p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>Date</th>
                  <th>Consultation Fee</th>
                  <th>Lab Charges</th>
                  <th>Other</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill._id || bill.id}>
                    <td className="font-mono text-xs text-gray-600">#{(bill.bill_id || bill._id || '').toString().slice(-8).toUpperCase()}</td>
                    <td>{formatDate(bill.generated_at || bill.created_at)}</td>
                    <td>{formatCurrency(bill.consultation_fee)}</td>
                    <td>{formatCurrency(bill.lab_charges)}</td>
                    <td>{formatCurrency(bill.other_charges)}</td>
                    <td className="font-semibold">{formatCurrency(bill.total_amount)}</td>
                    <td><StatusBadge status={bill.payment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
