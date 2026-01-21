// routes/delivery/orders.js - UPDATED
const express = require('express');
const router = express.Router();
const {
  getAssignedOrders,
  getOrderDetails,
  acceptOrder,
  deliverOrder,
  reportIssue,
  getDeliveryHistory,
  getOrderOTP,
  sendDeliveryOTP,
  getOTPStatus,
  resendOTP
} = require('../../controllers/delivery/deliveryOrdersController');
const { protectDelivery } = require('../../middleware/deliveryAuth');

// Apply authentication middleware to all routes
router.use(protectDelivery);

// Order routes
router.get('/assigned', getAssignedOrders);
router.get('/history', getDeliveryHistory);

// OTP routes
router.get('/:orderId/otp-status', getOTPStatus); // Check OTP status
router.get('/:orderId/otp', getOrderOTP); // Get OTP (testing only)
router.post('/:orderId/send-otp', sendDeliveryOTP); // Send OTP to customer
router.post('/:orderId/resend-otp', resendOTP); // Resend OTP

// Other order routes
router.get('/:orderId', getOrderDetails);
router.put('/:orderId/accept', acceptOrder);
router.put('/:orderId/deliver', deliverOrder);
router.post('/:orderId/report', reportIssue);

module.exports = router;