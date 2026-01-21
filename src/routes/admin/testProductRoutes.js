// routes/admin/testProductRoute.js
const express = require("express");
const router = express.Router();
const Product = require("../../models/Product");

// Test route WITHOUT middleware
router.post("/test", async (req, res) => {
  try {
    console.log("=== TEST PRODUCT CREATION ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    // Create a VERY SIMPLE product first
    const simpleProduct = {
      name: "Test Product " + Date.now(),
      description: "Test description",
      category: "fresh_chicken",
      price: 100,
      images: ["https://example.com/test.jpg"],
      thumbnail: "https://example.com/test.jpg",
      stock: {
        quantity: 10,
        unit: "kg"
      },
      // Remove all optional fields for testing
      createdBy: "507f1f77bcf86cd799439011", // Dummy ObjectId
      lastUpdatedBy: "507f1f77bcf86cd799439011"
    };
    
    console.log("Creating simple product...");
    const product = new Product(simpleProduct);
    await product.save();
    
    res.json({
      success: true,
      message: "Test product created",
      product: {
        id: product._id,
        name: product.name,
        slug: product.slug
      }
    });
    
  } catch (error) {
    console.error("=== TEST ERROR DETAILS ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error stack:", error.stack);
    
    if (error.name === 'ValidationError') {
      console.error("Validation errors:", Object.values(error.errors).map(e => e.message));
    }
    
    res.status(500).json({
      success: false,
      message: "Test failed",
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      validationErrors: error.errors ? Object.values(error.errors).map(e => e.message) : undefined,
      stack: error.stack
    });
  }
});

module.exports = router;