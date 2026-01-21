// ============================================
// FILE: routes/admin/adminReviewRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  getPendingReviews,
  approveReview,
  deleteReview,
} = require("../../controllers/admin/adminReviewController");
const { authMiddleware, isAdmin } = require("../../middleware/adminAuth");

router.use(authMiddleware);
router.use(isAdmin);

router.get("/pending", getPendingReviews);
router.put("/:id/approve", approveReview);
router.delete("/:id", deleteReview);

module.exports = router;