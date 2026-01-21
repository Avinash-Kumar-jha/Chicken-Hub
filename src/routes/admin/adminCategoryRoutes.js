// FILE: routes/admin/adminCategoryRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
} = require("../../controllers/admin/adminCategoryController");
const { authMiddleware, isAdmin } = require("../../middleware/adminAuth");

router.use(authMiddleware);
router.use(isAdmin);

router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);
router.get("/", getAllCategories);

module.exports = router;