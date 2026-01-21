// routes/feedbackRoutes.js
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  submitFeedback,
  getUserFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats,
  markHelpful,
  addAdminResponse,
  updateFeedbackStatus,
  getAllFeedback
} = require('../controllers/feedbackController');

// User routes
router.post('/', protect, submitFeedback);
router.get('/user', protect, getUserFeedback);
router.get('/:id', protect, getFeedbackById);
router.put('/:id', protect, updateFeedback);
router.delete('/:id', protect, deleteFeedback);
router.post('/:id/helpful', protect, markHelpful);

// Admin routes
router.get('/', protect, admin, getAllFeedback);
router.get('/stats/all', protect, admin, getFeedbackStats);
router.post('/:id/respond', protect, admin, addAdminResponse);
router.put('/:id/status', protect, admin, updateFeedbackStatus);

module.exports = router;