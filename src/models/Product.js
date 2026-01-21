const mongoose = require("mongoose");
const { Schema } = mongoose;

// Product Review Sub-Schema (for individual reviews)
const ProductReviewSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  reviewDate: {
    type: Date,
    default: Date.now,
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false,
  },
});

// MAIN PRODUCT SCHEMA
const ProductSchema = new Schema(
  {
    // Basic Product Information
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    
    // Category
    category: {
      type: String,
      required: true,
      enum: ["marinated", "ready_to_cook", "curry_cut", "fresh_chicken"],
    },

    // Sub-category (optional, for more specific classification)
    subCategory: {
      type: String,
      trim: true,
      // Examples: "Boneless", "With Bone", "Whole", "Pieces"
    },

    // Pricing
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      min: 0,
      validate: {
        validator: function(value) {
          return value < this.price;
        },
        message: "Discounted price must be less than original price",
      },
    },

    // Offers
    offer: {
      isActive: {
        type: Boolean,
        default: false,
      },
      offerText: {
        type: String,
        trim: true,
        // Examples: "Flat 10% OFF", "Upto 50% OFF", "Buy 1 Get 1"
      },
      offerType: {
        type: String,
        enum: ["percentage", "flat", "bogo", "combo"],
        // percentage: % off, flat: flat discount, bogo: buy one get one, combo: combo deals
      },
      discountPercentage: {
        type: Number,
        min: 0,
        max: 100,
      },
      validFrom: {
        type: Date,
      },
      validUntil: {
        type: Date,
      },
    },

    // Images
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (images) => images.length > 0,
        message: "At least one image is required",
      },
    },
    thumbnail: {
      type: String,
      required: true,
    },

    // Stock Management
    stock: {
      quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      unit: {
        type: String,
        enum: ["kg", "grams", "pieces", "pack"],
        default: "kg",
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
      },
      isInStock: {
        type: Boolean,
        default: true,
      },
    },

    // Product Weight/Quantity Options
    weightOptions: [
      {
        weight: {
          type: Number,
          required: true,
        },
        unit: {
          type: String,
          enum: ["kg", "grams", "pieces"],
          default: "kg",
        },
        price: {
          type: Number,
          required: true,
        },
        discountedPrice: {
          type: Number,
        },
      },
    ],

    // Rating & Reviews
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalReviews: {
        type: Number,
        default: 0,
        min: 0,
      },
      ratingsBreakdown: {
        fiveStar: { type: Number, default: 0 },
        fourStar: { type: Number, default: 0 },
        threeStar: { type: Number, default: 0 },
        twoStar: { type: Number, default: 0 },
        oneStar: { type: Number, default: 0 },
      },
    },

    reviews: {
      type: [ProductReviewSchema],
      default: [],
    },

    // Product Specifications (for chicken products)
    specifications: {
      cut: {
        type: String,
        // Examples: "Boneless", "With Bone", "Curry Cut", "Whole"
      },
      preparationType: {
        type: String,
        // Examples: "Raw", "Marinated", "Ready to Cook"
      },
      marinade: {
        type: String,
        // Examples: "Tandoori", "Tikka", "Butter", "None"
      },
      servingSize: {
        type: String,
        // Examples: "Serves 2-3", "500g serves 2"
      },
      shelfLife: {
        type: String,
        // Examples: "2 days refrigerated", "3 months frozen"
      },
      storageInstructions: {
        type: String,
      },
    },

    // Tags for better search
    tags: {
      type: [String],
      default: [],
      // Examples: ["boneless", "spicy", "best-seller", "premium"]
    },

    // Product Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
    },

    // SEO
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    metaDescription: {
      type: String,
      maxlength: 160,
    },

    // Sales & Analytics
    totalSales: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },

    // Admin Info
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for discount percentage
ProductSchema.virtual('discountPercentage').get(function() {
  if (this.discountedPrice && this.price > 0) {
    return Math.round(((this.price - this.discountedPrice) / this.price) * 100);
  }
  return 0;
});

// Virtual field for checking if product is low on stock
ProductSchema.virtual('isLowStock').get(function() {
  return this.stock.quantity <= this.stock.lowStockThreshold;
});

// Pre-save middleware to generate slug from name - FIXED VERSION
ProductSchema.pre('save', async function() {
  try {
    if (this.isModified('name') && !this.slug) {
      this.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    
    // Update isInStock based on quantity
    if (this.stock) {
      this.stock.isInStock = this.stock.quantity > 0;
    }
  } catch (error) {
    console.error('Pre-save middleware error:', error);
    throw error;
  }
});

// Method to update rating when a new review is added
ProductSchema.methods.updateRating = function() {
  if (!this.reviews || this.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.totalReviews = 0;
    this.rating.ratingsBreakdown = {
      fiveStar: 0,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0
    };
    return;
  }

  // Calculate average rating
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = parseFloat((totalRating / this.reviews.length).toFixed(1));
  this.rating.totalReviews = this.reviews.length;

  // Calculate ratings breakdown
  this.rating.ratingsBreakdown.fiveStar = this.reviews.filter(r => r.rating === 5).length;
  this.rating.ratingsBreakdown.fourStar = this.reviews.filter(r => r.rating === 4).length;
  this.rating.ratingsBreakdown.threeStar = this.reviews.filter(r => r.rating === 3).length;
  this.rating.ratingsBreakdown.twoStar = this.reviews.filter(r => r.rating === 2).length;
  this.rating.ratingsBreakdown.oneStar = this.reviews.filter(r => r.rating === 1).length;
};

// Indexes for better query performance
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ slug: 1 });
ProductSchema.index({ 'rating.average': -1 });
ProductSchema.index({ isBestSeller: 1, isActive: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ 'stock.isInStock': 1 });

const Product = mongoose.model("Product", ProductSchema);
module.exports = Product;