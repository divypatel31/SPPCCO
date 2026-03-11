const db = require("../config/db");

/* 🔥 NEW: Get Pending Lab Groups (Grouped by Patient/Appointment)
  This solves the "Empty Pending List" issue by matching 'requested' status
*/
exports.getPendingTests = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        lr.appointment_id,
        u.full_name AS patient_name,
        u.user_id AS patient_id,
        COUNT(lr.request_id) AS total_tests,
        MIN(lr.created_at) AS requested_at
      FROM lab_requests lr
      JOIN users u ON lr.patient_id = u.user_id
      WHERE lr.status = 'requested' 
      GROUP BY lr.appointment_id, u.full_name, u.user_id
      ORDER BY requested_at ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error("PENDING FETCH ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/*
  GET /api/lab/requests
  View all lab requests (History)
*/
exports.getLabRequests = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
          lr.*,
          p.full_name AS patient_name,
          d.full_name AS doctor_name
       FROM lab_requests lr
       LEFT JOIN users p ON lr.patient_id = p.user_id
       LEFT JOIN users d ON lr.doctor_id = d.user_id
       ORDER BY lr.created_at DESC`
    );

    res.json(rows);

  } catch (error) {
    console.error("LAB FETCH ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/*
  PUT /api/lab/complete/:id
  Mark lab test completed
*/
exports.completeLabTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { result } = req.body;

    const [rows] = await db.execute(
      "SELECT * FROM lab_requests WHERE request_id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Lab request not found" });
    }

    if (rows[0].status === "completed") {
      return res.status(400).json({ message: "Already completed" });
    }

    // 🔥 FIXED: Removed 'updated_at' to prevent the 500 error
    if (result && result.trim() !== "") {
      await db.execute(
        `UPDATE lab_requests
         SET status = 'completed',
             result = ?,
             billing_status = 'ready'
         WHERE request_id = ?`,
        [result, id]
      );

      return res.json({ message: "Lab test completed successfully" });
    }

    // If no result yet, just mark it as in progress
    await db.execute(
      `UPDATE lab_requests
       SET status = 'in_progress'
       WHERE request_id = ?`,
      [id]
    );

    res.json({ message: "Test marked as in progress" });

  } catch (error) {
    console.error("COMPLETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};