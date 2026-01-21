// controllers/delivery/deliveryOrdersController.js - UPDATED
const Order = require('../../models/Order');
const DeliveryPerson = require('../../models/DeliveryPerson');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Helper function to send SMS via Twilio
const sendOTPSMS = async (phoneNumber, otp, orderNumber, deliveryPersonName, amount) => {
  try {
    // For testing, log the SMS instead of sending
    console.log('📱 SMS would be sent to:', phoneNumber);
    console.log('📝 Message:');
    console.log(`Your OTP for order #${orderNumber} delivery is ${otp}.`);
    console.log(`Please share this OTP with the delivery person to confirm delivery.`);
    console.log(`Delivery Person: ${deliveryPersonName}`);
    console.log(`Order Amount: ₹${amount}`);
    
    // In production, uncomment and configure Twilio:
    /*
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber}`;
    
    const message = await client.messages.create({
      body: `Your OTP for order #${orderNumber} delivery is ${otp}. Please share this OTP with the delivery person to confirm delivery.\n\nDelivery Person: ${deliveryPersonName}\nOrder Amount: ₹${amount}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    
    return { success: true, messageId: message.sid };
    */
    
    return { success: true, messageId: 'SIMULATED_SMS_ID' };
  } catch (error) {
    console.error('❌ SMS sending error:', error);
    return { success: false, error: error.message };
  }
};

