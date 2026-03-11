import React, { useState, useEffect } from 'react';
import { Spinner, EmptyState, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, Download, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// FIXED IMPORTS FOR VITE COMPATIBILITY
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MyBills() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/billing/my-bills')
      .then(res => setBills(res.data || []))
      .catch(() => toast.error('Failed to load bills'))
      .finally(() => setLoading(false));
  }, []);

  // 🔥 GENERATE PAYMENT RECEIPT (Now handles Combined Master Bills)
  const generatePDF = (bill) => {
    try {
      const doc = new jsPDF();
      const billIdStr = (bill.bill_id || bill._id || '').toString().slice(-8).toUpperCase();

      // Header
      doc.setFontSize(22);
      doc.setTextColor(41, 128, 185);
      doc.text("MediCare HMS", 105, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Official Payment Receipt", 105, 28, { align: "center" });

      // Patient Info
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Receipt No: #${billIdStr}`, 14, 45);
      doc.text(`Date: ${formatDate(bill.paid_at || bill.created_at)}`, 14, 52);
      doc.text(`Patient Name: ${user?.name || 'Patient'}`, 130, 45);
      doc.text(`Status: ${bill.payment_status.toUpperCase()}`, 130, 52);

      // 🔥 COMBINED BILL LOGIC
      let tableColumn = ["Description", "Amount"];
      let tableRows = [];

      // Check if it's a master bill with multiple charges from the receptionist
      if (bill.consultation_fee !== undefined || bill.lab_charges !== undefined || ['consultation', 'master'].includes(bill.bill_type)) {

        // Push individual line items if they exist and are greater than 0
        if (Number(bill.consultation_fee) > 0) tableRows.push(["Consultation Fee", formatCurrency(bill.consultation_fee)]);
        if (Number(bill.lab_charges) > 0) tableRows.push(["Laboratory Charges", formatCurrency(bill.lab_charges)]);
        if (Number(bill.medicine_charges) > 0) tableRows.push(["Pharmacy / Medicine Charges", formatCurrency(bill.medicine_charges)]);
        if (Number(bill.other_charges) > 0) tableRows.push(["Other / Misc Charges", formatCurrency(bill.other_charges)]);

        // Fallback if the backend just sent the total
        if (tableRows.length === 0) {
          tableRows = [["Consultation & Hospital Services", formatCurrency(bill.total_amount)]];
        }

      } else if (bill.bill_type === 'pharmacy' && bill.items && bill.items.length > 0) {
        // Direct Pharmacy Bill format
        tableColumn = ["Medicine Name", "Qty", "Price", "Total"];
        tableRows = bill.items.map(item => [
          item.item_name || item.name || 'Medicine',
          (item.quantity || 1).toString(),
          formatCurrency(item.price || 0),
          formatCurrency((item.quantity || 1) * (item.price || 0))
        ]);
      } else {
        // Generic single-item bill fallback
        tableRows = [
          [`${(bill.bill_type || 'General').toUpperCase()} Charges`, formatCurrency(bill.total_amount)]
        ];
      }

      // Draw Table
      autoTable(doc, {
        startY: 65,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10, cellPadding: 5 }
      });

      // Footer & Total
      const finalY = doc.lastAutoTable?.finalY || 100;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Paid: ${formatCurrency(bill.total_amount)}`, 14, finalY + 15);

      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for choosing MediCare HMS. Wishing you good health!", 105, finalY + 40, { align: "center" });

      doc.save(`MediCare_Receipt_${billIdStr}.pdf`);
      toast.success("Receipt downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Error generating Receipt PDF");
    }
  };

  // GENERATE MEDICAL LAB REPORT
  const generateLabResultPDF = async (bill) => {
    try {
      const res = await api.get(`/patient/lab-reports?appointment_id=${bill.appointment_id}`);
      const reports = res.data;

      if (!reports || reports.length === 0) {
        toast.error("No lab results found for this bill.");
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(231, 76, 60);
      doc.text("MediCare Pathology Lab", 105, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text("Official Laboratory Report", 105, 28, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Patient: ${user?.name}`, 14, 45);
      doc.text(`Date: ${formatDate(new Date())}`, 130, 45);

      const tableColumn = ["Test Name", "Result / Findings", "Status"];
      const tableRows = reports.map(r => [r.test_name, r.result || "Awaiting Result", r.status.toUpperCase()]);

      autoTable(doc, {
        startY: 55,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [231, 76, 60] },
      });

      doc.setFontSize(9);
      doc.text("This is a computer-generated report and does not require a physical signature.", 105, doc.lastAutoTable.finalY + 20, { align: "center" });

      doc.save(`Lab_Report_${bill.appointment_id}.pdf`);
      toast.success("Medical Report downloaded!");
    } catch (err) {
      toast.error("Failed to fetch lab results.");
    }
  };

  if (loading) return <Spinner />;

  const total = bills.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
  // 🔥 FIX: safely checks for 'paid' regardless of uppercase/lowercase
  const paid = bills.filter(b => (b.payment_status || '').toLowerCase() === 'paid').reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

  return (
    <div>
      <PageHeader title="My Bills" subtitle="View and download your hospital receipts" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card bg-blue-50 border-blue-100 p-4 rounded-xl">
          <p className="text-sm text-blue-700">Total Bills</p>
          <p className="text-2xl font-bold text-blue-900">{bills.length}</p>
        </div>
        <div className="card bg-green-50 border-green-100 p-4 rounded-xl">
          <p className="text-sm text-green-700">Amount Paid</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(paid)}</p>
        </div>
        <div className="card bg-orange-50 border-orange-100 p-4 rounded-xl">
          <p className="text-sm text-orange-700">Total Amount</p>
          <p className="text-2xl font-bold text-orange-900">{formatCurrency(total)}</p>
        </div>
      </div>

      {bills.length === 0 ? (
        <div className="card">
          <EmptyState icon={CreditCard} title="No bills found" description="Bills will appear after your consultations" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>Date</th>
                  <th>Bill Type</th>
                  <th>Total Amount</th>
                  <th>Status & Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill.bill_id || bill._id}>
                    <td className="font-mono text-xs">#{(bill.bill_id || '').toString().slice(-8).toUpperCase()}</td>
                    <td>{formatDate(bill.created_at)}</td>
                    <td className="capitalize font-medium">{bill.bill_type}</td>
                    <td className="font-semibold">{formatCurrency(bill.total_amount)}</td>

                    <td className="flex items-center gap-2">
                      <StatusBadge status={bill.payment_status} />

                      {/* 🔥 FIX: Safely forces lowercase so the button ALWAYS shows if it's paid */}
                      {(bill.payment_status || '').toLowerCase() === 'paid' && (
                        <>
                          <button
                            onClick={() => generatePDF(bill)}
                            className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                            title="Download Receipt"
                          >
                            <Download size={16} />
                          </button>

                          {bill.bill_type === 'lab' && (
                            <button
                              onClick={() => generateLabResultPDF(bill)}
                              className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                              title="Download Lab Report"
                            >
                              <FileText size={16} />
                            </button>
                          )}
                        </>
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