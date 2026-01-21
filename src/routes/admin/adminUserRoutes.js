// ============================================
// FILE: routes/admin/adminUserRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserRole,
} = require("../../controllers/admin/adminUserController");
const { authMiddleware, isAdmin } = require("../../middleware/adminAuth");

router.use(authMiddleware);
router.use(isAdmin);

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.put("/:id/role", updateUserRole);

module.exports = router;