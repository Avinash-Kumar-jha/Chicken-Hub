// FILE: routes/admin/adminCouponRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAllCoupons,
} = require("../../controllers/admin/adminCouponController");
const { authMiddleware, isAdmin } = require("../../middleware/adminAuth");

router.use(authMiddleware);
router.use(isAdmin);

router.post("/", createCoupon);
router.put("/:id", updateCoupon);
router.delete("/:id", deleteCoupon);
router.get("/", getAllCoupons);

module.exports = router;