// controllers/feedbackController.js
const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const { sendFeedbackResponseEmail } = require('../utils/sendEmail');

// @desc    Submit feedback
// @route   POST /api/feedback
// @access  Private
exports.submitFeedback = async (req, res) => {
  try {
    const {
      orderId,
      orderNumber,
      overallRating,
      deliveryRating,
      productRating,
      packagingRating,
      comment,
      suggestions,
      categories,
      recommend
    } = req.body;

    const userId = req.user._id;

    // Validate required fields
    if (!orderId || !orderNumber || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate ratings
    if (!overallRating || !deliveryRating || !productRating || !packagingRating) {
      return res.status(400).json({
        success: false,
        message: 'All ratings are required'
      });
    }

    // Validate comment length
    if (comment.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be at least 10 characters'
      });
    }

    // Validate order exists and belongs to user
    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      status: { $in: ['DELIVERED', 'COMPLETED'] }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not eligible for feedback'
      });
    }

    // Check if feedback already exists for this order
    const existingFeedback = await Feedback.findOne({
      user: userId,
      order: orderId
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this order'
      });
    }

    // Create feedback
    const feedback = await Feedback.create({
      user: userId,
      order: orderId,
      orderNumber,
      overallRating: parseInt(overallRating),
      deliveryRating: parseInt(deliveryRating),
      productRating: parseInt(productRating),
      packagingRating: parseInt(packagingRating),
      comment: comment.trim(),
      suggestions: suggestions ? suggestions.trim() : '',
      categories: categories || [],
      recommend: recommend !== undefined ? recommend : true,
      metadata: {
        device: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    // Update order with feedback status
    order.hasFeedback = true;
    await order.save();

    // Populate user details
    await feedback.populate('user', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });

  } catch (error) {
    console.error('❌ Error submitting feedback:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this order'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's feedback
// @route   GET /api/feedback/user
// @access  Private
exports.getUserFeedback = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [feedbacks, totalFeedbacks] = await Promise.all([
      Feedback.find({ user: userId })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: 'order',
          select: 'orderNumber totalAmount status createdAt'
        })
        .select('-metadata -helpfulBy'),
      Feedback.countDocuments({ user: userId })
    ]);

    const totalPages = Math.ceil(totalFeedbacks / limitNum);

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      total: totalFeedbacks,
      page: pageNum,
      totalPages,
      data: feedbacks
    });

  } catch (error) {
    console.error('❌ Error fetching user feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get feedback by ID
// @route   GET /api/feedback/:id
// @access  Private
exports.getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('user', 'fullName email avatar')
      .populate('order', 'orderNumber totalAmount status deliveryAddress createdAt')
      .populate('adminResponse.respondedBy', 'fullName');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user owns this feedback or is admin
    if (feedback.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this feedback'
      });
    }

    res.status(200).json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('❌ Error fetching feedback:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update feedback
// @route   PUT /api/feedback/:id
// @access  Private
exports.updateFeedback = async (req, res) => {
  try {
    const { comment, suggestions, categories, recommend } = req.body;

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user owns this feedback
    if (feedback.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this feedback'
      });
    }

    // Check if feedback can be updated (only within 24 hours)
    const hoursSinceCreation = (new Date() - feedback.createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be updated within 24 hours of submission'
      });
    }

    // Only allow updating certain fields
    const updates = {};
    if (comment !== undefined) {
      if (comment.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Comment must be at least 10 characters'
        });
      }
      updates.comment = comment.trim();
    }
    if (suggestions !== undefined) updates.suggestions = suggestions.trim();
    if (categories !== undefined) updates.categories = categories;
    if (recommend !== undefined) updates.recommend = recommend;

    // Update feedback
    const updatedFeedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('user', 'fullName email');

    res.status(200).json({
      success: true,
      message: 'Feedback updated successfully',
      data: updatedFeedback
    });

  } catch (error) {
    console.error('❌ Error updating feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user owns this feedback or is admin
    if (feedback.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this feedback'
      });
    }

    // Update order's feedback status
    await Order.findByIdAndUpdate(feedback.order, { hasFeedback: false });

    // Delete feedback
    await feedback.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get feedback statistics
