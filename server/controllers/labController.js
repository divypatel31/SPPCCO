const db = require("../config/db");

/*
GET /api/lab/requests
View all lab requests
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
    const { result, status } = req.body;

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

    // If result exists → complete automatically
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

    // If no result → just mark in progress
    await db.execute(
      `UPDATE lab_requests
       SET status = 'in_progress'
       WHERE request_id = ?`,
      [id]
    );

    res.json({ message: "Progress saved" });

  } catch (error) {
    console.error("COMPLETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};