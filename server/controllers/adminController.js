const db = require("../config/db");

exports.getDashboardStats = async (req, res) => {
    try {

        const [patients] = await db.execute(
            "SELECT COUNT(*) AS total_patients FROM users WHERE role = 'patient'"
        );

        const [doctors] = await db.execute(
            "SELECT COUNT(*) AS total_doctors FROM users WHERE role = 'doctor'"
        );

        const [receptionists] = await db.execute(
            "SELECT COUNT(*) AS total_receptionists FROM users WHERE role = 'receptionist'"
        );

        const [labTechs] = await db.execute(
            "SELECT COUNT(*) AS total_lab_techs FROM users WHERE role = 'lab'"
        );

        const [pharmacists] = await db.execute(
            "SELECT COUNT(*) AS total_pharmacists FROM users WHERE role = 'pharmacist'"
        );

        const [appointments] = await db.execute(
            "SELECT COUNT(*) AS total_appointments FROM appointments"
        );

        const [revenue] = await db.execute(
            "SELECT SUM(total_amount) AS total_revenue FROM bills WHERE payment_status = 'paid'"
        );

        const [unpaid] = await db.execute(
            "SELECT COUNT(*) AS pending_bills FROM bills WHERE payment_status = 'unpaid'"
        );

        res.json({
            total_patients: patients[0].total_patients,
            total_doctors: doctors[0].total_doctors,
            total_receptionists: receptionists[0].total_receptionists,
            total_lab_techs: labTechs[0].total_lab_techs,
            total_pharmacists: pharmacists[0].total_pharmacists,
            total_appointments: appointments[0].total_appointments,
            total_revenue: parseFloat(revenue[0].total_revenue) || 0,
            pending_bills: unpaid[0].pending_bills
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.getMonthlyRevenue = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(total_amount) AS total
      FROM bills
      WHERE payment_status = 'paid'
      GROUP BY month
      ORDER BY month ASC
    `);

        res.json(
            rows.map(r => ({
                month: r.month,
                total: parseFloat(r.total)
            }))
        );


    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/* GET ALL STAFF USERS */
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
      SELECT 
        user_id,
        full_name,
        email,
        phone,
        role,
        department,
        status,
        created_at
      FROM users
      ORDER BY created_at DESC
      `
    );

    res.json(rows);

  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ message: "Failed to load users" });
  }
};

/* UPDATE USER */
exports.updateUser = async (req, res) => {
  try {
    const { full_name, email, phone, department } = req.body;
    const userId = req.params.id;

    // 🔥 Check if email exists for another user
    const [existing] = await db.execute(
      "SELECT user_id FROM users WHERE email = ? AND user_id != ?",
      [email, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    await db.execute(
      `
      UPDATE users
      SET full_name = ?, email = ?, phone = ?, department = ?
      WHERE user_id = ?
      `,
      [full_name, email, phone, department, userId]
    );

    res.json({ message: "User updated successfully" });

  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
};


/* ACTIVATE / DEACTIVATE USER */
exports.toggleUserStatus = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT status FROM users WHERE user_id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const newStatus = rows[0].status === "active" ? "inactive" : "active";

    await db.execute(
      "UPDATE users SET status = ? WHERE user_id = ?",
      [newStatus, req.params.id]
    );

    res.json({ message: `User ${newStatus}` });

  } catch (err) {
    console.error("TOGGLE STATUS ERROR:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
};

exports.getLabTests = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT lt.*, d.name AS department_name
      FROM lab_tests lt
      JOIN departments d ON lt.department_id = d.department_id
      ORDER BY lt.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.createLabTest = async (req, res) => {
  try {
    const { name, department_id, price, description } = req.body;

    await db.query(
      "INSERT INTO lab_tests (name, department_id, price, description) VALUES (?, ?, ?, ?)",
      [name, department_id, price, description]
    );

    res.status(201).json({ message: "Lab test created" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateLabTest = async (req, res) => {
  try {
    const { name, department_id, price, description } = req.body;

    await db.query(
      `UPDATE lab_tests 
       SET name=?, department_id=?, price=?, description=? 
       WHERE lab_test_id=?`,
      [name, department_id, price, description, req.params.id]
    );

    res.json({ message: "Lab test updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleLabTestStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT status FROM lab_tests WHERE lab_test_id=?",
      [id]
    );

    const newStatus =
      rows[0].status === "active" ? "inactive" : "active";

    await db.query(
      "UPDATE lab_tests SET status=? WHERE lab_test_id=?",
      [newStatus, id]
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateConsultationFee = async (req, res) => {
  const { consultation_fee } = req.body;

  await db.query(
    "UPDATE users SET consultation_fee = ? WHERE role = 'admin'",
    [consultation_fee]
  );

  res.json({ message: "Consultation fee updated" });
};