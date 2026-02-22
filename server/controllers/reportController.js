const db = require("../config/db");

exports.getDepartmentRevenue = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.name AS department,
             SUM(b.total_amount) AS revenue
      FROM bills b
      JOIN appointments a ON b.appointment_id = a.id
      JOIN departments d ON a.department_id = d.id
      GROUP BY d.name
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.getPatientTrend = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%b') AS month,
             COUNT(*) AS total
      FROM users
      WHERE role = 'patient'
      GROUP BY month
      ORDER BY MIN(created_at)
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.getDoctorPerformance = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.full_name AS doctor,
             d.name AS department,
             COUNT(a.id) AS consultations
      FROM appointments a
      JOIN users u ON a.doctor_id = u.id
      JOIN departments d ON a.department_id = d.id
      GROUP BY u.full_name, d.name
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
};  