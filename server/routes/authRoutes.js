const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// Existing routes
router.post("/register", auth.register);
router.post("/login", auth.login);
router.get("/my-profile", verifyToken, auth.getMyProfile);
router.post("/change-password", verifyToken, auth.changePassword);

// --- NEW FORGOT PASSWORD ROUTES ---
// Note: These do NOT use verifyToken because the user is not logged in!
router.post("/forgot-password", auth.forgotPassword);
router.post("/verify-otp", auth.verifyOtp);
router.post("/reset-password", auth.resetPassword);
router.post('/force-change-password', auth.forceChangePassword);

module.exports = router;