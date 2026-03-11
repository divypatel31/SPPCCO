require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const roleTestRoutes = require("./routes/roleTestRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const patientRoutes = require("./routes/patientRoutes");
const receptionistRoutes = require("./routes/receptionistRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const billingRoutes = require("./routes/billingRoutes");
const labRoutes = require("./routes/labRoutes");
const labRequestRoutes = require("./routes/labRequestRoutes");
const adminRoutes = require("./routes/adminRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

/* Middleware */
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

/* Routes */
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/role", roleTestRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/receptionist", receptionistRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/lab", labRoutes);
app.use("/api/lab-request", labRequestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/reports", reportRoutes);

/* Root Test */
app.get("/", (req, res) => {
  res.send("Hospital Management Backend Running");
});

/* Server Start */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
