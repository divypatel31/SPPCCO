const express = require("express");
const router = express.Router();

const labController = require("../controllers/labController");
const auth = require("../middleware/auth"); // Using your standard auth middleware
const role = require("../middleware/role"); // Using your standard role middleware

// 🔥 ADDED: Get pending/requested tests grouped by patient
// This ensures the Lab Dashboard/Pending page actually finds the 'requested' tests
router.get("/pending", auth, role("lab"), labController.getPendingTests);

// View all lab requests (History)
router.get("/requests", auth, role("lab"), labController.getLabRequests);

// Complete test / Save results
router.put("/complete/:id", auth, role("lab"), labController.completeLabTest);

module.exports = router;