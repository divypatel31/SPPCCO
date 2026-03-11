const db = require("../config/db");

/* =======================================
   1. DEPARTMENT REVENUE (PIE CHART)
======================================= */
exports.getDepartmentRevenue = async (req, res) => {
  try {
    // 🔥 NEW: Fetch dynamic fee
    const [adminRows] = await db.query("SELECT consultation_fee FROM users WHERE role = 'admin' LIMIT 1");
    const adminFee = Number(adminRows[0]?.consultation_fee) || 0;

    const [rows] = await db.query(`
      SELECT department,
             (COUNT(*) * ?) AS revenue
      FROM appointments 
      WHERE status IN ('arrived', 'in_consultation', 'completed')
      AND department IS NOT NULL
      GROUP BY department
    `, [adminFee]); // 🔥 PASS DYNAMIC FEE INTO SQL QUERY

    res.json(rows);
  } catch (err) {
    console.error("DEPT REVENUE ERROR:", err);
    res.status(500).json({ message: "Failed to load department revenue" });
  }
};

/* =======================================
   2. PATIENT REGISTRATION TREND (LINE CHART)
======================================= */
exports.getPatientTrend = async (req, res) => {
  try {
    // 🔥 FIXED: Changed "total" to "total_patients" to match frontend chart DataKey
    const [rows] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%b') AS month,
             COUNT(*) AS total_patients
      FROM users
      WHERE role = 'patient'
      GROUP BY month
      ORDER BY MIN(created_at)
    `);

    res.json(rows);
  } catch (err) {
    console.error("PATIENT TREND ERROR:", err);
    res.status(500).json({ message: "Failed to load patient trend" });
  }
};

/* =======================================
   3. DOCTOR PERFORMANCE (BAR CHART)
======================================= */
exports.getDoctorPerformance = async (req, res) => {
  try {
    // 🔥 FIXED: Changed u.id to u.user_id, a.id to a.appointment_id
    // 🔥 FIXED: Changed "doctor" to "doctor_name" to match frontend chart DataKey
    const [rows] = await db.query(`
      SELECT u.full_name AS doctor_name,
             a.department AS department,
             COUNT(a.appointment_id) AS consultations
      FROM appointments a
      JOIN users u ON a.doctor_id = u.user_id
      WHERE a.status IN ('arrived', 'in_consultation', 'completed')
      GROUP BY u.full_name, a.department
    `);

    res.json(rows);
  } catch (err) {
    console.error("DOCTOR PERFORMANCE ERROR:", err);
    res.status(500).json({ message: "Failed to load doctor performance" });
  }
};