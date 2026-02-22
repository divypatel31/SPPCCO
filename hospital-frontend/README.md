# MediCare Hospital Management System — Frontend

A complete React frontend for your Hospital Management System, built to connect with your Node.js/Express backend at `http://localhost:5000`.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open browser
http://localhost:5173
```

> Make sure your backend is running on `http://localhost:5000` before starting the frontend.

---

## 📁 Project Structure

```
src/
├── App.jsx                    # Root app with routing
├── index.css                  # Global styles + Tailwind
├── main.jsx                   # Entry point
│
├── context/
│   └── AuthContext.jsx        # Auth state, login/logout/register
│
├── utils/
│   ├── api.js                 # Axios instance with JWT interceptor
│   └── helpers.js             # formatDate, formatCurrency, status helpers
│
├── components/
│   ├── common/index.jsx       # StatCard, Spinner, Modal, StatusBadge, etc.
│   └── layout/
│       └── DashboardLayout.jsx  # Sidebar layout (role-aware)
│
└── pages/
    ├── auth/
    │   ├── LoginPage.jsx      # Single login for all roles
    │   └── RegisterPage.jsx   # Patient self-registration
    │
    ├── patient/
    │   ├── Dashboard.jsx
    │   ├── Profile.jsx
    │   ├── BookAppointment.jsx
    │   ├── MyAppointments.jsx
    │   ├── MyBills.jsx
    │   └── MyPrescriptions.jsx
    │
    ├── doctor/
    │   ├── Dashboard.jsx
    │   ├── Appointments.jsx
    │   └── Consultation.jsx   # Full consultation workflow
    │
    ├── receptionist/
    │   ├── Dashboard.jsx
    │   ├── PendingAppointments.jsx  # Doctor assignment
    │   ├── TodayQueue.jsx           # Mark arrived
    │   ├── Billing.jsx              # Generate & mark paid
    │   └── RegisterPatient.jsx
    │
    ├── lab/
    │   ├── Dashboard.jsx
    │   └── LabRequests.jsx    # Process tests, upload results
    │
    ├── pharmacist/
    │   ├── Dashboard.jsx
    │   ├── Prescriptions.jsx  # Dispense + generate bill
    │   └── PharmacyBills.jsx
    │
    └── admin/
        ├── Dashboard.jsx      # Revenue charts (Recharts)
        ├── UserManagement.jsx # Create staff accounts
        ├── DepartmentManagement.jsx
        ├── MedicineManagement.jsx
        └── RevenueAnalytics.jsx  # Full financial dashboard
```

---

## 🔐 Role-Based Access

| Role         | Login → Redirects To         |
|--------------|------------------------------|
| `patient`    | `/patient/dashboard`         |
| `doctor`     | `/doctor/dashboard`          |
| `receptionist`| `/receptionist/dashboard`   |
| `lab`        | `/lab/dashboard`             |
| `pharmacist` | `/pharmacist/dashboard`      |
| `admin`      | `/admin/dashboard`           |

Role is **auto-detected** from the JWT/session — no manual role dropdown.

---

## 🔗 API Endpoints Used

| Frontend Page            | Backend Route                            |
|--------------------------|------------------------------------------|
| Login                    | `POST /api/auth/login`                   |
| Register (Patient)       | `POST /api/auth/register`               |
| Patient Profile          | `GET/PUT /api/patient/profile`           |
| Book Appointment         | `POST /api/appointments/book`            |
| My Appointments          | `GET /api/appointments/my`               |
| Cancel Appointment       | `PUT /api/appointments/cancel/:id`       |
| My Bills                 | `GET /api/billing/my-bills`              |
| Doctor Appointments      | `GET /api/doctor/appointments`           |
| Start Consultation       | `PUT /api/doctor/start/:id`              |
| Medical Record           | `POST /api/doctor/medical-record`        |
| Prescription             | `POST /api/doctor/prescription`          |
| Lab Request (Doctor)     | `POST /api/doctor/lab-request`           |
| Complete Consultation    | `PUT /api/doctor/complete/:id`           |
| Pending Appointments     | `GET /api/receptionist/pending-appointments` |
| Assign Doctor            | `POST /api/receptionist/assign-doctor`   |
| Mark Arrived             | `PUT /api/receptionist/mark-arrived/:id` |
| Completed Appointments   | `GET /api/receptionist/completed-appointments` |
| Generate Bill            | `POST /api/receptionist/generate-bill`   |
| Mark Bill Paid           | `PUT /api/receptionist/mark-paid/:id`    |
| Lab Requests             | `GET /api/lab-request`                   |
| Complete Lab Test        | `PUT /api/lab-request/:id/complete`      |
| Pharmacy Medicines       | `GET /api/pharmacy/medicine`             |
| Add Medicine (Admin)     | `POST /api/pharmacy/medicine`            |
| Update Medicine (Admin)  | `PUT /api/pharmacy/medicine/:id`         |
| Sell Medicines           | `POST /api/pharmacy/sell`                |
| Low Stock                | `GET /api/pharmacy/low-stock`            |
| Admin Dashboard          | `GET /api/admin/dashboard`               |
| Monthly Revenue          | `GET /api/admin/monthly-revenue`         |

---

## ⚙️ Authentication

JWT token is expected in `res.data.token` from the login response.  
Token is stored in `localStorage` as `hms_user` and sent in `Authorization: Bearer <token>` header.

If your backend sends the token differently (e.g., in cookies), update `src/utils/api.js`.

---

## 🛠️ Tech Stack

- **React 18** + Vite
- **React Router v6** (nested routes)
- **Tailwind CSS** (utility-first styling)
- **Axios** (API calls with interceptors)
- **Recharts** (revenue charts)
- **React Hot Toast** (notifications)
- **Lucide React** (icons)
- **date-fns** (date formatting)

---

## 📦 Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

---

## 🧩 Notes

- All pages gracefully handle loading states and empty states
- API errors show toast notifications
- Protected routes redirect to `/login` if not authenticated
- Admin cannot access patient/doctor routes and vice versa
- The Consultation page has 3 tabs: Medical Record, Prescription, Lab Tests
- Revenue page shows demo chart data if backend returns empty monthly revenue

---

Built with ❤️ for MediCare HMS
