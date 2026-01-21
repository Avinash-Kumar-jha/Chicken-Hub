
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const express = require('express');
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');



router.post('/:productId/reviews', protect, async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment, images, orderId } = req.body;
    const userId = req.user._id;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: userId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Verify purchase if orderId provided
    let verifiedPurchase = false;
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        user: userId,
        'items.product': productId,
        status: { $in: ['DELIVERED', 'COMPLETED'] }
      });
      
      if (order) {
        verifiedPurchase = true;
      }
    }

    // Create review
    const review = await Review.create({
      product: productId,
      user: userId,
      order: orderId || undefined,
      rating,
      title: title || '',
      comment,
      images: images || [],
      verifiedPurchase,
      status: 'approved' // Auto-approve or set to 'pending' for moderation
    });

    // Populate user details
    await review.populate('user', 'fullName');

    // Update product rating
    const ratingStats = await Review.getAverageRating(productId);
    await Product.findByIdAndUpdate(productId, {
      'rating.average': ratingStats.averageRating,
      'rating.totalReviews': ratingStats.totalReviews,
      'rating.ratingsBreakdown': {
        fiveStar: ratingStats.ratingDistribution[5],
        fourStar: ratingStats.ratingDistribution[4],
        threeStar: ratingStats.ratingDistribution[3],
        twoStar: ratingStats.ratingDistribution[2],
        oneStar: ratingStats.ratingDistribution[1]
      }
    });

    // Add review to user's review history
    const user = await User.findById(userId);
    if (user) {
      user.reviews.push({
        productId: productId,
        rating,
        comment,
        reviewDate: new Date()
      });
      await user.save();
    }

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: review
    });

  } catch (error) {
    console.error('❌ Error adding review:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/:productId/reviews
// @desc    Get all reviews for a product
// @access  Public
router.get('/:productId/reviews', async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'newest',
      rating,
      verifiedOnly
    } = req.query;

    // Build filter
    const filter = {
      product: productId,
      status: 'approved'
    };

    if (rating) {
      filter.rating = Number(rating);
    }

    if (verifiedOnly === 'true') {
      filter.verifiedPurchase = true;
    }

    // Build sort
    const sortOptions = {
      'newest': { createdAt: -1 },
      'oldest': { createdAt: 1 },
      'highest': { rating: -1 },
      'lowest': { rating: 1 },
      'helpful': { helpful: -1 }
    };

    const sort = sortOptions[sortBy] || { createdAt: -1 };

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Fetch reviews
    const [reviews, totalReviews, ratingStats] = await Promise.all([
      Review.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'fullName')
        .populate('adminResponse.respondedBy', 'fullName'),
      Review.countDocuments(filter),
      Review.getAverageRating(productId)
    ]);

    const totalPages = Math.ceil(totalReviews / limitNum);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total: totalReviews,
      page: pageNum,
      totalPages,
      ratingStats,
      data: reviews
    });

  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/products/:productId/reviews/:reviewId
// @desc    Update a review
// @access  Private (own reviews only)
router.put('/:productId/reviews/:reviewId', protect, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user._id;

    const review = await Review.findOne({
      _id: reviewId,
      user: userId
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or unauthorized'
      });
    }

    // Update fields
    if (rating) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment) review.comment = comment;
    if (images) review.images = images;

    // Reset status to pending if modified
    review.status = 'pending';

    await review.save();

    // Update product rating
    const ratingStats = await Review.getAverageRating(review.product);
    await Product.findByIdAndUpdate(review.product, {
      'rating.average': ratingStats.averageRating,
      'rating.totalReviews': ratingStats.totalReviews,
      'rating.ratingsBreakdown': {
        fiveStar: ratingStats.ratingDistribution[5],
        fourStar: ratingStats.ratingDistribution[4],
        threeStar: ratingStats.ratingDistribution[3],
        twoStar: ratingStats.ratingDistribution[2],
        oneStar: ratingStats.ratingDistribution[1]
      }
    });

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });

  } catch (error) {
    console.error('❌ Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/products/:productId/reviews/:reviewId
// @desc    Delete a review
// @access  Private (own reviews only)
router.delete('/:productId/reviews/:reviewId', protect, async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findOneAndDelete({
      _id: reviewId,
      user: userId,
      product: productId
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or unauthorized'
      });
    }

    // Update product rating
    const ratingStats = await Review.getAverageRating(productId);
    await Product.findByIdAndUpdate(productId, {
      'rating.average': ratingStats.averageRating,
      'rating.totalReviews': ratingStats.totalReviews,
      'rating.ratingsBreakdown': {
        fiveStar: ratingStats.ratingDistribution[5],
        fourStar: ratingStats.ratingDistribution[4],
        threeStar: ratingStats.ratingDistribution[3],
        twoStar: ratingStats.ratingDistribution[2],
        oneStar: ratingStats.ratingDistribution[1]
      }
    });

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/products/:productId/reviews/:reviewId/helpful
// @desc    Mark review as helpful
// @access  Private
router.post('/:productId/reviews/:reviewId/helpful', protect, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user already marked as helpful
    const alreadyMarked = review.helpfulBy.some(id => id.toString() === userId.toString());

    if (alreadyMarked) {
      // Remove helpful mark
      review.helpfulBy = review.helpfulBy.filter(id => id.toString() !== userId.toString());
      review.helpful = Math.max(0, review.helpful - 1);
    } else {
      // Add helpful mark
      review.helpfulBy.push(userId);
      review.helpful += 1;
    }

    await review.save();

    res.status(200).json({
      success: true,
      message: alreadyMarked ? 'Helpful mark removed' : 'Marked as helpful',
      data: {
        helpful: review.helpful,
        isMarkedHelpful: !alreadyMarked
      }
    });

  } catch (error) {
    console.error('❌ Error marking review helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/:productId/reviews/stats
// @desc    Get review statistics for a product
// @access  Public
router.get('/:productId/reviews/stats', async (req, res) => {
  try {
    const { productId } = req.params;

    const ratingStats = await Review.getAverageRating(productId);

    res.status(200).json({
      success: true,
      data: ratingStats
    });

  } catch (error) {
    console.error('❌ Error fetching review stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;