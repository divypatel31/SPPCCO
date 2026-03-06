import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Patient Pages
import PatientDashboard from './pages/patient/Dashboard';
import PatientProfile from './pages/patient/Profile';
import BookAppointment from './pages/patient/BookAppointment';
import MyAppointments from './pages/patient/MyAppointments';
import MyBills from './pages/patient/MyBills';
import MyPrescriptions from './pages/patient/MyPrescriptions';

// Doctor Pages
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorAppointments from './pages/doctor/Appointments';
import ConsultationPage from './pages/doctor/Consultation';

// Receptionist Pages
import ReceptionistDashboard from './pages/receptionist/Dashboard';
import PendingAppointments from './pages/receptionist/PendingAppointments';
import TodayQueue from './pages/receptionist/TodayQueue';
import BillingPage from './pages/receptionist/Billing';
import RegisterPatient from './pages/receptionist/RegisterPatient';

// Lab Pages
import LabDashboard from './pages/lab/Dashboard';
import LabRequests from './pages/lab/LabRequests';

// Pharmacist Pages
import PharmacistDashboard from './pages/pharmacist/Dashboard';
import Prescriptions from './pages/pharmacist/Prescriptions';
import PharmacyBills from './pages/pharmacist/PharmacyBills';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import MedicineManagement from './pages/admin/MedicineManagement';
import RevenueAnalytics from './pages/admin/RevenueAnalytics';
import LabTestManagement from "./pages/admin/LabTestManagement";
import SystemSettings from "./pages/admin/SystemSettings";

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Common Pages (Available to multiple roles)
import StaffProfile from './pages/common/StaffProfile';
import Contact from './pages/common/Contact';

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

// Role-based redirect after login
const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const map = {
    patient: '/patient/dashboard',
    doctor: '/doctor/dashboard',
    receptionist: '/receptionist/dashboard',
    lab: '/lab/dashboard',
    pharmacist: '/pharmacist/dashboard',
    admin: '/admin/dashboard',
  };
  return <Navigate to={map[user.role] || '/login'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          {/* Public */}
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/unauthorized" element={
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-red-600">Unauthorized Access</h1>
                <p className="text-gray-500 mt-2">You don't have permission to view this page.</p>
              </div>
            </div>
          } />

          {/* Patient Routes */}
          <Route path="/patient" element={
            <ProtectedRoute allowedRoles={['patient']}>
              <DashboardLayout role="patient" />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<PatientDashboard />} />
            <Route path="profile" element={<PatientProfile />} />
            <Route path="book-appointment" element={<BookAppointment />} />
            <Route path="appointments" element={<MyAppointments />} />
            <Route path="bills" element={<MyBills />} />
            <Route path="prescriptions" element={<MyPrescriptions />} />
            <Route path="contact" element={<Contact />} /> {/* Fixed syntax */}
          </Route>

          {/* Doctor Routes */}
          <Route path="/doctor" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DashboardLayout role="doctor" />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<DoctorDashboard />} />
            <Route path="appointments" element={<DoctorAppointments />} />
            <Route path="consultation/:id" element={<ConsultationPage />} />
            <Route path="profile" element={<StaffProfile />} /> {/* Fixed syntax */}
            <Route path="contact" element={<Contact />} /> {/* Added */}
          </Route>

          {/* Receptionist Routes */}
          <Route path="/receptionist" element={
            <ProtectedRoute allowedRoles={['receptionist']}>
              <DashboardLayout role="receptionist" />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<ReceptionistDashboard />} />
            <Route path="pending-appointments" element={<PendingAppointments />} />
            <Route path="queue" element={<TodayQueue />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="register-patient" element={<RegisterPatient />} />
            <Route path="profile" element={<StaffProfile />} /> {/* Added */}
            <Route path="contact" element={<Contact />} /> {/* Added */}
          </Route>

          {/* Lab Routes */}
          <Route path="/lab" element={
            <ProtectedRoute allowedRoles={['lab']}>
              <DashboardLayout role="lab" />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<LabDashboard />} />
            <Route path="requests" element={<LabRequests />} />
            <Route path="profile" element={<StaffProfile />} /> {/* Added */}
            <Route path="contact" element={<Contact />} /> {/* Added */}
          </Route>

          {/* Pharmacist Routes */}
          <Route path="/pharmacist" element={
            <ProtectedRoute allowedRoles={['pharmacist']}>
              <DashboardLayout role="pharmacist" />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<PharmacistDashboard />} />
            <Route path="prescriptions" element={<Prescriptions />} />
            <Route path="bills" element={<PharmacyBills />} />
            <Route path="profile" element={<StaffProfile />} /> {/* Added */}
            <Route path="contact" element={<Contact />} /> {/* Added */}
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout role="admin" />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="departments" element={<DepartmentManagement />} />
            <Route path="lab-tests" element={<LabTestManagement />} />
            <Route path="medicines" element={<MedicineManagement />} />
            <Route path="revenue" element={<RevenueAnalytics />} />
            <Route path="system-settings" element={<SystemSettings />} />
            <Route path="profile" element={<StaffProfile />} /> {/* Fixed syntax */}
            <Route path="contact" element={<Contact />} /> {/* Fixed syntax */}
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;