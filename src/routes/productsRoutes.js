// routes/productsRoutes.js
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware'); // Changed from authMiddleware to protect

// Rate limiter for public product routes
const rateLimit = require('express-rate-limit');
const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== PRODUCT ROUTES WITH FILTERING ====================

// @route   GET /api/products
// @desc    Get all products with filtering, sorting, and pagination
// @access  Public
router.get('/', productLimiter, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subCategory,
      minPrice,
      maxPrice,
      inStock,
      isFeatured,
      isBestSeller,
      search,
      sortBy = 'newest',
      sortOrder = 'desc',
      minRating,
      maxRating,
      tags,
      preparationType,
      cut,
      stockStatus,
      hasOffer,
      priceRange
    } = req.query;

    // Build filter object
    let filter = { isActive: true };

    // 1. CATEGORY FILTER
    if (category) {
      const categoryMap = {
        'Fresh Chicken': 'fresh_chicken',
        'Marinated': 'marinated',
        'Curry Cut': 'curry_cut',
        'Ready to Cook': 'ready_to_cook',
        'fresh_chicken': 'fresh_chicken',
        'marinated': 'marinated',
        'curry_cut': 'curry_cut',
        'ready_to_cook': 'ready_to_cook'
      };
      
      const backendCategory = categoryMap[category] || category;
      filter.category = backendCategory;
    }

    // 2. SUBCATEGORY FILTER
    if (subCategory) {
      filter.subCategory = { $regex: new RegExp(subCategory, 'i') };
    }

    // 3. PRICE RANGE FILTER
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // 4. STOCK FILTER
    if (inStock === 'true') {
      filter['stock.isInStock'] = true;
    } else if (inStock === 'false') {
      filter['stock.isInStock'] = false;
    }

    // 5. FEATURED & BESTSELLER FILTERS
    if (isFeatured === 'true') filter.isFeatured = true;
    if (isBestSeller === 'true') filter.isBestSeller = true;

    // 6. SEARCH FILTER
    if (search) {
      filter.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { description: { $regex: new RegExp(search, 'i') } },
        { tags: { $regex: new RegExp(search, 'i') } }
      ];
    }

    // 7. RATING FILTER
    if (minRating || maxRating) {
      filter['rating.average'] = {};
      if (minRating) filter['rating.average'].$gte = Number(minRating);
      if (maxRating) filter['rating.average'].$lte = Number(maxRating);
    }

    // 8. TAGS FILTER
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // 9. PREPARATION TYPE FILTER
    if (preparationType) {
      filter['specifications.preparationType'] = preparationType;
    }

    // 10. CUT FILTER
    if (cut) {
      filter['specifications.cut'] = cut;
    }

    // 11. STOCK STATUS FILTER
    if (stockStatus) {
      switch (stockStatus) {
        case 'inStock':
          filter['stock.isInStock'] = true;
          break;
        case 'lowStock':
          filter['stock.quantity'] = { $lte: 10, $gt: 0 };
          filter['stock.isInStock'] = true;
          break;
        case 'outOfStock':
          filter['stock.isInStock'] = false;
          break;
      }
    }

    // 12. OFFER FILTER
    if (hasOffer === 'true') {
      filter['offer.isActive'] = true;
    }

    // 13. PRICE RANGE CATEGORY FILTER
    if (priceRange) {
      if (!filter.price) filter.price = {};
      switch (priceRange) {
        case 'budget':
          filter.price.$lt = 200;
          break;
        case 'mid':
          filter.price.$gte = 200;
          filter.price.$lte = 500;
          break;
        case 'premium':
          filter.price.$gt = 500;
          break;
      }
    }

    // Build sort object
    const sortOptions = {
      'newest': { createdAt: -1 },
      'oldest': { createdAt: 1 },
      'price-low-high': { price: 1 },
      'price-high-low': { price: -1 },
      'popular': { 'rating.average': -1, totalSales: -1 },
      'name-asc': { name: 1 },
      'name-desc': { name: -1 },
      'discount': { discountPercentage: -1 },
      'featured': { isFeatured: -1, createdAt: -1 }
    };

    let sort = sortOptions[sortBy] || { createdAt: -1 };
    
    if (sortBy && !sortOptions[sortBy]) {
      sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('-__v -reviews -createdBy -lastUpdatedBy'),
      Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalProducts / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Transform data for frontend
    const transformedProducts = products.map(product => ({
      id: product._id,
      _id: product._id,
      name: product.name,
      description: product.description,
      category: product.category,
      subCategory: product.subCategory,
      price: product.price,
      discountedPrice: product.discountedPrice,
      discountPercent: product.discountPercentage || 0,
      images: product.images,
      thumbnail: product.thumbnail,
      stock: product.stock.quantity,
      unit: product.stock.unit,
      isInStock: product.stock.isInStock,
      rating: product.rating.average,
      totalReviews: product.rating.totalReviews,
      isFeatured: product.isFeatured,
      isBestSeller: product.isBestSeller,
      tags: product.tags,
      specifications: product.specifications,
      offer: product.offer,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    // Get unique categories
    const categories = await Product.distinct('category', { isActive: true });
    const frontendCategories = categories.map(cat => ({
      backend: cat,
      frontend: cat.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }));

    res.status(200).json({
      success: true,
      count: products.length,
      total: totalProducts,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage,
      hasPrevPage,
      data: transformedProducts,
      filters: {
        categories: frontendCategories,
        priceRange: {
          min: 0,
          max: 1000,
          average: 350
        },
        availableFilters: {
          categories: categories,
          preparationTypes: await Product.distinct('specifications.preparationType', { isActive: true }),
          cuts: await Product.distinct('specifications.cut', { isActive: true }),
          tags: await Product.distinct('tags', { isActive: true })
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/categories
// @desc    Get all product categories with counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      { 
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalProducts: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const transformedCategories = categories.map(cat => ({
      id: cat._id,
      name: cat._id.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      slug: cat._id,
      count: cat.count,
      backendValue: cat._id
    }));

    res.status(200).json({
      success: true,
      count: categories.length,
      data: transformedCategories
    });

  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/filters/options
// @desc    Get all available filter options
// @access  Public
router.get('/filters/options', async (req, res) => {
  try {
    const [
      categories,
      preparationTypes,
      cuts,
      tags,
      priceStats
    ] = await Promise.all([
      Product.distinct('category', { isActive: true }),
      Product.distinct('specifications.preparationType', { isActive: true }),
      Product.distinct('specifications.cut', { isActive: true }),
      Product.distinct('tags', { isActive: true }),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            avgPrice: { $avg: '$price' }
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        categories: categories.map(cat => ({
          value: cat,
          label: cat.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        })),
        preparationTypes: preparationTypes.filter(Boolean).map(type => ({
          value: type,
          label: type
        })),
        cuts: cuts.filter(Boolean).map(cut => ({
          value: cut,
          label: cut
        })),
        tags: tags.filter(Boolean),
        priceRange: priceStats[0] || { minPrice: 0, maxPrice: 1000, avgPrice: 350 }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching filter options',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/search/suggestions
// @desc    Get search suggestions
// @access  Public
router.get('/search/suggestions', async (req, res) => {
  try {
    const { query, limit = 5 } = req.query;

    if (!query || query.length < 2) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const suggestions = await Product.aggregate([
      {
        $match: {
          isActive: true,
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { tags: { $regex: query, $options: 'i' } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          category: 1,
          price: 1,
          discountedPrice: 1,
          thumbnail: 1,
          score: {
            $cond: [
              { $regexMatch: { input: '$name', regex: query, options: 'i' } },
              2,
              1
            ]
          }
        }
      },
      { $sort: { score: -1, 'rating.average': -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('❌ Error fetching search suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .select('-__v -createdBy -lastUpdatedBy');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count
    product.views += 1;
    await product.save();

    res.status(200).json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('❌ Error fetching product:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/category/:category
// @desc    Get products by specific category
// @access  Public
router.get('/category/:category', productLimiter, async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12, sortBy = 'newest' } = req.query;

    const categoryMap = {
      'fresh-chicken': 'fresh_chicken',
      'marinated': 'marinated',
      'curry-cut': 'curry_cut',
      'ready-to-cook': 'ready_to_cook'
    };

    const backendCategory = categoryMap[category] || category;

    const filter = {
      isActive: true,
      category: backendCategory
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {
      'newest': { createdAt: -1 },
      'price-low-high': { price: 1 },
      'price-high-low': { price: -1 },
      'popular': { 'rating.average': -1 }
    };

    const sort = sortOptions[sortBy] || { createdAt: -1 };

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('-__v'),
      Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalProducts / limitNum);

    res.status(200).json({
      success: true,
      category: backendCategory,
      count: products.length,
      total: totalProducts,
      page: pageNum,
      limit: limitNum,
      totalPages,
      data: products
    });

  } catch (error) {
    console.error('❌ Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching category products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const featuredProducts = await Product.find({
      isActive: true,
      isFeatured: true
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('name price discountedPrice thumbnail category rating');

    res.status(200).json({
      success: true,
      count: featuredProducts.length,
      data: featuredProducts
    });

  } catch (error) {
    console.error('❌ Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/bestsellers
// @desc    Get bestseller products
// @access  Public
router.get('/bestsellers', async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const bestsellers = await Product.find({
      isActive: true,
      isBestSeller: true
    })
      .sort({ totalSales: -1 })
      .limit(parseInt(limit))
      .select('name price discountedPrice thumbnail category rating totalSales');

    res.status(200).json({
      success: true,
      count: bestsellers.length,
      data: bestsellers
    });

  } catch (error) {
    console.error('❌ Error fetching bestsellers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bestsellers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/deals
// @desc    Get products with active deals/offers
// @access  Public
router.get('/deals', async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const deals = await Product.find({
      isActive: true,
      'offer.isActive': true,
      discountedPrice: { $exists: true, $lt: '$price' }
    })
      .sort({ discountPercentage: -1 })
      .limit(parseInt(limit))
      .select('name price discountedPrice thumbnail category offer discountPercentage');

    res.status(200).json({
      success: true,
      count: deals.length,
      data: deals
    });

  } catch (error) {
    console.error('❌ Error fetching deals:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching deals',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== REVIEW ROUTES ====================

// @route   POST /api/products/:id/reviews
// @desc    Add a review for a product
// @access  Private
router.post('/:id/reviews', protect, async (req, res) => {  // Changed to protect
  try {
    const { id } = req.params;
    const { rating, title, comment, images, orderId } = req.body;
    const userId = req.user._id;

    // Validate product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: id,
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
        'items.product': id,
        status: { $in: ['DELIVERED', 'COMPLETED'] }
      });
      
      if (order) {
        verifiedPurchase = true;
      }
    }

    // Create review
    const review = await Review.create({
      product: id,
      user: userId,
      order: orderId || undefined,
      rating,
      title: title || '',
      comment,
      images: images || [],
      verifiedPurchase,
      status: 'approved'
    });

    // Populate user details
    await review.populate('user', 'fullName');

    // Update product rating
    const ratingStats = await Review.getAverageRating(id);
    await Product.findByIdAndUpdate(id, {
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
    if (user && user.reviews) {
      user.reviews.push({
        productId: id,
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

// @route   GET /api/products/:id/reviews
// @desc    Get all reviews for a product
// @access  Public
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'newest',
      rating,
      verifiedOnly
    } = req.query;

    // Build filter
    const filter = {
      product: id,
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
        .populate('user', 'fullName profileImage')
        .populate('adminResponse.respondedBy', 'fullName'),
      Review.countDocuments(filter),
      Review.getAverageRating(id)
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

// @route   PUT /api/products/:id/reviews/:reviewId
// @desc    Update a review
// @access  Private (own reviews only)
router.put('/:id/reviews/:reviewId', protect, async (req, res) => {  // Changed to protect
  try {
    const { id, reviewId } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user._id;

    const review = await Review.findOne({
      _id: reviewId,
      user: userId,
      product: id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or unauthorized'
      });
    }

    // Update fields
    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;
    if (images !== undefined) review.images = images;

    // Reset status to pending if modified
    review.status = 'pending';

    await review.save();

    // Update product rating
    const ratingStats = await Review.getAverageRating(id);
    await Product.findByIdAndUpdate(id, {
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

// @route   DELETE /api/products/:id/reviews/:reviewId
// @desc    Delete a review
// @access  Private (own reviews only)
router.delete('/:id/reviews/:reviewId', protect, async (req, res) => {  // Changed to protect
  try {
    const { id, reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findOneAndDelete({
      _id: reviewId,
      user: userId,
      product: id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or unauthorized'
      });
    }

    // Update product rating
    const ratingStats = await Review.getAverageRating(id);
    await Product.findByIdAndUpdate(id, {
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

// @route   POST /api/products/:id/reviews/:reviewId/helpful
// @desc    Mark review as helpful
// @access  Private
router.post('/:id/reviews/:reviewId/helpful', protect, async (req, res) => {  // Changed to protect
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

// @route   GET /api/products/:id/reviews/stats
// @desc    Get review statistics for a product
// @access  Public
router.get('/:id/reviews/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const ratingStats = await Review.getAverageRating(id);

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