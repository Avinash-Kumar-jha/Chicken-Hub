const Product = require("../../models/Product");

// @desc    Create new product
// @route   POST /api/admin/products
// @access  Private/Admin

const getAllProducts = async (req, res) => {
  try {
    // Add logic to fetch all products from database
    // Example using Mongoose:
    const products = await Product.find({})
      .sort({ createdAt: -1 })
      .select("-__v"); // Exclude version field

    return res.status(200).json({
      success: true,
      data: {
        products: products,
        total: products.length
      }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message
    });
  }
};
const createProduct = async (req, res) => {
  try {
    // Create new product instance
    const product = new Product(req.body);
    
    // Calculate and update rating if reviews are provided
    if (product.reviews && product.reviews.length > 0) {
      product.updateRating();
    }
    
    // Save the product
    await product.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

// @desc    Update product
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ❌ Remove dangerous fields
    const forbiddenFields = ["reviews", "rating", "totalSales", "views"];
    forbiddenFields.forEach(field => delete req.body[field]);

    // ✅ Update only allowed fields
    Object.assign(product, req.body);

    // ✅ Ensure reviews always exists
    if (!product.reviews) {
      product.reviews = [];
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });

  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

// @desc    Update product stock
// @route   PUT /api/admin/products/:id/stock
// @access  Private/Admin
const updateProductStock = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid stock quantity is required",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Update stock quantity
    product.stock.quantity = quantity;
    
    // Save (this will trigger pre-save middleware to update isInStock)
    await product.save();

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update Stock Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update stock",
      error: error.message,
    });
  }
};

module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
};