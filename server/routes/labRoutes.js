const express = require("express");
const router = express.Router();

const labController = require("../controllers/labController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

// All lab routes require login
router.use(verifyToken);

// Only lab technician can access
router.use(authorizeRole("lab"));

// View department lab requests
router.get("/requests", labController.getLabRequests);

// Complete test
router.put("/complete/:id", labController.completeLabTest);

module.exports = router;
