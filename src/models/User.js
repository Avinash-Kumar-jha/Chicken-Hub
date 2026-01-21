const mongoose = require("mongoose");
const { Schema } = mongoose;

// Address Sub-Schema
const AddressSchema = new Schema({
  type: {
    type: String,
    enum: ["home", "work", "other"],
    required: true,
  },
  addressLine1: {
    type: String,
    required: true,
    trim: true,
  },
  addressLine2: {
    type: String,
    trim: true,
  },
  pincode: {
    type: String,
    required: true,
    match: /^[0-9]{6}$/,
  },
  district: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

// Recent Order Schema
const RecentOrderSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    orderDate: {
      type: Date,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    itemsCount: {
      type: Number,
      default: 0,
    }
  },
  { _id: false }
);

// Cart Item Schema
const CartItemSchema = new Schema(
  {
    productId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
    },
    image: {
      type: String,
    },
    images: [{
      type: String,
    }],
    description: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Payment Schema
const PaymentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "netbanking", "cod", "wallet"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["success", "failed", "pending", "refunded"],
      required: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Review Schema
const ReviewSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
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
});

// Feedback Schema
const FeedbackSchema = new Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  category: {
    type: String,
    enum: ["ui/ux", "delivery", "product_quality", "customer_service", "other"],
    required: true,
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  feedbackDate: {
    type: Date,
    default: Date.now,
  },
});

