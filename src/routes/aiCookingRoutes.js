// routes/aiCookingRoutes.js
const express = require('express');
const router = express.Router();

// Import controller
const aiCookingController = require('../controllers/aiCookingController');

// Routes
router.post('/ask', aiCookingController.askCookingQuestion);
router.get('/tips', aiCookingController.getCookingTips);
router.post('/feedback', aiCookingController.provideFeedback);
router.get('/history', aiCookingController.getChatHistory);
router.post('/clear', aiCookingController.clearChatHistory);

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'AI Cooking Assistant API is working',
    timestamp: new Date().toISOString()
  });
});

// Health route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Cooking Assistant is ready',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;