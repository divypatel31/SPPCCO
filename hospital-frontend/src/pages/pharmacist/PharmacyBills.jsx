import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader, Modal } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle, Eye, Pill } from 'lucide-react';

export default function PharmacyBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);
  
  // States for the Bill Details Modal
  const [selectedBill, setSelectedBill] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const fetchBills = async () => {
    try {
      const res = await api.get('/pharmacy/bills');
      setBills(res.data || []);
    } catch (err) {
      toast.error('Failed to load bills');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const markPaid = async (id) => {
    setMarking(id);
    try {
      await api.put(`/pharmacy/bills/${id}/mark-paid`);
      toast.success('Bill marked as paid!');
      fetchBills();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update bill');
    } finally {
      setMarking(null);
    }
  };

  // Fetch the items inside the bill when the Eye button is clicked
  const viewBillDetails = async (bill) => {
    setSelectedBill(bill);
    setLoadingItems(true);
    try {
      const res = await api.get(`/pharmacy/bills/${bill.bill_id}/details`);
      setBillItems(res.data || []);
    } catch (err) {
      toast.error('Failed to load bill details');
      setSelectedBill(null);
    } finally {
      setLoadingItems(false);
    }
  };

  const totalRevenue = bills
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader 
        title="Pharmacy Bills" 
        subtitle="Track all pharmacy billing and payments" 
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-green-50 border-green-100">
          <p className="text-sm text-green-700">Total Bills</p>
          <p className="text-2xl font-bold text-green-900">{bills.length}</p>
        </div>

        <div className="card bg-blue-50 border-blue-100">
          <p className="text-sm text-blue-700">Revenue Collected</p>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(totalRevenue)}
          </p>
        </div>

        <div className="card bg-yellow-50 border-yellow-100">
          <p className="text-sm text-yellow-700">Pending Payment</p>
          <p className="text-2xl font-bold text-yellow-900">
            {bills.filter(b => b.payment_status !== 'paid').length}
          </p>
        </div>
      </div>

      {/* Table */}
      {bills.length === 0 ? (
        <div className="card">
          <EmptyState 
            icon={CreditCard} 
            title="No pharmacy bills yet" 
            description="Bills will appear here after medicines are dispensed" 
          />
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
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill.bill_id}>
                    <td className="font-mono text-xs">
                      #{bill.bill_id}
                    </td>

                    <td className="font-medium">
                      {bill.patient_name}
                    </td>

                    <td>
                      {formatDate(bill.created_at)}
                    </td>

                    <td className="font-semibold">
                      {formatCurrency(bill.total_amount)}
                    </td>

                    <td>
                      <StatusBadge status={bill.payment_status} />
                    </td>

                    <td>
                      {/* Show Mark Paid button if NOT paid. Show Eye button if PAID */}
                      {bill.payment_status !== 'paid' ? (
                        <button
                          onClick={() => markPaid(bill.bill_id)}
                          disabled={marking === bill.bill_id}
                          className="btn-success text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          {marking === bill.bill_id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                          ) : (
                            <CheckCircle size={12} />
                          )}
                          Mark Paid
                        </button>
                      ) : (
                        <button
                          onClick={() => viewBillDetails(bill)}
                          className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded-lg flex items-center gap-1 transition-colors"
                          title="View Bill Details"
                        >
                          <Eye size={16} />
                          <span className="text-xs font-semibold pr-1">View</span>
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

      {/* Bill Details Modal */}
      <Modal
        open={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title={`Bill Receipt #${selectedBill?.bill_id}`}
      >
        {loadingItems ? (
          <div className="flex justify-center p-8"><Spinner /></div>
        ) : (
          <div className="space-y-4">
            
            {/* Patient Info Banner */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Patient</p>
                <p className="font-semibold text-gray-900">{selectedBill?.patient_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold">Date Paid</p>
                <p className="font-semibold text-gray-900">{formatDate(selectedBill?.created_at)}</p>
              </div>
            </div>

            {/* Dispensed Medicines List */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 font-semibold text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Medicine Name</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-gray-500 italic">No items found in this bill.</td>
                    </tr>
                  ) : (
                    billItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                          <Pill size={14} className="text-blue-500" />
                          {item.medicine_name}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex justify-between items-center mt-2">
              <span className="font-bold text-green-800">Total Amount Paid</span>
              <span className="text-xl font-black text-green-900">{formatCurrency(selectedBill?.total_amount)}</span>
            </div>

            <button
              onClick={() => setSelectedBill(null)}
              className="w-full btn-secondary mt-4"
            >
              Close Receipt
            </button>
          </div>
        )}
      </Modal>

    </div>
  );
}