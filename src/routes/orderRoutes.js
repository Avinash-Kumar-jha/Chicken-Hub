// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/Auth'); // ✅ Changed to 'protect'

// ==================== USER ORDER ROUTES ====================

// CREATE ORDER (requires auth)
router.post('/', protect, orderController.createOrder);

// GET ALL USER ORDERS (requires auth)
router.get('/', protect, orderController.getUserOrders);

// GET SINGLE ORDER BY ID (requires auth)
router.get('/:orderId', protect, orderController.getOrderById);

// CANCEL ORDER (requires auth)
router.put('/:orderId/cancel', protect, orderController.cancelOrder);

// TRACK ORDER (requires auth)
router.get('/:orderId/track', protect, orderController.trackOrder);

// RETURN ORDER (requires auth)
router.post('/:orderId/return', protect, orderController.returnOrder);

// ADD REVIEW TO ORDER (requires auth)
router.post('/:orderId/review', protect, orderController.addOrderReview);

// ==================== PAYMENT ROUTES ====================

// CREATE RAZORPAY ORDER (requires auth)
router.post('/payment/create-razorpay-order', protect, orderController.createRazorpayOrder);

// VERIFY RAZORPAY PAYMENT (requires auth)
router.post('/payment/verify-razorpay', protect, orderController.verifyRazorpayPayment);

// CREATE COD ORDER (requires auth)
router.post('/payment/cod', protect, orderController.createCODOrder);

module.exports = router;