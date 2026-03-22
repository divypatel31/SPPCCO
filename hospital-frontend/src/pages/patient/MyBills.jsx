import React, { useState, useEffect } from 'react';
import { Spinner, StatusBadge, PageHeader } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, Download, FileText, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

export default function MyBills() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/billing/my-bills').then(res => setBills(res.data || [])).catch(() => toast.error('Failed to load bills')).finally(() => setLoading(false));
  }, []);

  // ... (Keep existing formatPDFCurrency, generatePDF, and generateLabResultPDF functions EXACTLY as they were. No logic changes needed here, they are perfect).
  const formatPDFCurrency = (value) => {
    const num = Number(value) || 0;
    return "Rs. " + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const generatePDF = async (bill) => {
    const toastId = toast.loading("Generating your receipt...");
    try {
      const doc = new jsPDF();
      const billIdStr = (bill.bill_id || bill._id || '').toString().slice(-8).toUpperCase();

      let labTestNames = "";
      if (['consultation', 'master'].includes(bill.bill_type) && bill.appointment_id) {
        try {
          const labRes = await api.get(`/patient/lab-reports?appointment_id=${bill.appointment_id}`);
          if (labRes.data && labRes.data.length > 0) {
            labTestNames = labRes.data.map(r => r.test_name).join(', ');
          }
        } catch (e) {
          console.error("Could not fetch lab details");
        }
      }

      doc.setFontSize(22);
      doc.setTextColor(41, 128, 185);
      doc.text("MediCare HMS", 105, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Official Payment Receipt", 105, 28, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Receipt No: #${billIdStr}`, 14, 45);
      doc.text(`Date: ${formatDate(bill.paid_at || bill.created_at)}`, 14, 52);
      doc.text(`Patient Name: ${user?.name || 'Patient'}`, 130, 45);
      doc.text(`Status: ${bill.payment_status.toUpperCase()}`, 130, 52);

      let tableColumn = [];
      let tableRows = [];
      let alignStyles = {}; 

      if (bill.bill_type === 'pharmacy' && bill.items && bill.items.length > 0) {
        tableColumn = [
          { content: "Medicine Name", styles: { halign: 'left' } },
          { content: "Qty", styles: { halign: 'center' } },
          { content: "Price", styles: { halign: 'right' } },
          { content: "Total", styles: { halign: 'right' } }
        ];
        tableRows = bill.items.map(item => [
          item.item_name || item.name || 'Medicine',
          (item.quantity || 1).toString(),
          formatPDFCurrency(item.price || 0),
          formatPDFCurrency((item.quantity || 1) * (item.price || 0))
        ]);
        alignStyles = { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } };
      } 
      else if (bill.items && bill.items.length > 0) {
        tableColumn = [
          { content: "Description", styles: { halign: 'left' } },
          { content: "Amount", styles: { halign: 'right' } }
        ];
        tableRows = bill.items.map(item => {
          let desc = item.item_name || item.description || 'Service Charge';
          if (desc.toLowerCase().includes('laboratory') && labTestNames) {
            desc += `\n(Tests: ${labTestNames})`;
          }
          return [desc, formatPDFCurrency(item.price || item.amount || 0)];
        });
        alignStyles = { 1: { halign: 'right' } };
      } 
      else {
        tableColumn = [
          { content: "Description", styles: { halign: 'left' } },
          { content: "Amount", styles: { halign: 'right' } }
        ];
        tableRows = [
          [`${(bill.bill_type || 'General').toUpperCase()} Charges`, formatPDFCurrency(bill.total_amount)]
        ];
        alignStyles = { 1: { halign: 'right' } };
      }

      autoTable(doc, {
        startY: 65,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: alignStyles
      });

      const finalY = doc.lastAutoTable?.finalY || 100;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, finalY + 8, 196, finalY + 8);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Grand Total Paid: ${formatPDFCurrency(bill.total_amount)}`, 196, finalY + 16, { align: "right" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for choosing MediCare HMS. Wishing you good health!", 105, finalY + 40, { align: "center" });

      doc.save(`MediCare_Receipt_${billIdStr}.pdf`);
      toast.success("Receipt downloaded!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Error generating Receipt PDF", { id: toastId });
    }
  };

  const generateLabResultPDF = async (bill) => {
    const toastId = toast.loading("Fetching Lab Report...");
    try {
      const res = await api.get(`/patient/lab-reports?appointment_id=${bill.appointment_id}`);
      const reports = res.data;

      if (!reports || reports.length === 0) {
        toast.error("No completed lab results found for this bill.", { id: toastId });
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(231, 76, 60);
      doc.text("MediCare Lab Report", 105, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text("Official Laboratory Report", 105, 28, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Patient: ${user?.name}`, 14, 45); 
      doc.text(`Date: ${formatDate(new Date())}`, 160, 45);

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

      doc.save(`Lab_Report_Appt_${bill.appointment_id}.pdf`);
      toast.success("Medical Report downloaded!", { id: toastId });
    } catch (err) {
      toast.error("Failed to fetch lab results.", { id: toastId });
    }
  };

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
    </div>
  );

  const total = bills.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
  const paid = bills.filter(b => (b.payment_status || '').toLowerCase() === 'paid').reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER} className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans">
      <PageHeader title="Financial Records" subtitle="View and download your hospital receipts and lab reports" />

      {/* --- Metric Cards --- */}
      <motion.div variants={STAGGER_CONTAINER} className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: "Total Invoices", value: bills.length, icon: CreditCard, bg: "bg-blue-50", text: "text-blue-600" },
          { label: "Amount Settled", value: formatCurrency(paid), icon: Wallet, bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Lifetime Billed", value: formatCurrency(total), icon: FileText, bg: "bg-slate-50", text: "text-slate-600" },
        ].map((stat, i) => (
          <motion.div key={i} variants={FADE_UP_SPRING} className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex items-center gap-4 group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} group-hover:scale-105 transition-transform`}>
              <stat.icon size={20} className={stat.text} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {bills.length === 0 ? (
        <motion.div variants={FADE_UP_SPRING} className="bg-white border border-slate-200/60 rounded-[24px] p-16 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <CreditCard size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">No Financial Records</h3>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-sm">Invoices and receipts will appear here after your first medical consultation.</p>
        </motion.div>
      ) : (
        <motion.div variants={FADE_UP_SPRING} className="bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  <th className="p-5 pl-6">Invoice ID</th>
                  <th className="p-5">Date Generated</th>
                  <th className="p-5">Classification</th>
                  <th className="p-5">Total Amount</th>
                  <th className="p-5 pr-6 text-right">Status & Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {bills.map(bill => {
                    const hasLabCharge = bill.bill_type === 'lab' || (bill.items && bill.items.some(item => (item.description || item.item_name || '').toLowerCase().includes('lab')));
                    return (
                      <motion.tr key={bill.bill_id || bill._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group">
                        <td className="p-5 pl-6 font-mono text-xs font-semibold text-slate-600">
                          #{(bill.bill_id || '').toString().slice(-8).toUpperCase()}
                        </td>
                        <td className="p-5 text-sm font-medium text-slate-600">{formatDate(bill.created_at)}</td>
                        <td className="p-5 text-sm font-medium text-slate-800 capitalize tracking-tight">{bill.bill_type}</td>
                        <td className="p-5 text-sm font-semibold text-slate-900">{formatCurrency(bill.total_amount)}</td>
                        <td className="p-5 pr-6">
                          <div className="flex items-center justify-end gap-3">
                            <StatusBadge status={bill.payment_status} />
                            {(bill.payment_status || '').toLowerCase() === 'paid' && (
                              <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => generatePDF(bill)} className="p-2 text-sky-600 bg-sky-50 border border-sky-100 rounded-lg hover:bg-sky-600 hover:text-white transition-colors" title="Download Receipt">
                                  <Download size={14} />
                                </button>
                                {hasLabCharge && bill.appointment_id && (
                                  <button onClick={() => generateLabResultPDF(bill)} className="p-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors" title="Download Lab Report">
                                    <FileText size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}