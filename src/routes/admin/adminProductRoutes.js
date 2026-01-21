// ============================================
// FILE: routes/admin/adminProductRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  getAllProducts,  // Add this import
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
} = require("../../controllers/admin/adminProductController");
const { authMiddleware, isAdmin } = require("../../middleware/adminAuth");

router.use(authMiddleware);
router.use(isAdmin);

// Add GET route for fetching all products
router.get("/", getAllProducts);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.put("/:id/stock", updateProductStock);

module.exports = router;