// @route   GET /api/feedback/stats
// @access  Private (Admin)
exports.getFeedbackStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const [averageRatings, categoryDistribution, statusCount, recentFeedback] = await Promise.all([
      Feedback.getAverageRatings(),
      Feedback.getCategoryDistribution(),
      Feedback.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Feedback.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'fullName avatar')
        .populate('order', 'orderNumber')
        .select('orderNumber overallRating comment status createdAt')
    ]);

    // Format status count
    const statusMap = {
      pending: 0,
      reviewed: 0,
      actioned: 0,
      resolved: 0
    };

    statusCount.forEach(item => {
      statusMap[item._id] = item.count;
    });

    // Calculate response time (average hours to respond)
    const responseTime = await Feedback.aggregate([
      {
        $match: {
          'adminResponse.respondedAt': { $exists: true }
        }
      },
      {
        $addFields: {
          responseHours: {
            $divide: [
              { $subtract: ['$adminResponse.respondedAt', '$createdAt'] },
              1000 * 60 * 60
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseHours: { $avg: '$responseHours' }
        }
      }
    ]);

    // Get recent feedback count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCount = await Feedback.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        averageRatings,
        categoryDistribution,
        status: statusMap,
        recentFeedback,
        recentCount,
        responseTime: responseTime[0]?.avgResponseHours || 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching feedback stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Mark feedback as helpful
// @route   POST /api/feedback/:id/helpful
// @access  Private
exports.markHelpful = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const userId = req.user._id;

    const feedback = await Feedback.findById(feedbackId);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user is trying to mark their own feedback as helpful
    if (feedback.user.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark your own feedback as helpful'
      });
    }

    // Check if user already marked as helpful
    const alreadyMarked = feedback.helpfulBy?.some(id => 
      id.toString() === userId.toString()
    );

    let isHelpful;
    let message;

    if (alreadyMarked) {
      // Remove helpful mark
      feedback.helpfulBy = feedback.helpfulBy.filter(id => 
        id.toString() !== userId.toString()
      );
      feedback.helpfulCount = Math.max(0, feedback.helpfulCount - 1);
      isHelpful = false;
      message = 'Helpful mark removed';
    } else {
      // Add helpful mark
      if (!feedback.helpfulBy) {
        feedback.helpfulBy = [];
      }
      feedback.helpfulBy.push(userId);
      feedback.helpfulCount += 1;
      isHelpful = true;
      message = 'Marked as helpful';
    }

    await feedback.save();

    res.status(200).json({
      success: true,
      message,
      data: {
        helpfulCount: feedback.helpfulCount,
        isHelpful
      }
    });

  } catch (error) {
    console.error('❌ Error marking feedback helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Admin: Add response to feedback
// @route   POST /api/feedback/:id/respond
// @access  Private (Admin)
exports.addAdminResponse = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { message } = req.body;

    if (!message || message.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Response message must be at least 5 characters'
      });
    }

    const feedback = await Feedback.findById(req.params.id)
      .populate('user', 'email fullName');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Add admin response
    feedback.adminResponse = {
      message: message.trim(),
      respondedBy: req.user._id,
      respondedAt: new Date()
    };

    feedback.status = 'reviewed';
    await feedback.save();

    // Send email notification to user
    try {
      if (feedback.user.email) {
        await sendFeedbackResponseEmail({
          to: feedback.user.email,
          userName: feedback.user.fullName,
          orderNumber: feedback.orderNumber,
          adminResponse: feedback.adminResponse.message
        });
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    // Populate admin details
    await feedback.populate('adminResponse.respondedBy', 'fullName');

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: feedback
    });

  } catch (error) {
    console.error('❌ Error adding admin response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add response',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Admin: Update feedback status
// @route   PUT /api/feedback/:id/status
// @access  Private (Admin)
exports.updateFeedbackStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { status } = req.body;

    if (!['pending', 'reviewed', 'actioned', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'fullName email');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Feedback status updated to ${status}`,
      data: feedback
    });

  } catch (error) {
    console.error('❌ Error updating feedback status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all feedback (Admin)
// @route   GET /api/feedback
// @access  Private (Admin)
exports.getAllFeedback = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { 
      page = 1, 
      limit = 20, 
      status, 
      sort = '-createdAt',
      search 
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } },
        { 'user.fullName': { $regex: search, $options: 'i' } }
      ];
    }

    const [feedbacks, totalFeedbacks] = await Promise.all([
      Feedback.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'fullName email avatar')
        .populate('order', 'orderNumber totalAmount')
        .populate('adminResponse.respondedBy', 'fullName')
        .select('-metadata -helpfulBy'),
      Feedback.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalFeedbacks / limitNum);

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      total: totalFeedbacks,
      page: pageNum,
      totalPages,
      data: feedbacks
    });

  } catch (error) {
    console.error('❌ Error fetching all feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};