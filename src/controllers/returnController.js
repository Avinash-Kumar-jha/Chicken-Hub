const Return = require('../models/Returns');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const mongoose = require('mongoose');

// @desc    Initiate a return request
// @route   POST /api/returns/initiate
// @access  Private
const initiateReturn = asyncHandler(async (req, res) => {
  const { 
    orderId, 
    orderItemId, 
    productId, 
    quantity, 
    reason, 
    description,
    pickupAddress,
    refundPreference 
  } = req.body;

  // Validate required fields
  if (!orderId || !orderItemId || !productId || !quantity || !reason) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  // Check if order exists and belongs to user
  const order = await Order.findOne({
    _id: orderId,
    user: req.user._id,
    'items._id': orderItemId
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check if order is deliverable (within return window)
  const orderDate = new Date(order.createdAt);
  const currentDate = new Date();
  const daysDiff = Math.floor((currentDate - orderDate) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 7) {
    res.status(400);
    throw new Error('Return window expired. Returns allowed within 7 days of delivery');
  }

  // Check if item is already returned
  const existingReturn = await Return.findOne({
    orderId,
    orderItemId,
    status: { $nin: ['rejected', 'cancelled'] }
  });

  if (existingReturn) {
    res.status(400);
    throw new Error('Return already initiated for this item');
  }

  // Find the specific order item
  const orderItem = order.items.find(item => item._id.toString() === orderItemId);
  if (!orderItem) {
    res.status(404);
    throw new Error('Order item not found');
  }

  // Validate quantity
  if (quantity > orderItem.quantity) {
    res.status(400);
    throw new Error('Return quantity cannot exceed ordered quantity');
  }

  // Upload images if provided
  let returnImages = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const result = await uploadToCloudinary(file.path, 'returns');
      returnImages.push({
        url: result.secure_url,
        public_id: result.public_id
      });
    }
  }

  // Create return request
  const returnRequest = await Return.create({
    orderId,
    userId: req.user._id,
    productId,
    orderItemId,
    quantity,
    reason,
    description,
    images: returnImages,
    pickupAddress: pickupAddress || order.deliveryAddress, // Fixed: changed from shippingAddress to deliveryAddress
    refundMethod: refundPreference || 'original_payment',
    status: 'pending'
  });

  // Update order item status
  orderItem.returnStatus = 'requested';
  orderItem.returnRequestId = returnRequest._id;
  orderItem.returnReason = reason;
  orderItem.returnQuantity = quantity;
  await order.save();

  res.status(201).json({
    success: true,
    data: returnRequest,
    message: 'Return request submitted successfully'
  });
});

// @desc    Get user's return requests
// @route   GET /api/returns/my-returns
// @access  Private
const getUserReturns = asyncHandler(async (req, res) => {
  const returns = await Return.find({ userId: req.user._id })
    .sort('-createdAt')
    .populate('productId', 'name images price')
    .populate('orderId', 'orderNumber createdAt')
    .populate('pickupAgentId', 'name phone');

  res.json({
    success: true,
    count: returns.length,
    data: returns
  });
});

// @desc    Get single return request
// @route   GET /api/returns/:id
// @access  Private
const getReturnById = asyncHandler(async (req, res) => {
  const returnRequest = await Return.findById(req.params.id)
    .populate('productId', 'name images price category')
    .populate('orderId', 'orderNumber totalAmount paymentMethod createdAt')
    .populate('userId', 'name email phone')
    .populate('pickupAgentId', 'name phone vehicleNumber')
    .populate('exchangeProductId', 'name images price');

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  // Check authorization
  if (returnRequest.userId._id.toString() !== req.user._id.toString() && 
      req.user.role !== 'admin' && 
      req.user.role !== 'delivery_agent') {
    res.status(403);
    throw new Error('Not authorized');
  }

  res.json({
    success: true,
    data: returnRequest
  });
});

