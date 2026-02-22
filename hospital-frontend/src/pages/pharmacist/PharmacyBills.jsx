import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle } from 'lucide-react';

export default function PharmacyBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);

  const fetchBills = async () => {
    try {
      // This would typically be a pharmacy bills endpoint
      setBills([]);
    } catch { toast.error('Failed to load bills'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBills(); }, []);

  const markPaid = async (id) => {
    setMarking(id);
    try {
      await api.post('/billing/mark-paid', { bill_id: id });
      toast.success('Bill marked as paid!');
      fetchBills();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setMarking(null);
    }
  };

  const totalRevenue = bills.filter(b => b.payment_status === 'paid').reduce((s, b) => s + (parseFloat(b.total_amount) || 0), 0);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Pharmacy Bills" subtitle="Track all pharmacy billing and payments" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card bg-green-50 border-green-100">
          <p className="text-sm text-green-700">Total Bills</p>
          <p className="text-2xl font-bold text-green-900">{bills.length}</p>
        </div>
        <div className="card bg-blue-50 border-blue-100">
          <p className="text-sm text-blue-700">Revenue Collected</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="card bg-yellow-50 border-yellow-100">
          <p className="text-sm text-yellow-700">Pending Payment</p>
          <p className="text-2xl font-bold text-yellow-900">{bills.filter(b => b.payment_status !== 'paid').length}</p>
        </div>
      </div>

      {bills.length === 0 ? (
        <div className="card">
          <EmptyState icon={CreditCard} title="No pharmacy bills yet" description="Bills will appear here after medicines are dispensed" />
        </div>
      ) : (
        <div className="card p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Subtotal</th>
                  <th>Discount</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill._id || bill.id}>
                    <td className="font-mono text-xs">#{(bill._id || '').slice(-6).toUpperCase()}</td>
                    <td className="font-medium">{bill.patient_name}</td>
                    <td>{formatDate(bill.created_at)}</td>
                    <td>{formatCurrency(bill.subtotal)}</td>
                    <td>{formatCurrency(bill.discount)}</td>
                    <td className="font-semibold">{formatCurrency(bill.total_amount)}</td>
                    <td><StatusBadge status={bill.payment_status} /></td>
                    <td>
                      {bill.payment_status !== 'paid' && (
                        <button
                          onClick={() => markPaid(bill._id || bill.id)}
                          disabled={marking === (bill._id || bill.id)}
                          className="btn-success text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          {marking === (bill._id || bill.id) ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <CheckCircle size={12} />}
                          Mark Paid
                        </button>
                      )}
                    </td>
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
