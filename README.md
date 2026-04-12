# 🏥 MediCare HMS - Advanced Hospital Management System

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

MediCare is a state-of-the-art, comprehensive Hospital Management System (HMS) designed with a premium SaaS-style user interface. It digitizes and completely automates hospital operations, featuring real-time AI triage, smart inventory batching, automated email communications, and robust role-based access control.

---

## ✨ Key Features & Modules

### 🤖 Autonomous AI Health Assistant
* **Smart Triage:** Integrated AI chatbot that analyzes patient symptoms in real-time.
* **Automated Booking:** Directly connects to the hospital database to check doctor availability and auto-book consultations seamlessly without human intervention.

### 💊 Advanced Pharmacy & Inventory (Smart FIFO)
* **First-In, First-Out (FIFO) Batching:** The backend engine automatically calculates and dispenses medications from the oldest expiring batches first.
* **Mixed-Batch Billing:** Seamlessly spans prescriptions across multiple price batches, calculating exact blended totals dynamically.
* **Smart Stock Tracking:** Prevents dispensing of expired or out-of-stock medicines with real-time UI validation and low-stock alerts.

### 📧 Production-Grade Communication (Brevo API)
* **Automated HTML Emails:** Beautiful, customized email templates for patient onboarding, appointment confirmations, and cancellations.
* **Smart Spam Bypass:** Engineered with plain-text fallbacks to ensure 100% deliverability past strict email spam filters.
* **Secure OTP Recovery:** Time-sensitive, email-based OTP system for password resets and account recovery.

### 💳 Wallet System & Smart Billing
* **Digital Patient Wallet:** Integrated top-up system for frictionless appointment booking and pharmacy purchases.
* **Smart Refund Logic:** Automated ₹100 refunds trigger *only* if a confirmed appointment is cancelled, protecting the hospital from invalid refund requests.

### 👨‍⚕️ Advanced Doctor Consultation Suite
* **Invisible Auto-Save:** Debounced, real-time background saving prevents data loss while doctors write clinical notes.
* **Record Locking:** strict UI overlays prevent editing until the physician officially initiates the "Start Encounter" process.
* **Concurrent Lab Requests:** Dispatches multiple diagnostic requests to the lab instantly using highly optimized `Promise.all` networking.

### 🔬 Diagnostics & Automated Reporting
* **Official PDF Generation:** One-click conversion of clinical lab results into highly formatted, official PDF documents using `jsPDF` and `jspdf-autotable`.

### 🔐 Secure Authentication & RBAC
* **6 Distinct Portals:** Dedicated access environments for Admin, Doctor, Receptionist, Patient, Lab Technician, and Pharmacist.
* **Data Security:** JWT-based authentication, Bcrypt password hashing, and forced password changes on first-time logins.

---

## 🛠️ Tech Stack

**Frontend:**
* React (Vite)
* Tailwind CSS (Frosted Glassmorphism & Modern UI)
* Framer Motion (Fluid Page Transitions & Animations)
* Lucide React (Icons)
* Recharts (Data Visualization & Analytics)
* React Router DOM (Routing)
* React Hot Toast (Notifications)
* jsPDF / AutoTable (Document Generation)

**Backend & Database:**
* Node.js & Express.js (REST API)
* MySQL (Relational Database)
* JSON Web Tokens (JWT)
* Brevo API / Nodemailer (Transactional Emails)
* Bcrypt (Cryptography)

---

## 🚀 Installation & Setup

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and MySQL installed on your local machine.

### 1. Clone the repository
```bash
git clone [https://github.com/yourusername/medicare-hms.git](https://github.com/yourusername/medicare-hms.git)
cd medicare-hms
2. Setup the Backend
Bash
cd server
npm install
Create a .env file in the server directory and add your environment variables:

Code snippet
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=medicare_db
JWT_SECRET=your_super_secret_key
EMAIL_USER=your_brevo_smtp_email
EMAIL_PASS=your_brevo_smtp_password
Start the backend server:

Bash
npm run dev
3. Setup the Frontend
Open a new terminal window:

Bash
cd hospital-frontend
npm install
Start the Vite development server:

Bash
npm run dev
The application will now be running on http://localhost:5173.

📂 Project Structure
Plaintext
📦 medicare-hms
 ┣ 📂 hospital-frontend      # React + Vite Frontend
 ┃ ┣ 📂 src
 ┃ ┃ ┣ 📂 components         # Reusable UI components & Layouts
 ┃ ┃ ┣ 📂 context            # Global state (AuthContext)
 ┃ ┃ ┣ 📂 pages              # Role-specific dashboard pages
 ┃ ┃ ┃ ┣ 📂 admin
 ┃ ┃ ┃ ┣ 📂 auth             # Login, Register, OTP flows
 ┃ ┃ ┃ ┣ 📂 doctor           # Consultation & Scheduling
 ┃ ┃ ┃ ┣ 📂 pharmacy         # Smart FIFO Dispensing
 ┃ ┃ ┃ ┣ 📂 public           # Beautiful Landing & Legal Pages
 ┃ ┃ ┃ ┗ ...
 ┃ ┃ ┗ 📂 utils              # Axios interceptors & formatters
 ┃ ┗ 📜 tailwind.config.js
 ┃
 ┗ 📂 server                 # Node.js Backend
   ┣ 📂 config               # Database & JWT configs
   ┣ 📂 controllers          # Business logic per role
   ┣ 📂 middleware           # Auth & Role validation
   ┣ 📂 routes               # Express API endpoints
   ┗ 📜 server.js            # App entry point