// @desc    Cancel return request
// @route   PUT /api/returns/:id/cancel
// @access  Private
const cancelReturn = asyncHandler(async (req, res) => {
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  // Check authorization
  if (returnRequest.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Check if cancellation is allowed
  if (!['pending', 'approved', 'pickup_scheduled'].includes(returnRequest.status)) {
    res.status(400);
    throw new Error('Cannot cancel return in current status');
  }

  returnRequest.status = 'cancelled';
  returnRequest.updatedAt = Date.now();
  await returnRequest.save();

  // Update order item status
  const order = await Order.findById(returnRequest.orderId);
  if (order) {
    const item = order.items.id(returnRequest.orderItemId);
    if (item) {
      item.returnStatus = null;
      item.returnRequestId = null;
      item.returnReason = null;
      item.returnQuantity = 0;
      await order.save();
    }
  }

  res.json({
    success: true,
    message: 'Return request cancelled successfully'
  });
});

// @desc    Schedule pickup
// @route   PUT /api/returns/:id/schedule-pickup
// @access  Private
const schedulePickup = asyncHandler(async (req, res) => {
  const { pickupDate, pickupTimeSlot } = req.body;
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  // Check authorization
  if (returnRequest.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (returnRequest.status !== 'approved') {
    res.status(400);
    throw new Error('Pickup can only be scheduled for approved returns');
  }

  // Validate pickup date (must be within next 7 days)
  const pickupDateObj = new Date(pickupDate);
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 7);

  if (pickupDateObj < today || pickupDateObj > maxDate) {
    res.status(400);
    throw new Error('Pickup date must be within next 7 days');
  }

  returnRequest.pickupDate = pickupDateObj;
  returnRequest.pickupTimeSlot = pickupTimeSlot;
  returnRequest.status = 'pickup_scheduled';
  returnRequest.updatedAt = Date.now();
  
  await returnRequest.save();

  res.json({
    success: true,
    message: 'Pickup scheduled successfully',
    data: returnRequest
  });
});

// @desc    Approve return request (Admin)
// @route   PUT /api/returns/:id/approve
// @access  Private/Admin
const approveReturn = asyncHandler(async (req, res) => {
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  if (returnRequest.status !== 'pending') {
    res.status(400);
    throw new Error('Return request is not in pending status');
  }

  // Calculate refund amount
  const order = await Order.findById(returnRequest.orderId);
  const orderItem = order.items.id(returnRequest.orderItemId);
  
  if (!orderItem) {
    res.status(404);
    throw new Error('Order item not found');
  }

  const refundAmount = (orderItem.price * returnRequest.quantity) - 
                      (orderItem.price * returnRequest.quantity * 0.1); // 10% restocking fee

  returnRequest.status = 'approved';
  returnRequest.refundAmount = Math.max(0, refundAmount);
  returnRequest.estimatedRefundDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  returnRequest.adminNotes.push({
    note: `Return approved by admin. Refund amount: ₹${refundAmount}`,
    adminId: req.user._id
  });
  returnRequest.updatedAt = Date.now();
  
  await returnRequest.save();

  // Update order item status
  orderItem.returnStatus = 'approved';
  orderItem.refundAmount = refundAmount;
  await order.save();

  res.json({
    success: true,
    message: 'Return request approved',
    data: returnRequest
  });
});

// @desc    Reject return request (Admin)
// @route   PUT /api/returns/:id/reject
// @access  Private/Admin
const rejectReturn = asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body;
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  if (returnRequest.status !== 'pending') {
    res.status(400);
    throw new Error('Return request is not in pending status');
  }

  if (!rejectionReason) {
    res.status(400);
    throw new Error('Please provide rejection reason');
  }

  returnRequest.status = 'rejected';
  returnRequest.rejectionReason = rejectionReason;
  returnRequest.adminNotes.push({
    note: `Return rejected. Reason: ${rejectionReason}`,
    adminId: req.user._id
  });
  returnRequest.updatedAt = Date.now();
  
  await returnRequest.save();

  // Update order item status
  const order = await Order.findById(returnRequest.orderId);
  const orderItem = order.items.id(returnRequest.orderItemId);
  if (orderItem) {
    orderItem.returnStatus = 'rejected';
    await order.save();
  }

  res.json({
    success: true,
    message: 'Return request rejected',
    data: returnRequest
  });
});

