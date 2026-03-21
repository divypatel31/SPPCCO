const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifyToken } = require('../middleware/authMiddleware'); // 🔥 Added this back!

// 🔥 Added verifyToken so the controller knows exactly which patient is chatting!
router.post('/chat', verifyToken, aiController.chatWithAI);

module.exports = router;