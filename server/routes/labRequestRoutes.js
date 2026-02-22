const express = require("express");
const router = express.Router();

const labRequestController = require("../controllers/labRequestController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

router.use(verifyToken);

// Doctor create lab request
router.post("/", authorizeRole("doctor"), labRequestController.createLabRequest);

// Lab view all
router.get("/", authorizeRole("lab"), labRequestController.getLabRequests);

// Receptionist view completed (STATIC FIRST)
router.get("/completed", authorizeRole("receptionist"), labRequestController.getCompletedLabTests);

// Lab complete test
router.put("/:id/complete", authorizeRole("lab"), labRequestController.completeLabTest);

// Receptionist generate bill (DYNAMIC LAST)
router.post("/:id/generate-bill", authorizeRole("receptionist"), labRequestController.generateLabBill);

module.exports = router;