// @desc    Assign pickup agent (Admin)
// @route   PUT /api/returns/:id/assign-agent
// @access  Private/Admin
const assignPickupAgent = asyncHandler(async (req, res) => {
  const { agentId } = req.body;
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  if (!['approved', 'pickup_scheduled'].includes(returnRequest.status)) {
    res.status(400);
    throw new Error('Agent can only be assigned to approved or scheduled returns');
  }

  returnRequest.pickupAgentId = agentId;
  returnRequest.status = 'pickup_scheduled';
  returnRequest.adminNotes.push({
    note: `Pickup agent assigned`,
    adminId: req.user._id
  });
  returnRequest.updatedAt = Date.now();
  
  await returnRequest.save();

  res.json({
    success: true,
    message: 'Pickup agent assigned successfully',
    data: returnRequest
  });
});

// @desc    Update pickup status (Delivery Agent)
// @route   PUT /api/returns/:id/pickup-status
// @access  Private/DeliveryAgent
const updatePickupStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  // Check if agent is assigned
  if (returnRequest.pickupAgentId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not assigned to this pickup');
  }

  const validStatuses = ['pickup_completed', 'in_transit_to_warehouse'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid status update');
  }

  returnRequest.status = status;
  if (notes) {
    returnRequest.adminNotes.push({
      note: `Delivery Agent: ${notes}`,
      adminId: req.user._id
    });
  }
  returnRequest.updatedAt = Date.now();
  
  await returnRequest.save();

  // Update order item status if pickup completed
  if (status === 'pickup_completed') {
    const order = await Order.findById(returnRequest.orderId);
    const orderItem = order.items.id(returnRequest.orderItemId);
    if (orderItem) {
      orderItem.returnStatus = 'pickup_completed';
      await order.save();
    }
  }

  res.json({
    success: true,
    message: 'Pickup status updated',
    data: returnRequest
  });
});

// @desc    Update quality check (Admin/Warehouse)
// @route   PUT /api/returns/:id/quality-check
// @access  Private/Admin
const updateQualityCheck = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  if (!['received_at_warehouse', 'in_transit_to_warehouse'].includes(returnRequest.status)) {
    res.status(400);
    throw new Error('Product not yet received at warehouse');
  }

  const validStatuses = ['quality_check_passed', 'quality_check_failed'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid quality check status');
  }

  returnRequest.status = status;
  returnRequest.qualityCheckNotes = notes;
  returnRequest.adminNotes.push({
    note: `Quality check: ${status}. Notes: ${notes}`,
    adminId: req.user._id
  });
  returnRequest.updatedAt = Date.now();
  
  await returnRequest.save();

  // Update order item status
  const order = await Order.findById(returnRequest.orderId);
  const orderItem = order.items.id(returnRequest.orderItemId);
  if (orderItem) {
    orderItem.returnStatus = status;
    await order.save();
  }

  res.json({
    success: true,
    message: 'Quality check updated',
    data: returnRequest
  });
});

