// ============================================
// FILE: routes/admin/adminAuthRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  adminLogin,
  adminLogout,
  getAdminProfile,
  updateAdminProfile,
  changePassword,
} = require("../../controllers/admin/adminAuthController");
const { authMiddleware, isAdmin } = require("../../middleware/adminAuth");

// Public routes
router.post("/login", adminLogin);

// Protected routes (require authentication + admin role)
router.use(authMiddleware);
router.use(isAdmin);

router.post("/logout", adminLogout);
router.get("/me", getAdminProfile);
router.put("/profile", updateAdminProfile);
router.put("/change-password", changePassword);

module.exports = router;


