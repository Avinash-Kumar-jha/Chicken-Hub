// controllers/orderController.js - COMPLETE FIXED VERSION
const mongoose = require('mongoose')
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
let razorpay;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized successfully');
  } else {
    console.warn('⚠️ Razorpay credentials not found in .env file');
  }
} catch (error) {
  console.error('❌ Razorpay initialization failed:', error.message);
}

// ==================== HELPER: Update User Recent Orders - FIXED ====================
const updateUserRecentOrders = async (userId, orderId, totalAmount, orderStatus, orderNumber, itemsCount) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      console.warn('⚠️ User not found for updating recent orders:', userId);
      return;
    }

    // Create recent order entry with ALL required fields
    const recentOrderEntry = {
      orderId: orderId,
      orderNumber: orderNumber || `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random() * 10000)}`,
      orderDate: new Date(),
      totalAmount: totalAmount,
      status: orderStatus,
      itemsCount: itemsCount || 1
    };

    console.log('📝 Adding recent order to user:', userId);
    console.log('📦 Recent order data:', recentOrderEntry);

    // Add to recent orders array (keep only last 10)
    user.recentOrders.unshift(recentOrderEntry); // Add to beginning
    if (user.recentOrders.length > 10) {
      user.recentOrders = user.recentOrders.slice(0, 10);
    }

    // Update order statistics
    user.orderStats.totalOrders += 1;
    user.orderStats.totalSpent += totalAmount;
    user.orderStats.lastOrderDate = new Date();
    
    // Calculate average order value
    if (user.orderStats.totalOrders > 0) {
      user.orderStats.averageOrderValue = user.orderStats.totalSpent / user.orderStats.totalOrders;
    }

    await user.save();
    console.log('✅ User recent orders updated successfully');
    console.log('📊 User stats:', user.orderStats);
    console.log('🛒 Recent orders count:', user.recentOrders.length);
    
    // Verify the recent order was added
    const savedUser = await User.findById(userId);
    console.log('🔍 Verification - Recent orders after save:', savedUser.recentOrders.length);
  } catch (error) {
    console.error('❌ Error updating user recent orders:', error);
    console.error('Error details:', error.message);
    throw error; // Re-throw to handle in calling function
  }
};

// ==================== HELPER: Find Order by ID or Order Number ====================
const findOrderByAnyId = (id, userId = null) => {
  if (!id) return null;

  let query = {};

  if (mongoose.Types.ObjectId.isValid(id)) {
    query._id = id;
  } else {
    query.orderNumber = id;
  }

  if (userId) {
    query.user = userId;
  }

  return Order.findOne(query);
};

// ==================== HELPER: Generate Order Number ====================
const generateOrderNumber = async () => {
  try {
    return await Order.generateOrderNumber();
  } catch (error) {
    console.error('Error generating order number:', error);
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    return `ORD-${year}${month}${day}-${random}`;
  }
};

