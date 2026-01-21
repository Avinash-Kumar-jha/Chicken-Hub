// routes/returnRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const {
  initiateReturn,
  getUserReturns,
  getReturnById,
  cancelReturn,
  schedulePickup,
  updatePickupStatus,
  approveReturn,
  rejectReturn,
  updateQualityCheck,
  initiateRefund,
  initiateExchange,
  getAdminReturns,
  assignPickupAgent,
  addAdminNote,
  getReturnAnalytics,
  getReturnStats,
  uploadReturnImages
} = require('../controllers/returnController');

const { protect, admin, deliveryAgent, user, adminOrDelivery, adminOrUser } = require('../middleware/authMiddleware');
const { upload, handleUploadError, cleanupUploads } = require('../middleware/uploadMiddleware');

// Apply upload error handling to all routes
router.use(handleUploadError);

// User routes (requires user authentication)
router.post('/initiate', 
  protect, 
  user, 
  upload.array('images', 5), 
  cleanupUploads,
  initiateReturn
);

router.get('/my-returns', protect, user, getUserReturns);

// Get single return - Admin, delivery, or the user who owns it
router.get('/:id', protect, async (req, res, next) => {
  try {
    // Get the return to check ownership
    const Return = require('../models/Return');
    const returnRequest = await Return.findById(req.params.id);
    
    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }
    
    // Check if user owns the return or is admin/delivery
    if (returnRequest.userId.toString() === req.user._id.toString() || 
        req.user.role === 'admin' || 
        req.user.role === 'delivery') {
      return getReturnById(req, res, next);
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own returns.'
      });
    }
  } catch (error) {
    next(error);
  }
});

router.put('/:id/cancel', protect, user, cancelReturn);
router.put('/:id/schedule-pickup', protect, user, schedulePickup);

router.post('/:id/upload-images', 
  protect, 
  user, 
  upload.array('images', 5), 
  cleanupUploads,
  uploadReturnImages
);

// Admin routes
router.get('/admin/all', protect, admin, getAdminReturns);
router.put('/:id/approve', protect, admin, approveReturn);
router.put('/:id/reject', protect, admin, rejectReturn);
router.put('/:id/quality-check', protect, admin, updateQualityCheck);
router.put('/:id/initiate-refund', protect, admin, initiateRefund);
router.put('/:id/initiate-exchange', protect, admin, initiateExchange);
router.put('/:id/assign-agent', protect, admin, assignPickupAgent);
router.post('/:id/notes', protect, admin, addAdminNote);
router.get('/analytics/stats', protect, admin, getReturnStats);
router.get('/analytics/overview', protect, admin, getReturnAnalytics);

// Delivery agent routes - only returns assigned to them
router.get('/agent/pickups', protect, deliveryAgent, async (req, res, next) => {
  try {
    // Get returns where this delivery agent is assigned
    const Return = require('../models/Return');
    const returns = await Return.find({ 
      pickupAgentId: req.user._id,
      status: { $in: ['pickup_scheduled', 'pickup_completed', 'in_transit_to_warehouse'] }
    })
    .populate('userId', 'name email phone')
    .populate('productId', 'name images')
    .populate('orderId', 'orderNumber')
    .sort('-pickupDate');

    res.json({
      success: true,
      count: returns.length,
      data: returns
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/pickup-status', protect, deliveryAgent, updatePickupStatus);

module.exports = router;