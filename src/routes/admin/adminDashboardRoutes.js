// ============================================
// FILE: routes/admin/adminDashboardRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getRecentOrders,
  getAnalytics,
} = require("../../controllers/admin/adminDashboardController");
const { authMiddleware, isAdmin } = require("../../middleware/adminAuth");

router.use(authMiddleware);
router.use(isAdmin);

router.get("/stats", getDashboardStats);
router.get("/recent-orders", getRecentOrders);
router.get("/analytics", getAnalytics);

module.exports = router;