// User Return Schema - NEW
const UserReturnSchema = new Schema({
  returnId: {
    type: Schema.Types.ObjectId,
    ref: "Return",
    required: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: [
      'requested',
      'approved',
      'rejected',
      'pickup_scheduled',
      'pickup_completed',
      'received_at_warehouse',
      'quality_check_passed',
      'quality_check_failed',
      'refund_initiated',
      'refund_completed',
      'exchange_initiated',
      'exchange_delivered',
      'cancelled'
    ],
    default: 'requested'
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundMethod: {
    type: String,
    enum: ['original_payment', 'store_credit', 'bank_transfer', 'wallet']
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  completionDate: {
    type: Date
  }
}, { _id: false });

// MAIN USER SCHEMA
const UserSchema = new Schema(
  {
    fullName: {
      type: String,
      minlength: 3,
      maxlength: 50,
      trim: true,
      required: true,
    },
    age: {
      type: Number,
      min: 10,
      max: 100,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    mobileno: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9]{10}$/,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    addresses: {
      type: [AddressSchema],
      default: [],
    },

    recentOrders: {
      type: [RecentOrderSchema],
      default: [],
      validate: {
        validator: function(orders) {
          return orders.length <= 10;
        },
        message: "Can only store 10 recent orders",
      },
    },

    orderStats: {
      totalOrders: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      lastOrderDate: { type: Date, default: null },
      // Return stats - NEW
      totalReturns: { type: Number, default: 0 },
      totalRefundsReceived: { type: Number, default: 0 },
      successfulReturns: { type: Number, default: 0 },
      returnRate: { 
        type: Number, default: 1 }, // percentage of orders returned
    },

    cart: {
      items: { 
        type: [CartItemSchema], 
        default: [] 
      },
      totalItems: { 
        type: Number, 
        default: 0 
      },
      totalPrice: { 
        type: Number, 
        default: 0 
      },
      lastUpdated: { 
        type: Date, 
        default: Date.now 
      },
    },

    recentPayments: {
      type: [PaymentSchema],
      default: [],
      validate: {
        validator: (payments) => payments.length <= 5,
        message: "Can only store 5 recent payments",
      },
    },

    // Return History - NEW
    returnHistory: {
      type: [UserReturnSchema],
      default: [],
      validate: {
        validator: function(returns) {
          return returns.length <= 50; // Keep last 50 returns
        },
        message: "Can only store 50 recent returns"
      }
    },

    reviews: { type: [ReviewSchema], default: [] },
    feedbacks: { type: [FeedbackSchema], default: [] },

    // Return Preferences - NEW
    returnPreferences: {
      defaultRefundMethod: {
        type: String,
        enum: ['original_payment', 'store_credit', 'bank_transfer', 'wallet'],
        default: 'original_payment'
      },
      preferredPickupTime: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'anytime'],
        default: 'anytime'
      },
      autoSchedulePickup: {
        type: Boolean,
        default: false
      }
    },

    // Return Flags - NEW
    returnFlags: {
      isReturnFrequent: {
        type: Boolean,
        default: false
      },
      returnRestricted: {
        type: Boolean,
        default: false
      },
      restrictionReason: {
        type: String
      },
      lastReturnDate: {
        type: Date
      },
      returnScore: {
        type: Number,
        default: 100, // Start with perfect score
        min: 0,
        max: 100
      }
    },

    role: {
      type: String,
      enum: ["user", "admin", "delivery"],
      default: "user",
    },

    verificationStatus: {
      isEmailVerified: { type: Boolean, default: false },
      isMobileVerified: { type: Boolean, default: false },
      emailVerificationToken: String,
      mobileVerificationOTP: String,
      verificationTokenExpiry: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Two-Factor Authentication
    twoFactorAuth: {
      isEnabled: {
        type: Boolean,
        default: false
      },
      secret: {
        type: String
      },
      backupCodes: [{
        code: String,
        used: Boolean
      }]
    },

    // OTP for 2FA and Password Reset
    otp: {
      code: String,
      expiresAt: Date,
      purpose: {
        type: String,
        enum: ['login', 'password_reset', 'email_verification']
      }
    },

    // Password Reset
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Login attempts (for security)
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
  },
  
  { timestamps: true }
);

// SINGLE INDEX (SAFE)
UserSchema.index({ role: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ mobileno: 1 });
UserSchema.index({ "returnFlags.returnScore": 1 }); // NEW
UserSchema.index({ "orderStats.returnRate": 1 }); // NEW

// Method to add recent order to user
UserSchema.methods.addRecentOrder = async function(orderData) {
  try {
    const { orderId, orderNumber, totalAmount, status, itemsCount, orderDate } = orderData;
    
    // Create recent order entry
    const recentOrderEntry = {
      orderId: orderId,
      orderNumber: orderNumber,
      orderDate: orderDate || new Date(),
      totalAmount: totalAmount,
      status: status,
      itemsCount: itemsCount || 0
    };

    // Add to recent orders array
    this.recentOrders.unshift(recentOrderEntry);
    
    // Keep only last 10 orders
    if (this.recentOrders.length > 10) {
      this.recentOrders = this.recentOrders.slice(0, 10);
    }

    // Update order statistics
    this.orderStats.totalOrders += 1;
    this.orderStats.totalSpent += totalAmount;
    this.orderStats.lastOrderDate = new Date();
    
    // Calculate average order value
    if (this.orderStats.totalOrders > 0) {
      this.orderStats.averageOrderValue = this.orderStats.totalSpent / this.orderStats.totalOrders;
    }

    await this.save();
    console.log('✅ Recent order added to user:', this._id);
    return true;
  } catch (error) {
    console.error('❌ Error adding recent order to user:', error);
    return false;
  }
};

// Method to get recent orders
UserSchema.methods.getRecentOrders = function(limit = 10) {
  return this.recentOrders.slice(0, limit);
};

// Method to add return to user's history - NEW
UserSchema.methods.addReturn = async function(returnData) {
  const {
    returnId,
    orderId,
    productId,
    productName,
    reason,
    quantity,
    status,
    refundAmount,
    refundMethod
  } = returnData;

  const returnEntry = {
    returnId,
    orderId,
    productId,
    productName,
    reason,
    quantity,
    status,
    refundAmount: refundAmount || 0,
    refundMethod: refundMethod || 'original_payment',
    requestDate: new Date()
  };

  // Add to return history
  this.returnHistory.unshift(returnEntry);
  
  // Keep only last 50 returns
  if (this.returnHistory.length > 50) {
    this.returnHistory = this.returnHistory.slice(0, 50);
  }

  // Update return stats
  this.orderStats.totalReturns += 1;
  
  if (refundAmount && refundAmount > 0) {
    this.orderStats.totalRefundsReceived += refundAmount;
    this.orderStats.successfulReturns += 1;
  }

  // Calculate return rate
  if (this.orderStats.totalOrders > 0) {
    this.orderStats.returnRate = (this.orderStats.totalReturns / this.orderStats.totalOrders) * 100;
  }

  // Update return flags
  this.returnFlags.lastReturnDate = new Date();
  
  // Calculate return score (100 - (returnRate * 10))
  const returnScore = Math.max(0, 100 - (this.orderStats.returnRate * 10));
  this.returnFlags.returnScore = returnScore;
  
  // Mark as frequent returner if return rate > 20%
  if (this.orderStats.returnRate > 20) {
    this.returnFlags.isReturnFrequent = true;
  }
  
  // Restrict returns if return rate > 50%
  if (this.orderStats.returnRate > 50) {
    this.returnFlags.returnRestricted = true;
    this.returnFlags.restrictionReason = "High return rate detected";
  }

  // Set completion date if status indicates completion
  if (['refund_completed', 'exchange_delivered'].includes(status)) {
    returnEntry.completionDate = new Date();
  }

  await this.save();
  return returnEntry;
};

// Method to get active returns - NEW
UserSchema.methods.getActiveReturns = function() {
  const activeStatuses = [
    'requested',
    'approved',
    'pickup_scheduled',
    'pickup_completed',
    'received_at_warehouse',
    'quality_check_passed',
    'quality_check_failed',
    'refund_initiated',
    'exchange_initiated'
  ];
  
  return this.returnHistory.filter(returnItem => 
    activeStatuses.includes(returnItem.status)
  );
};

// Method to get completed returns - NEW
UserSchema.methods.getCompletedReturns = function() {
  const completedStatuses = [
    'refund_completed',
    'exchange_delivered',
    'rejected',
    'cancelled'
  ];
  
  return this.returnHistory.filter(returnItem => 
    completedStatuses.includes(returnItem.status)
  );
};

// Method to get return summary - NEW
UserSchema.methods.getReturnSummary = function() {
  const totalReturns = this.orderStats.totalReturns || 0;
  const successfulReturns = this.orderStats.successfulReturns || 0;
  const totalRefunds = this.orderStats.totalRefundsReceived || 0;
  const returnRate = this.orderStats.returnRate || 0;
  
  const activeReturns = this.getActiveReturns().length;
  const completedReturns = this.getCompletedReturns().length;
  
  return {
    totalReturns,
    successfulReturns,
    failedReturns: totalReturns - successfulReturns,
    successRate: totalReturns > 0 ? (successfulReturns / totalReturns) * 100 : 0,
    totalRefunds,
    averageRefund: successfulReturns > 0 ? totalRefunds / successfulReturns : 0,
    returnRate,
    activeReturns,
    completedReturns,
    isReturnFrequent: this.returnFlags.isReturnFrequent,
    returnRestricted: this.returnFlags.returnRestricted,
    returnScore: this.returnFlags.returnScore
  };
};

// Method to update return status - NEW
UserSchema.methods.updateReturnStatus = async function(returnId, newStatus, refundAmount = 0) {
  const returnItem = this.returnHistory.find(item => 
    item.returnId.toString() === returnId.toString()
  );
  
  if (!returnItem) {
    throw new Error('Return not found in user history');
  }
  
  returnItem.status = newStatus;
  
  if (refundAmount > 0) {
    returnItem.refundAmount = refundAmount;
  }
  
  if (['refund_completed', 'exchange_delivered'].includes(newStatus)) {
    returnItem.completionDate = new Date();
  }
  
  await this.save();
  return returnItem;
};

// Method to check if user can request return - NEW
UserSchema.methods.canRequestReturn = function() {
  if (this.returnFlags.returnRestricted) {
    return {
      allowed: false,
      reason: this.returnFlags.restrictionReason || "Return requests are restricted for your account"
    };
  }
  
  // Check if too many active returns
  const activeReturns = this.getActiveReturns().length;
  if (activeReturns >= 3) {
    return {
      allowed: false,
      reason: "You have too many active return requests. Please wait for existing requests to complete."
    };
  }
  
  return {
    allowed: true,
    reason: "You can request a return"
  };
};

const User = mongoose.model("User", UserSchema);
module.exports = User;