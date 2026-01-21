// models/Feedback.js
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  overallRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  deliveryRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  productRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  packagingRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  averageRating: {
    type: Number,
    default: 0
  },
  comment: {
    type: String,
    required: true,
    minlength: 10
  },
  suggestions: {
    type: String,
    default: ''
  },
  categories: [{
    type: String
  }],
  recommend: {
    type: Boolean,
    default: true
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  helpfulBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'actioned', 'resolved'],
    default: 'pending'
  },
  adminResponse: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  metadata: {
    device: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate average rating
feedbackSchema.pre('save', function(next) {
  this.averageRating = (
    this.overallRating +
    this.deliveryRating +
    this.productRating +
    this.packagingRating
  ) / 4;
  next();
});

// Static method to get average ratings
feedbackSchema.statics.getAverageRatings = async function() {
  const result = await this.aggregate([
    {
      $group: {
        _id: null,
        overall: { $avg: '$overallRating' },
        delivery: { $avg: '$deliveryRating' },
        product: { $avg: '$productRating' },
        packaging: { $avg: '$packagingRating' },
        average: { $avg: '$averageRating' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || {
    overall: 0,
    delivery: 0,
    product: 0,
    packaging: 0,
    average: 0,
    count: 0
  };
};

// Static method to get category distribution
feedbackSchema.statics.getCategoryDistribution = async function() {
  return this.aggregate([
    { $unwind: '$categories' },
    {
      $group: {
        _id: '$categories',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Compound index to ensure one feedback per order per user
feedbackSchema.index({ user: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);