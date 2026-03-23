# 🏥 MediCare HMS - Advanced Hospital Management System

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)

MediCare is a state-of-the-art, comprehensive Hospital Management System (HMS) designed with a premium SaaS-style user interface. It digitizes and streamlines hospital operations with robust role-based access control, ensuring secure and efficient management of patients, doctors, lab tests, pharmacies, and billing.

---

## ✨ Key Features

### 🔐 Secure & Smart Authentication
* **Role-Based Access Control (RBAC):** Dedicated, secure portals for 6 different user roles (Admin, Doctor, Receptionist, Patient, Lab Technician, Pharmacist).
* **Advanced Security:** First-time login forced password reset.
* **Account Recovery:** Email/OTP-based password recovery system.

### 🎭 Role-Specific Dashboards
* **👨‍⚕️ Doctor Portal:** Manage appointments, write digital clinical notes, prescribe medication, and request lab tests directly from the consultation screen.
* **📊 Admin Command Center:** Real-time hospital analytics, revenue distribution charts, and complete staff/department management.
* **📅 Receptionist Desk:** Patient registration, dynamic appointment queue management, and billing processing.
* **🔬 Lab Diagnostics:** Receive test requests, update clinical findings, and automatically generate/download official PDF Lab Reports.
* **💊 Pharmacy Module:** View digital prescriptions and process pharmacy billing.
* **👤 Patient Portal:** Book appointments, access medical history, download prescriptions, and view lab results.

### 🎨 Premium SaaS UI/UX
* **Modern Design:** Built with Tailwind CSS featuring frosted glassmorphism, dynamic color coding, and responsive layouts.
* **Fluid Animations:** Powered by `framer-motion` for buttery-smooth page transitions, staggered list appearances, and interactive elements.
* **Data Visualization:** Interactive monthly revenue and demographic charts using `recharts`.
* **Automated PDFs:** One-click PDF generation for lab reports and prescriptions using `jsPDF` and `jspdf-autotable`.

---

## 🛠️ Tech Stack

**Frontend:**
* React (Vite)
* Tailwind CSS (Styling)
* Framer Motion (Animations)
* Lucide React (Icons)
* Recharts (Data Visualization)
* React Router DOM (Routing)
* React Hot Toast (Notifications)
* jsPDF (Document Generation)

**Backend:**
* Node.js & Express.js
* JSON Web Tokens (JWT Authentication)
* Nodemailer (OTP & Email Services)
* Bcrypt (Password Hashing)

---

## 🚀 Installation & Setup

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

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
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
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