// @desc    Initiate refund (Admin)
// @route   PUT /api/returns/:id/initiate-refund
// @access  Private/Admin
const initiateRefund = asyncHandler(async (req, res) => {
  const { transactionId } = req.body;
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  if (returnRequest.status !== 'quality_check_passed') {
    res.status(400);
    throw new Error('Refund can only be initiated after quality check passed');
  }

  returnRequest.status = 'refund_initiated';
  returnRequest.refundTransactionId = transactionId;
  returnRequest.refundDate = new Date();
  returnRequest.adminNotes.push({
    note: `Refund initiated. Transaction ID: ${transactionId}`,
    adminId: req.user._id
  });
  returnRequest.updatedAt = Date.now();
  
  await returnRequest.save();

  // Update order item status
  const order = await Order.findById(returnRequest.orderId);
  const orderItem = order.items.id(returnRequest.orderItemId);
  if (orderItem) {
    orderItem.returnStatus = 'refund_initiated';
    await order.save();
  }

  // TODO: Integrate with payment gateway to process actual refund

  res.json({
    success: true,
    message: 'Refund initiated successfully',
    data: returnRequest
  });
});

// @desc    Initiate exchange (Admin)
// @route   PUT /api/returns/:id/initiate-exchange
// @access  Private/Admin
const initiateExchange = asyncHandler(async (req, res) => {
  const { exchangeProductId, exchangeSize, exchangeColor } = req.body;
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  if (returnRequest.status !== 'quality_check_passed') {
    res.status(400);
    throw new Error('Exchange can only be initiated after quality check passed');
  }

  // Check if exchange product exists
  const exchangeProduct = await Product.findById(exchangeProductId);
  if (!exchangeProduct) {
    res.status(404);
    throw new Error('Exchange product not found');
  }

  returnRequest.status = 'exchange_initiated';
  returnRequest.exchangeProductId = exchangeProductId;
  returnRequest.exchangeSize = exchangeSize;
  returnRequest.exchangeColor = exchangeColor;
  returnRequest.adminNotes.push({
    note: `Exchange initiated for product: ${exchangeProduct.name}`,
    adminId: req.user._id
  });
  returnRequest.updatedAt = Date.now();
  
  await returnRequest.save();

  // Update order item status
  const order = await Order.findById(returnRequest.orderId);
  const orderItem = order.items.id(returnRequest.orderItemId);
  if (orderItem) {
    orderItem.returnStatus = 'exchange_initiated';
    await order.save();
  }

  res.json({
    success: true,
    message: 'Exchange initiated successfully',
    data: returnRequest
  });
});

// @desc    Get all returns for admin
// @route   GET /api/returns/admin/all
// @access  Private/Admin
const getAdminReturns = asyncHandler(async (req, res) => {
  const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
  
  const filter = {};
  
  if (status && status !== 'all') {
    filter.status = status;
  }
  
  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const skip = (page - 1) * limit;

  const returns = await Return.find(filter)
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit))
    .populate('userId', 'name email')
    .populate('productId', 'name images')
    .populate('orderId', 'orderNumber');

  const total = await Return.countDocuments(filter);

  res.json({
    success: true,
    count: returns.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: returns
  });
});

// @desc    Get return statistics
// @route   GET /api/returns/analytics/stats
// @access  Private/Admin
const getReturnStats = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const stats = await Return.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: null,
        totalReturns: { $sum: 1 },
        totalRefundAmount: { $sum: '$refundAmount' },
        pendingReturns: {
          $sum: { $cond: [{ $in: ['$status', ['pending', 'approved', 'pickup_scheduled']] }, 1, 0] }
        },
        completedReturns: {
          $sum: { $cond: [{ $in: ['$status', ['refund_completed', 'exchange_delivered']] }, 1, 0] }
        }
      }
    }
  ]);

  const statusDistribution = await Return.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const reasonDistribution = await Return.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    success: true,
    data: {
      overall: stats[0] || {},
      statusDistribution,
      reasonDistribution
    }
  });
});

// @desc    Add admin note
// @route   POST /api/returns/:id/notes
// @access  Private/Admin
const addAdminNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  if (!note) {
    res.status(400);
    throw new Error('Note is required');
  }

  returnRequest.adminNotes.push({
    note,
    adminId: req.user._id
  });
  await returnRequest.save();

  res.json({
    success: true,
    message: 'Note added successfully',
    data: returnRequest.adminNotes
  });
});

