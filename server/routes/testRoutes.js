const express = require("express");
const router = express.Router();
const db = require("../config/db");

const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

router.use(verifyToken);

router.get(
  "/",
  authorizeRole("doctor"),
  async (req, res) => {
    try {
      const [rows] = await db.execute(
        `SELECT lab_test_id, name, price, description
         FROM lab_tests
         WHERE status = 'active'
         ORDER BY name ASC`
      );

      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;