// ==================== CREATE ORDER (Generic - for all payment methods) ====================
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      items,
      deliveryAddress,
      itemsTotal,
      deliveryCharge,
      discount,
      couponCode,
      couponDiscount,
      tax,
      totalAmount,
      paymentMethod = 'cod',
      customerNotes,
    } = req.body;

    console.log('📦 Creating order for user:', userId);
    console.log('🛍️ Items count:', items?.length);

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty. Please add items to cart.',
      });
    }

    if (!deliveryAddress || !deliveryAddress.fullName || !deliveryAddress.mobile) {
      return res.status(400).json({
        success: false,
        message: 'Complete delivery address is required.',
      });
    }

    // Validate payment method
    const validPaymentMethods = ['cod', 'online'];
    if (!validPaymentMethods.includes(paymentMethod.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Use 'cod' or 'online'.`,
      });
    }

    // Check COD amount limit
    const MAX_COD_AMOUNT = 10000;
    if (paymentMethod.toLowerCase() === 'cod' && totalAmount > MAX_COD_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `COD not available for orders above ₹${MAX_COD_AMOUNT}. Please use online payment.`,
      });
    }

    // Validate stock availability
    for (const item of items) {
      const product = await Product.findById(item.product || item.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.name} not found.`,
        });
      }

      if (!product.stock?.isInStock || product.stock.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is not available in requested quantity.`,
        });
      }
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();
    console.log('🔢 Generated order number:', orderNumber);

    // Determine payment status based on payment method
    const paymentStatus = paymentMethod.toLowerCase() === 'cod' ? 'pending' : 'paid';

    // Create order
    const order = new Order({
      user: userId,
      orderNumber,
      items: items.map(item => ({
        product: item.product || item.productId,
        name: item.name || item.title,
        image: item.image || item.images?.[0],
        quantity: item.quantity,
        weight: item.weight,
        price: item.price || item.unitPrice,
        subtotal: (item.price || item.unitPrice) * item.quantity,
      })),
      deliveryAddress,
      itemsTotal,
      deliveryCharge: deliveryCharge || 0,
      discount: discount || 0,
      couponCode,
      couponDiscount: couponDiscount || 0,
      tax: tax || 0,
      totalAmount,
      paymentMethod: paymentMethod.toLowerCase(),
      paymentStatus,
      orderStatus: 'confirmed',
      customerNotes,
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          note: 'Order placed',
        },
        {
          status: 'confirmed',
          timestamp: new Date(),
          note: paymentMethod.toLowerCase() === 'cod' ? 'COD order confirmed' : 'Order confirmed',
        },
      ],
    });

    await order.save();
    console.log('✅ Order created in database:', order.orderNumber);

    // Update product stock
    for (const item of items) {
      const product = await Product.findById(item.product || item.productId);
      if (product) {
        product.stock.quantity -= item.quantity;
        if (product.stock.quantity <= 0) {
          product.stock.isInStock = false;
        }
        await product.save();
      }
    }

    // ============================================
    // FIXED: UPDATE USER'S RECENT ORDERS AND ORDER STATS
    // ============================================
    console.log('🔄 Updating user recent orders...');
    await updateUserRecentOrders(
      userId, 
      order._id, 
      totalAmount, 
      order.orderStatus, 
      order.orderNumber,
      items.length
    );

    // Clear user's cart
    await User.findByIdAndUpdate(userId, {
      $set: {
        'cart.items': [],
        'cart.totalItems': 0,
        'cart.totalPrice': 0,
        'cart.lastUpdated': new Date()
      }
    });

    // Populate order details
    await order.populate('user', 'fullName email mobileno');
    await order.populate('items.product', 'name images category');

    res.status(201).json({
      success: true,
      message: `Order placed successfully (${paymentMethod.toUpperCase()})`,
      data: order,
    });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
};

// ==================== UPDATE ORDER STATUS ====================
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Update order status
    const oldStatus = order.orderStatus;
    order.orderStatus = status;
    
    // Add to status history
    order.statusHistory.push({
      status: status,
      timestamp: new Date(),
      note: note || `Status changed from ${oldStatus} to ${status}`,
      updatedBy: req.user.id
    });

    await order.save();

    // ============================================
    // UPDATE USER'S RECENT ORDERS STATUS
    // ============================================
    const user = await User.findById(order.user);
    
    if (user) {
      const orderIndex = user.recentOrders.findIndex(
        ro => ro.orderId && ro.orderId.toString() === orderId
      );
      
      if (orderIndex !== -1) {
        user.recentOrders[orderIndex].status = status;
        await user.save();
        console.log('✅ User recent order status updated');
      } else {
        // If order not in recentOrders, add it
        console.log('📝 Order not found in recent orders, adding it...');
        await updateUserRecentOrders(
          user._id,
          order._id,
          order.totalAmount,
          status,
          order.orderNumber,
          order.items.length
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message,
    });
  }
};

// ==================== CREATE RAZORPAY ORDER ====================
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    const userId = req.user.id;

    console.log('💳 Creating Razorpay order for user:', userId);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Amount must be greater than 0.',
      });
    }

    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please contact support.',
      });
    }

    const timestamp = Date.now().toString();
    const randomStr = Math.random().toString(36).substring(2, 7);
    const shortUserId = userId.toString().slice(-8);
    
    let receipt = `receipt_${timestamp}_${randomStr}_${shortUserId}`;
    
    if (receipt.length > 40) {
      receipt = receipt.substring(0, 40);
    }
    
    console.log('Generated receipt:', receipt);

    const amountInPaise = Math.round(parseFloat(amount) * 100);
    
    if (amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least ₹1.00',
      });
    }

    const options = {
      amount: amountInPaise,
      currency,
      receipt,
      payment_capture: 1,
      notes: {
        userId: userId,
        purpose: 'ChickenHub Order Payment'
      }
    };

    console.log('Creating Razorpay order with options:', options);

    const razorpayOrder = await razorpay.orders.create(options);
    console.log('✅ Razorpay order created:', razorpayOrder.id);

    res.status(200).json({
      success: true,
      message: 'Razorpay order created successfully',
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        receipt: razorpayOrder.receipt,
        notes: razorpayOrder.notes,
      },
    });
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.error?.description || 'Invalid payment request',
        details: error.error,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message,
      details: error.error || error.description,
    });
  }
};

// ==================== VERIFY RAZORPAY PAYMENT & CREATE ORDER ====================
const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData,
    } = req.body;

    const userId = req.user.id;

    console.log('🔐 Verifying Razorpay payment:', razorpay_payment_id);
    console.log('📦 Order data items count:', orderData?.items?.length);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification details',
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.log('❌ Payment verification failed - Invalid signature');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.',
      });
    }

    console.log('✅ Payment signature verified successfully');

    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order data',
      });
    }

    // Validate stock availability
    for (const item of orderData.items) {
      const product = await Product.findById(item.product || item.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.name} not found.`,
        });
      }

      if (!product.stock?.isInStock || product.stock.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is not available in requested quantity.`,
        });
      }
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();
    console.log('🔢 Generated order number:', orderNumber);

    // Create order in database
    const order = new Order({
      user: userId,
      orderNumber,
      items: orderData.items.map(item => ({
        product: item.product || item.productId,
        name: item.name || item.title,
        image: item.image || item.images?.[0],
        quantity: item.quantity,
        weight: item.weight,
        price: item.price || item.unitPrice,
        subtotal: (item.price || item.unitPrice) * item.quantity,
      })),
      deliveryAddress: orderData.deliveryAddress || orderData.shippingAddress,
      itemsTotal: orderData.itemsTotal || orderData.subtotal,
      deliveryCharge: orderData.deliveryCharge || orderData.shipping || 0,
      discount: orderData.discount || 0,
      couponCode: orderData.couponCode,
      couponDiscount: orderData.couponDiscount || 0,
      tax: orderData.tax || 0,
      totalAmount: orderData.totalAmount,
      paymentMethod: 'online',
      paymentStatus: 'paid',
      paymentDetails: {
        transactionId: razorpay_payment_id,
        paymentGateway: 'Razorpay',
        paidAt: new Date(),
      },
      orderStatus: 'confirmed',
      customerNotes: orderData.customerNotes,
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          note: 'Order placed',
        },
        {
          status: 'confirmed',
          timestamp: new Date(),
          note: 'Payment successful via Razorpay',
        },
      ],
    });

    await order.save();
    console.log('✅ Order created after payment:', order.orderNumber);

    // Update product stock
    for (const item of orderData.items) {
      const product = await Product.findById(item.product || item.productId);
      if (product) {
        product.stock.quantity -= item.quantity;
        if (product.stock.quantity <= 0) {
          product.stock.isInStock = false;
        }
        await product.save();
      }
    }

    // ============================================
    // FIXED: UPDATE USER'S RECENT ORDERS AND ORDER STATS
    // ============================================
    console.log('🔄 Updating user recent orders after payment...');
    await updateUserRecentOrders(
      userId, 
      order._id, 
      orderData.totalAmount, 
      order.orderStatus, 
      order.orderNumber,
      orderData.items.length
    );

    // Clear user's cart
    await User.findByIdAndUpdate(userId, {
      $set: {
        'cart.items': [],
        'cart.totalItems': 0,
        'cart.totalPrice': 0,
        'cart.lastUpdated': new Date()
      }
    });

    // Populate order details
    await order.populate('user', 'fullName email mobileno');
    await order.populate('items.product', 'name images category');

    res.status(200).json({
      success: true,
      message: 'Payment verified and order created successfully',
      data: order,
    });
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
    });
  }
};

// ==================== CREATE COD ORDER ====================
const createCODOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      items,
      deliveryAddress,
      itemsTotal,
      deliveryCharge,
      discount,
      couponCode,
      couponDiscount,
      tax,
      totalAmount,
      customerNotes,
    } = req.body;

    console.log('💵 Creating COD order for user:', userId);
    console.log('🛍️ Items count:', items?.length);

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty. Please add items to cart.',
      });
    }

    if (!deliveryAddress || !deliveryAddress.fullName || !deliveryAddress.mobile) {
      return res.status(400).json({
        success: false,
        message: 'Complete delivery address is required.',
      });
    }

    const MAX_COD_AMOUNT = 10000;
    if (totalAmount > MAX_COD_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `COD not available for orders above ₹${MAX_COD_AMOUNT}. Please use online payment.`,
      });
    }

    // Check stock availability
    for (const item of items) {
      const product = await Product.findById(item.product || item.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.name} not found.`,
        });
      }

      if (!product.stock?.isInStock || product.stock.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is not available in requested quantity.`,
        });
      }
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();
    console.log('🔢 Generated order number:', orderNumber);

    // Create COD order
    const order = new Order({
      user: userId,
      orderNumber,
      items: items.map(item => ({
        product: item.product || item.productId,
        name: item.name || item.title,
        image: item.image || item.images?.[0],
        quantity: item.quantity,
        weight: item.weight,
        price: item.price || item.unitPrice,
        subtotal: (item.price || item.unitPrice) * item.quantity,
      })),
      deliveryAddress,
      itemsTotal,
      deliveryCharge: deliveryCharge || 0,
      discount: discount || 0,
      couponCode,
      couponDiscount: couponDiscount || 0,
      tax: tax || 0,
      totalAmount,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'confirmed',
      customerNotes,
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          note: 'Order placed',
        },
        {
          status: 'confirmed',
          timestamp: new Date(),
          note: 'COD order confirmed',
        },
      ],
    });

    await order.save();
    console.log('✅ COD order created:', order.orderNumber);

    // Update product stock
    for (const item of items) {
      const product = await Product.findById(item.product || item.productId);
      if (product) {
        product.stock.quantity -= item.quantity;
        if (product.stock.quantity <= 0) {
          product.stock.isInStock = false;
        }
        await product.save();
      }
    }

    // ============================================
    // FIXED: UPDATE USER'S RECENT ORDERS AND ORDER STATS
    // ============================================
    console.log('🔄 Updating user recent orders for COD...');
    await updateUserRecentOrders(
      userId, 
      order._id, 
      totalAmount, 
      order.orderStatus, 
      order.orderNumber,
      items.length
    );

    // Clear user's cart
    await User.findByIdAndUpdate(userId, {
      $set: {
        'cart.items': [],
        'cart.totalItems': 0,
        'cart.totalPrice': 0,
        'cart.lastUpdated': new Date()
      }
    });

    // Populate order details
    await order.populate('user', 'fullName email mobileno');
    await order.populate('items.product', 'name images category');

    res.status(201).json({
      success: true,
      message: 'COD order placed successfully',
      data: order,
    });
  } catch (error) {
    console.error('❌ Error creating COD order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place COD order',
      error: error.message,
    });
  }
};

// ==================== GET USER ORDERS ====================
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10, sort = '-createdAt' } = req.query;

    console.log('📋 Fetching orders for user:', userId);

    const query = { user: userId };
    
    if (status) {
      query.orderStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .populate('items.product', 'name images price category')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(query);

    console.log(`✅ Found ${orders.length} orders`);

    res.status(200).json({
      success: true,
      message: 'Orders fetched successfully',
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalOrders,
        ordersPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
};

// ==================== GET ORDER BY ID ====================
const getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id || req.params.orderId;

    console.log("🔍 Fetching order:", orderId);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const order = await findOrderByAnyId(orderId)
      .populate("user", "fullName email mobileno")
      .populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("❌ Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

// ==================== CANCEL ORDER ====================
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const { cancellationReason } = req.body;

    console.log('🚫 Cancelling order:', orderId);

    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (!order.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled. Current status: ${order.orderStatus}`,
      });
    }

    order.orderStatus = 'cancelled';
    order.cancellationReason = cancellationReason || 'Cancelled by customer';
    order.cancelledAt = new Date();
    order.cancelledBy = userId;
    
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: cancellationReason || 'Cancelled by customer',
      updatedBy: userId,
    });

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 'stock.quantity': item.quantity },
        $set: { 'stock.isInStock': true }
      });
    }

    await order.save();
    
    // Update user's recent orders status
    const user = await User.findById(userId);
    if (user) {
      const orderIndex = user.recentOrders.findIndex(
        ro => ro.orderId && ro.orderId.toString() === orderId
      );
      if (orderIndex !== -1) {
        user.recentOrders[orderIndex].status = 'cancelled';
        await user.save();
      }
    }
    
    console.log('✅ Order cancelled successfully');

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message,
    });
  }
};

