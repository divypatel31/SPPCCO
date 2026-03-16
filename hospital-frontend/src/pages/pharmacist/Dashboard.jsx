import React, { useState, useEffect } from 'react';
import { StatCard, Spinner, StatusBadge, EmptyState } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Pill, Package, CreditCard, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PharmacistDashboard() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchData = async () => {
    try {
      const [presRes, medRes] = await Promise.all([
        api.get('/pharmacy/prescriptions'),   // ✅ correct
        api.get('/pharmacy/medicine')         // ✅ correct
      ]);

      setPrescriptions(presRes.data || []);
      setMedicines(medRes.data || []);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load pharmacy data");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);

  if (loading) return <Spinner />;

  const lowStock = medicines.filter(m => m.stock <= (m.minimum_threshold || 10));

  return (
    <div>
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold">Pharmacy Dashboard</h1>
        <p className="text-green-100 mt-1">Manage prescriptions, dispense medicines, and billing</p>
        <div className="flex gap-3 mt-4">
          <Link to="/pharmacist/prescriptions" className="bg-white text-green-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-50">
            View Prescriptions
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Pill} label="Pending Prescriptions" value={prescriptions.length} color="green" />
        <StatCard icon={Package} label="Total Medicines" value={medicines.length} color="blue" />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={lowStock.length} color="orange" />
        <StatCard icon={CreditCard} label="Bills Today" value="—" color="purple" />
      </div>

      {lowStock.length > 0 && (
        <div className="card mb-6 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-orange-600" size={20} />
            <h2 className="font-semibold text-orange-900">Low Stock Alert</h2>
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 5).map(med => (
              <div key={med._id || med.id} className="flex items-center justify-between text-sm">
                <span className="text-orange-800 font-medium">{med.medicine_name || med.name}</span>
                <span className="text-orange-600">{med.stock} units remaining</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Medicine Inventory</h2>
          <Link to="/pharmacist/prescriptions" className="text-green-600 text-sm flex items-center gap-1 hover:underline">
            Prescriptions <ArrowRight size={14} />
          </Link>
        </div>
        {medicines.length === 0 ? (
          <EmptyState icon={Package} title="No medicines found" description="Medicine inventory will appear here" />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Unit Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {medicines.slice(0, 8).map(med => (
                  <tr key={med._id || med.id}>
                    <td className="font-medium">{med.medicine_name || med.name}</td>
                    <td className="text-gray-500">{med.category || '—'}</td>
                    <td>
                      <span className={`font-medium ${med.stock <= (med.minimum_threshold || 10) ? 'text-red-600' : 'text-gray-900'}`}>
                        {med.stock}
                      </span>
                    </td>
                    <td>{formatCurrency(med.price)}</td>
                    <td>
                      {med.stock <= (med.minimum_threshold || 10) ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Low Stock</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">In Stock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
