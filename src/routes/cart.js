// backend/routes/cart.js - COMPLETE VERSION
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId || decoded.id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// ============================================
// GET CART
// ============================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('cart');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      cart: user.cart || { items: [], totalItems: 0, totalPrice: 0 }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cart',
      error: error.message
    });
  }
});

// ============================================
// ADD TO CART
// ============================================
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { productId, quantity = 1, price, discountPrice, name, image, images, description } = req.body;

    console.log('Add to cart request:', { productId, quantity, price, name });

    if (!productId || !price || !name) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, price, and name are required'
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize cart if it doesn't exist
    if (!user.cart) {
      user.cart = { items: [], totalItems: 0, totalPrice: 0 };
    }

    // Check if product already exists in cart
    const existingItemIndex = user.cart.items.findIndex(
      item => item.productId.toString() === productId.toString()
    );

    if (existingItemIndex > -1) {
      // Update quantity
      user.cart.items[existingItemIndex].quantity += quantity;
      console.log('Updated existing item quantity');
    } else {
      // Add new item
      user.cart.items.push({
        productId: productId.toString(),
        name,
        price,
        discountPrice: discountPrice || price,
        image: image || (images && images[0]) || '',
        images: images || [],
        description: description || '',
        quantity,
        addedAt: new Date()
      });
      console.log('Added new item to cart');
    }

    // Update cart totals
    user.cart.totalItems = user.cart.items.reduce((sum, item) => sum + item.quantity, 0);
    user.cart.totalPrice = user.cart.items.reduce((sum, item) => {
      const itemPrice = item.discountPrice || item.price;
      return sum + (itemPrice * item.quantity);
    }, 0);
    user.cart.lastUpdated = new Date();

    await user.save();

    console.log('Cart saved successfully:', {
      totalItems: user.cart.totalItems,
      totalPrice: user.cart.totalPrice
    });

    res.status(200).json({
      success: true,
      message: 'Product added to cart',
      cart: user.cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding to cart',
      error: error.message
    });
  }
});

// ============================================
// UPDATE CART ITEM QUANTITY - THIS WAS MISSING!
// ============================================
router.put('/update/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    console.log('Update cart request:', { productId, quantity });

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize cart if it doesn't exist
    if (!user.cart) {
      user.cart = { items: [], totalItems: 0, totalPrice: 0 };
    }

    // Find the item in cart
    const itemIndex = user.cart.items.findIndex(
      item => item.productId.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Update quantity
    user.cart.items[itemIndex].quantity = quantity;

    // Update cart totals
    user.cart.totalItems = user.cart.items.reduce((sum, item) => sum + item.quantity, 0);
    user.cart.totalPrice = user.cart.items.reduce((sum, item) => {
      const itemPrice = item.discountPrice || item.price;
      return sum + (itemPrice * item.quantity);
    }, 0);
    user.cart.lastUpdated = new Date();

    await user.save();

    console.log('Cart updated successfully:', {
      productId,
      newQuantity: quantity,
      totalItems: user.cart.totalItems,
      totalPrice: user.cart.totalPrice
    });

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      cart: user.cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cart',
      error: error.message
    });
  }
});

// ============================================
// REMOVE FROM CART - THIS WAS MISSING!
// ============================================
router.delete('/remove/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;

    console.log('Remove from cart request:', { productId });

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize cart if it doesn't exist
    if (!user.cart) {
      user.cart = { items: [], totalItems: 0, totalPrice: 0 };
    }

    // Find and remove the item
    const initialLength = user.cart.items.length;
    user.cart.items = user.cart.items.filter(
      item => item.productId.toString() !== productId.toString()
    );

    if (user.cart.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Update cart totals
    user.cart.totalItems = user.cart.items.reduce((sum, item) => sum + item.quantity, 0);
    user.cart.totalPrice = user.cart.items.reduce((sum, item) => {
      const itemPrice = item.discountPrice || item.price;
      return sum + (itemPrice * item.quantity);
    }, 0);
    user.cart.lastUpdated = new Date();

    await user.save();

    console.log('Item removed from cart:', {
      productId,
      remainingItems: user.cart.items.length,
      totalItems: user.cart.totalItems,
      totalPrice: user.cart.totalPrice
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      cart: user.cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing from cart',
      error: error.message
    });
  }
});

// ============================================
// CLEAR CART - THIS WAS MISSING!
// ============================================
router.delete('/clear', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.cart = {
      items: [],
      totalItems: 0,
      totalPrice: 0,
      lastUpdated: new Date()
    };

    await user.save();

    console.log('Cart cleared for user:', req.userId);

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      cart: user.cart
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: error.message
    });
  }
});

// ============================================
// CHECKOUT PREP - Get cart items for checkout
// ============================================
router.get('/checkout', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('cart fullName email mobileno addresses');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.cart.items || user.cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Format cart items for order
    const cartItems = user.cart.items.map(item => ({
      product: item.productId,
      name: item.name,
      price: item.price,
      discountPrice: item.discountPrice,
      image: item.image,
      quantity: item.quantity,
      subtotal: (item.discountPrice || item.price) * item.quantity
    }));

    // Calculate totals
    const itemsTotal = user.cart.totalPrice;
    const deliveryCharge = itemsTotal > 500 ? 0 : 50;
    const totalAmount = itemsTotal + deliveryCharge;

    res.status(200).json({
      success: true,
      data: {
        user: {
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobileno
        },
        cart: user.cart,
        items: cartItems,
        totals: {
          itemsTotal,
          deliveryCharge,
          totalAmount
        },
        addresses: user.addresses || []
      }
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error preparing checkout',
      error: error.message
    });
  }
});

// ============================================
// CLEAR CART AFTER ORDER
// ============================================
router.post('/clear-after-order', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.cart.items = [];
    user.cart.totalItems = 0;
    user.cart.totalPrice = 0;
    user.cart.lastUpdated = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared after order'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: error.message
    });
  }
});

module.exports = router;