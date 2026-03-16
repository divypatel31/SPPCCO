const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Temporarily removed auth middleware to test the connection
router.post('/chat', aiController.chatWithAI);

module.exports = router;