// @desc    Get assigned orders for delivery person
// @route   GET /api/delivery/orders/assigned
// @access  Private (Delivery)
exports.getAssignedOrders = async (req, res) => {
  try {
    console.log('🔍 Getting assigned orders for delivery person:', req.deliveryPerson.id);

    // Get orders with specific statuses
    const orders = await Order.find({
      assignedTo: req.deliveryPerson.id,
      orderStatus: { $in: ['processing', 'packed', 'shipped', 'out_for_delivery'] }
    })
      .populate('user', 'fullName email mobileno')
      .populate('items.product', 'name price image')
      .sort({ createdAt: -1 });

    console.log('✅ Found orders with valid statuses:', orders.length);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    console.error('❌ Get Assigned Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single order details
// @route   GET /api/delivery/orders/:orderId
// @access  Private (Delivery)
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log('🔍 Getting order details for:', orderId);

    let order;

    // Check if orderId is a valid ObjectId or orderNumber
    if (mongoose.Types.ObjectId.isValid(orderId) && orderId.length === 24) {
      order = await Order.findById(orderId)
        .populate('user', 'fullName email mobileno')
        .populate('items.product', 'name price image description')
        .populate('assignedTo', 'name email phone');
    } else {
      order = await Order.findOne({ orderNumber: orderId })
        .populate('user', 'fullName email mobileno')
        .populate('items.product', 'name price image description')
        .populate('assignedTo', 'name email phone');
    }

    if (!order) {
      console.log('❌ Order not found');
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Convert both to strings for comparison
    const orderAssignedToId = order.assignedTo?._id?.toString() || order.assignedTo?.toString();
    const deliveryPersonId = req.deliveryPerson.id.toString();
    
    // Check if this order is assigned to this delivery person
    if (orderAssignedToId !== deliveryPersonId) {
      console.log('❌ Not assigned to this delivery person');
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    console.log('✅ Order details retrieved successfully');

    res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('❌ Get Order Details Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Accept order (change status to Out for Delivery)
// @route   PUT /api/delivery/orders/:orderId/accept
// @access  Private (Delivery)
exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    let order;
    
    // Check if orderId is ObjectId or orderNumber
    if (mongoose.Types.ObjectId.isValid(orderId) && orderId.length === 24) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ orderNumber: orderId });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Convert to strings for comparison
    const orderAssignedToId = order.assignedTo?.toString();
    const deliveryPersonId = req.deliveryPerson.id.toString();

    // Check if assigned to this delivery person
    if (orderAssignedToId !== deliveryPersonId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    // Check if order is already accepted
    if (order.orderStatus === 'out_for_delivery') {
      return res.status(200).json({
        success: true,
        message: 'Order already accepted',
        data: order
      });
    }

    // Check if order is in correct status
    if (!['processing', 'packed', 'shipped'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be accepted. Current status: ${order.orderStatus}`,
        allowedStatuses: ['processing', 'packed', 'shipped'],
        currentStatus: order.orderStatus
      });
    }

    // Update order status to out_for_delivery
    order.orderStatus = 'out_for_delivery';
    
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: 'out_for_delivery',
      timestamp: new Date(),
      note: `Accepted by ${req.deliveryPerson.name}`
    });

    await order.save();

    // Ensure delivery person has this order in active orders
    await DeliveryPerson.findByIdAndUpdate(
      req.deliveryPerson.id,
      { $addToSet: { activeOrders: order._id } }
    );

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: order
    });

  } catch (error) {
    console.error('Accept Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Send OTP to customer for delivery verification
// @route   POST /api/delivery/orders/:orderId/send-otp
// @access  Private (Delivery)
exports.sendDeliveryOTP = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log('📱 Sending OTP for order:', orderId);
    
    let order;
    
    // Check if orderId is ObjectId or orderNumber
    if (mongoose.Types.ObjectId.isValid(orderId) && orderId.length === 24) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ orderNumber: orderId });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Convert to strings for comparison
    const orderAssignedToId = order.assignedTo?.toString();
    const deliveryPersonId = req.deliveryPerson.id.toString();

    // Check if assigned to this delivery person
    if (orderAssignedToId !== deliveryPersonId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    // Check if order is out for delivery
    if (order.orderStatus !== 'out_for_delivery') {
      return res.status(400).json({
        success: false,
        message: 'Order must be out for delivery to send OTP'
      });
    }

    // Check if customer has mobile number
    const customerPhone = order.deliveryAddress?.mobile;
    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Customer mobile number not found'
      });
    }

    // Check cooldown period (2 minutes)
    if (order.deliveryOTPSentAt) {
      const lastSent = new Date(order.deliveryOTPSentAt);
      const now = new Date();
      const cooldown = (now - lastSent) / 1000 / 60; // in minutes
      
      if (cooldown < 2) {
        const waitTime = Math.ceil((2 - cooldown) * 60);
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting another OTP',
          retryAfter: waitTime
        });
      }
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    order.deliveryOTP = otp;
    order.deliveryOTPSentAt = new Date();
    order.deliveryOTPVerified = false;
    order.deliveryOTPAttempts = 0;
    
    // Send SMS to customer
    const smsResult = await sendOTPSMS(
      customerPhone,
      otp,
      order.orderNumber,
      req.deliveryPerson.name,
      order.totalAmount
    );
    
    if (!smsResult.success) {
      // If SMS fails, don't save OTP
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP SMS',
        error: smsResult.error
      });
    }
    
    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: `OTP sent to customer for delivery verification`
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to customer',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        otpSent: true,
        customerPhone: customerPhone,
        sentAt: new Date(),
        deliveryPerson: req.deliveryPerson.name,
        otp: otp // Only included for testing/development
      }
    });

  } catch (error) {
    console.error('❌ Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify OTP and mark order as delivered
// @route   PUT /api/delivery/orders/:orderId/deliver
// @access  Private (Delivery)
exports.deliverOrder = async (req, res) => {
  try {
    const { otp } = req.body;
    const { orderId } = req.params;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide OTP'
      });
    }

    let order;
    
    // Check if orderId is ObjectId or orderNumber
    if (mongoose.Types.ObjectId.isValid(orderId) && orderId.length === 24) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ orderNumber: orderId });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Convert to strings for comparison
    const orderAssignedToId = order.assignedTo?.toString();
    const deliveryPersonId = req.deliveryPerson.id.toString();

    // Check if assigned to this delivery person
    if (orderAssignedToId !== deliveryPersonId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    // Check if order is out for delivery
    if (order.orderStatus !== 'out_for_delivery') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be delivered. Current status: ${order.orderStatus}`
      });
    }

    // Check if OTP exists
    if (!order.deliveryOTP) {
      return res.status(400).json({
        success: false,
        message: 'No OTP generated for this order'
      });
    }

    // Check if OTP is expired (10 minutes)
    const otpSentAt = new Date(order.deliveryOTPSentAt);
    const now = new Date();
    const otpAge = (now - otpSentAt) / 1000 / 60; // in minutes

    if (otpAge > 10) {
      // Clear expired OTP
      order.deliveryOTP = null;
      order.deliveryOTPSentAt = null;
      await order.save();

      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please generate a new OTP.'
      });
    }

    // Verify OTP
    if (order.deliveryOTP !== otp) {
      // Track failed attempts
      order.deliveryOTPAttempts = (order.deliveryOTPAttempts || 0) + 1;
      
      if (order.deliveryOTPAttempts >= 3) {
        order.deliveryOTP = null;
        order.deliveryOTPSentAt = null;
        order.deliveryOTPAttempts = 0;
        
        // Add to status history
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({
          status: order.orderStatus,
          timestamp: new Date(),
          note: 'OTP verification failed 3 times. OTP reset.'
        });
      }
      
      await order.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        attempts: order.deliveryOTPAttempts,
        attemptsRemaining: 3 - (order.deliveryOTPAttempts || 0)
      });
    }

    // OTP is valid - mark as verified
    order.deliveryOTPVerified = true;
    order.deliveryOTPVerifiedAt = new Date();
    
    // Update order status to delivered
    order.orderStatus = 'delivered';
    order.deliveredAt = new Date();
    
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: 'delivered',
      timestamp: new Date(),
      note: `Delivered by ${req.deliveryPerson.name}. OTP verified successfully.`
    });

    await order.save();

    // Update delivery person stats
    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id);
    
    // Calculate delivery earnings
    const deliveryEarnings = order.deliveryCharge || 50;
    
    deliveryPerson.completedDeliveries += 1;
    deliveryPerson.totalEarnings += deliveryEarnings;
    deliveryPerson.todayEarnings += deliveryEarnings;
    
    // Remove from active orders
    deliveryPerson.activeOrders = deliveryPerson.activeOrders.filter(
      orderId => orderId.toString() !== order._id.toString()
    );

    await deliveryPerson.save();

    res.status(200).json({
      success: true,
      message: 'Order delivered successfully',
      data: {
        order,
        earnings: deliveryEarnings,
        totalEarnings: deliveryPerson.totalEarnings,
        completedDeliveries: deliveryPerson.completedDeliveries
      }
    });

  } catch (error) {
    console.error('Deliver Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get OTP status for an order
// @route   GET /api/delivery/orders/:orderId/otp-status
// @access  Private (Delivery)
exports.getOTPStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    let order;
    
    // Check if orderId is ObjectId or orderNumber
    if (mongoose.Types.ObjectId.isValid(orderId) && orderId.length === 24) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ orderNumber: orderId });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Convert to strings for comparison
    const orderAssignedToId = order.assignedTo?.toString();
    const deliveryPersonId = req.deliveryPerson.id.toString();

    // Check if assigned to this delivery person
    if (orderAssignedToId !== deliveryPersonId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    const otpStatus = {
      hasOTP: !!order.deliveryOTP,
      verified: order.deliveryOTPVerified || false,
      sentAt: order.deliveryOTPSentAt,
      verifiedAt: order.deliveryOTPVerifiedAt,
      attempts: order.deliveryOTPAttempts || 0
    };

    // Check if OTP is expired
    if (order.deliveryOTPSentAt) {
      const otpSentAt = new Date(order.deliveryOTPSentAt);
      const now = new Date();
      const otpAge = (now - otpSentAt) / 1000 / 60; // in minutes
      otpStatus.isExpired = otpAge > 10;
      otpStatus.expiresIn = Math.max(0, Math.floor((10 - otpAge) * 60)); // in seconds
    }

    // Check if can resend
    if (order.deliveryOTPSentAt) {
      const lastSent = new Date(order.deliveryOTPSentAt);
      const now = new Date();
      const cooldown = (now - lastSent) / 1000 / 60; // in minutes
      otpStatus.canResend = cooldown >= 2;
      otpStatus.retryAfter = cooldown < 2 ? Math.ceil((2 - cooldown) * 60) : 0;
    }

    res.status(200).json({
      success: true,
      data: otpStatus
    });

  } catch (error) {
    console.error('❌ Get OTP Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Resend OTP to customer
// @route   POST /api/delivery/orders/:orderId/resend-otp
// @access  Private (Delivery)
exports.resendOTP = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // First clear any existing OTP
    let order;
    
    if (mongoose.Types.ObjectId.isValid(orderId) && orderId.length === 24) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ orderNumber: orderId });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Convert to strings for comparison
    const orderAssignedToId = order.assignedTo?.toString();
    const deliveryPersonId = req.deliveryPerson.id.toString();

    // Check if assigned to this delivery person
    if (orderAssignedToId !== deliveryPersonId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    // Check if order is out for delivery
    if (order.orderStatus !== 'out_for_delivery') {
      return res.status(400).json({
        success: false,
        message: 'Order must be out for delivery to resend OTP'
      });
    }

    // Clear old OTP
    order.deliveryOTP = null;
    order.deliveryOTPSentAt = null;
    order.deliveryOTPVerified = false;
    order.deliveryOTPAttempts = 0;
    
    await order.save();
    
    // Now send new OTP
    return exports.sendDeliveryOTP(req, res);

  } catch (error) {
    console.error('❌ Resend OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Report issue with order
// @route   POST /api/delivery/orders/:orderId/report
// @access  Private (Delivery)
exports.reportIssue = async (req, res) => {
  try {
    const { issueType, description } = req.body;
    const { orderId } = req.params;

    if (!issueType || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide issue type and description'
      });
    }

    let order;
    
    // Check if orderId is ObjectId or orderNumber
    if (mongoose.Types.ObjectId.isValid(orderId) && orderId.length === 24) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ orderNumber: orderId });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Convert to strings for comparison
    const orderAssignedToId = order.assignedTo?.toString();
    const deliveryPersonId = req.deliveryPerson.id.toString();

    // Check if assigned to this delivery person
    if (orderAssignedToId !== deliveryPersonId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    // Add issue to order
    if (!order.issues) {
      order.issues = [];
    }

    order.issues.push({
      reportedBy: 'delivery',
      deliveryPerson: req.deliveryPerson.id,
      issueType,
      description,
      reportedAt: new Date(),
      status: 'pending'
    });

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: `Issue reported: ${issueType} - ${description}`
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Issue reported successfully. Support team will contact you soon.',
      data: order
    });

  } catch (error) {
    console.error('Report Issue Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get delivery history
// @route   GET /api/delivery/orders/history
// @access  Private (Delivery)
exports.getDeliveryHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({
      assignedTo: req.deliveryPerson.id,
      orderStatus: 'delivered'
    })
      .populate('user', 'fullName email mobileno')
      .sort({ deliveredAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({
      assignedTo: req.deliveryPerson.id,
      orderStatus: 'delivered'
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: orders
    });

  } catch (error) {
    console.error('Get Delivery History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get OTP for order (TESTING ONLY - Remove in production)
// @route   GET /api/delivery/orders/:orderId/otp
// @access  Private (Delivery)
exports.getOrderOTP = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    let order;
    
    // Check if orderId is ObjectId or orderNumber
    if (mongoose.Types.ObjectId.isValid(orderId) && orderId.length === 24) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ orderNumber: orderId });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Convert to strings for comparison
    const orderAssignedToId = order.assignedTo?.toString();
    const deliveryPersonId = req.deliveryPerson.id.toString();

    // Check if assigned to this delivery person
    if (orderAssignedToId !== deliveryPersonId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    res.status(200).json({
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      otp: order.deliveryOTP,
      sentAt: order.deliveryOTPSentAt,
      verified: order.deliveryOTPVerified,
      note: '⚠️ This endpoint is for TESTING ONLY. Remove in production!'
    });

  } catch (error) {
    console.error('Get OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};