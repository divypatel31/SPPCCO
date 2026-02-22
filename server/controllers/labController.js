const db = require("../config/db");

/*
GET /api/lab/requests
View all lab requests
*/
exports.getLabRequests = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM lab_requests
       ORDER BY created_at DESC`
    );

    res.json(rows);

  } catch (error) {
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

    const [requests] = await db.execute(
      "SELECT * FROM lab_requests WHERE request_id = ?",
      [id]
    );

    if (!requests.length) {
      return res.status(404).json({ message: "Lab request not found" });
    }

    if (requests[0].status === "completed") {
      return res.status(400).json({ message: "Test already completed" });
    }

    await db.execute(
      `UPDATE lab_requests
       SET status = 'completed',
           result = ?,
           billing_status = 'ready'
       WHERE request_id = ?`,
      [result, id]
    );

    res.json({ message: "Lab test completed successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
