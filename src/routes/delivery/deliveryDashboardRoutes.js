const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getRecentActivity,
  getEarningsBreakdown
} = require('../../controllers/delivery/deliveryDashboardController');
const { protectDelivery } = require('../../middleware/deliveryAuth');

router.use(protectDelivery);

router.get('/stats', getDashboardStats);
router.get('/activity', getRecentActivity);
router.get('/earnings', getEarningsBreakdown);

module.exports = router;