// @desc    Update return request (General update)
// @route   PUT /api/returns/:id
// @access  Private/Admin
const updateReturn = asyncHandler(async (req, res) => {
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  // Only admin can update return
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  const allowedUpdates = [
    'status',
    'refundAmount',
    'pickupDate',
    'pickupTimeSlot',
    'pickupAgentId',
    'qualityCheckNotes',
    'rejectionReason',
    'estimatedRefundDate'
  ];

  // Filter only allowed updates
  const updates = Object.keys(req.body).filter(key => allowedUpdates.includes(key));
  
  updates.forEach(update => {
    returnRequest[update] = req.body[update];
  });

  returnRequest.updatedAt = Date.now();
  
  // Add admin note about the update
  if (updates.length > 0) {
    returnRequest.adminNotes.push({
      note: `Return updated by admin. Changes: ${updates.join(', ')}`,
      adminId: req.user._id
    });
  }

  await returnRequest.save();

  // Update order item status if return status changed
  if (req.body.status) {
    const order = await Order.findById(returnRequest.orderId);
    const orderItem = order.items.id(returnRequest.orderItemId);
    if (orderItem) {
      orderItem.returnStatus = req.body.status;
      await order.save();
    }
  }

  res.json({
    success: true,
    message: 'Return updated successfully',
    data: returnRequest
  });
});

// @desc    Upload return images
// @route   POST /api/returns/:id/upload-images
// @access  Private
const uploadReturnImages = asyncHandler(async (req, res) => {
  const returnRequest = await Return.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  // Check authorization
  if (returnRequest.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Check if return is in a state that allows image upload
  if (!['pending', 'approved'].includes(returnRequest.status)) {
    res.status(400);
    throw new Error('Images can only be uploaded for pending or approved returns');
  }

  // Upload images if provided
  let newImages = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const result = await uploadToCloudinary(file.path, 'returns');
      newImages.push({
        url: result.secure_url,
        public_id: result.public_id
      });
    }

    // Add to existing images
    returnRequest.images = [...returnRequest.images, ...newImages];
    returnRequest.updatedAt = Date.now();
    await returnRequest.save();
  }

  res.json({
    success: true,
    message: 'Images uploaded successfully',
    data: {
      images: returnRequest.images,
      newImages
    }
  });
});

// @desc    Get return analytics overview
// @route   GET /api/returns/analytics/overview
// @access  Private/Admin
const getReturnAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const matchStage = {};
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const analytics = await Return.aggregate([
    {
      $match: matchStage
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        count: { $sum: 1 },
        totalRefundAmount: { $sum: "$refundAmount" },
        averageRefundAmount: { $avg: "$refundAmount" }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const topReturnReasons = await Return.aggregate([
    {
      $match: matchStage
    },
    {
      $group: {
        _id: "$reason",
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 5
    }
  ]);

  const statusTimeline = await Return.aggregate([
    {
      $match: matchStage
    },
    {
      $group: {
        _id: {
          status: "$status",
          date: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" }
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.date": 1, "_id.status": 1 }
    }
  ]);

  res.json({
    success: true,
    data: {
      dailyAnalytics: analytics,
      topReturnReasons,
      statusTimeline
    }
  });
});

module.exports = {
  initiateReturn,
  getUserReturns,
  getReturnById,
  updateReturn, // Fixed: Added this function
  cancelReturn,
  schedulePickup,
  updatePickupStatus,
  approveReturn,
  rejectReturn,
  updateQualityCheck,
  initiateRefund,
  initiateExchange, // Fixed: Added this function
  getAdminReturns,
  assignPickupAgent,
  addAdminNote,
  getReturnAnalytics, // Fixed: Added this function
  getReturnStats,
  uploadReturnImages // Fixed: Added this function
};