// ==================== TRACK ORDER ====================
const trackOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    console.log('📍 Tracking order:', orderId);

    const order = await Order.findOne({ _id: orderId, user: userId })
      .select('orderNumber orderStatus statusHistory estimatedDeliveryTime deliveredAt trackingNumber trackingUrl')
      .populate('assignedTo', 'fullName mobileno');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const trackingInfo = {
      orderNumber: order.orderNumber,
      currentStatus: order.orderStatus,
      statusHistory: order.statusHistory,
      estimatedDelivery: order.estimatedDeliveryTime,
      deliveredAt: order.deliveredAt,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      deliveryPerson: order.assignedTo,
    };

    console.log('✅ Tracking info retrieved');

    res.status(200).json({
      success: true,
      message: 'Order tracking info fetched successfully',
      data: trackingInfo,
    });
  } catch (error) {
    console.error('❌ Error tracking order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track order',
      error: error.message,
    });
  }
};

// ==================== RETURN ORDER ====================
const returnOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const { returnReason } = req.body;

    console.log('↩️ Processing return for order:', orderId);

    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (!order.canBeReturned()) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be returned. Return window expired or order not delivered.',
      });
    }

    order.orderStatus = 'returned';
    order.statusHistory.push({
      status: 'returned',
      timestamp: new Date(),
      note: returnReason || 'Returned by customer',
      updatedBy: userId,
    });

    await order.save();
    
    // Update user's recent orders status
    const user = await User.findById(userId);
    if (user) {
      const orderIndex = user.recentOrders.findIndex(
        ro => ro.orderId && ro.orderId.toString() === orderId
      );
      if (orderIndex !== -1) {
        user.recentOrders[orderIndex].status = 'returned';
        await user.save();
      }
    }
    
    console.log('✅ Return request submitted');

    res.status(200).json({
      success: true,
      message: 'Return request submitted successfully',
      data: order,
    });
  } catch (error) {
    console.error('❌ Error returning order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process return',
      error: error.message,
    });
  }
};

// ==================== ADD ORDER REVIEW ====================
const addOrderReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const { rating, review } = req.body;

    console.log('⭐ Adding review for order:', orderId);

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Can only review delivered orders',
      });
    }

    order.rating = rating;
    order.review = review;
    order.reviewedAt = new Date();

    await order.save();
    console.log('✅ Review added successfully');

    res.status(200).json({
      success: true,
      message: 'Review added successfully',
      data: order,
    });
  } catch (error) {
    console.error('❌ Error adding review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review',
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  updateOrderStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  createCODOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  trackOrder,
  returnOrder,
  addOrderReview,
};