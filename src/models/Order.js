// models/Order.js - UPDATED VERSION
const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    // Order Identification
    orderNumber: {
      type: String,
      unique: true,
    },

    // Customer Information
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    // Order Items
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        image: {
          type: String,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        weight: {
          type: String,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    // Delivery Address
    deliveryAddress: {
      fullName: {
        type: String,
        required: true,
      },
      mobile: {
        type: String,
        required: true,
      },
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: {
        type: String,
      },
      landmark: {
        type: String,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
      addressType: {
        type: String,
        enum: ["home", "work", "other"],
        default: "home",
      },
    },

    // Pricing Details
    itemsTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment Information
    paymentMethod: {
      type: String,
      enum: ["cod", "online", "card", "upi", "wallet"],
      required: true,
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentDetails: {
      transactionId: String,
      paymentGateway: String,
      paidAt: Date,
    },

    // Order Status
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
        "failed",
      ],
      default: "pending",
    },

    // Status History
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // Delivery Information
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPerson",
    },
    estimatedDeliveryTime: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    deliveryNotes: {
      type: String,
    },
    
    // OTP Fields - ADDED
    deliveryOTP: {
      type: String,
      default: null,
    },
    deliveryOTPSentAt: {
      type: Date,
      default: null,
    },
    deliveryOTPVerified: {
      type: Boolean,
      default: false,
    },
    deliveryOTPVerifiedAt: {
      type: Date,
      default: null,
    },
    deliveryOTPAttempts: {
      type: Number,
      default: 0,
    },

    // Tracking
    trackingNumber: {
      type: String,
    },
    trackingUrl: {
      type: String,
    },

    // Order Metadata
    orderNotes: {
      type: String,
      maxlength: 500,
    },
    customerNotes: {
      type: String,
      maxlength: 500,
    },
    adminNotes: {
      type: String,
      maxlength: 1000,
    },

    // Cancellation Details
    cancellationReason: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Invoice
    invoiceNumber: {
      type: String,
    },
    invoiceUrl: {
      type: String,
    },

    // Ratings & Review
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
    },
    reviewedAt: {
      type: Date,
    },

    // Issues (for delivery person to report problems)
    issues: [
      {
        reportedBy: {
          type: String,
          enum: ["customer", "delivery", "admin"],
        },
        deliveryPerson: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "DeliveryPerson",
        },
        issueType: String,
        description: String,
        reportedAt: Date,
        status: {
          type: String,
          enum: ["pending", "resolved", "cancelled"],
          default: "pending",
        },
      },
    ],

    // Notifications
    notificationsSent: {
      orderPlaced: { type: Boolean, default: false },
      orderConfirmed: { type: Boolean, default: false },
      orderShipped: { type: Boolean, default: false },
      outForDelivery: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
    },

    // Additional Flags
    isPriority: {
      type: Boolean,
      default: false,
    },
    isGift: {
      type: Boolean,
      default: false,
    },
    giftMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ assignedTo: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "deliveryAddress.pincode": 1 });
orderSchema.index({ deliveryOTP: 1 }); // Add index for OTP
orderSchema.index({ deliveryOTPSentAt: 1 }); // Add index for OTP sent time

// Pre-save hook to generate order number
orderSchema.pre("save", function () {
  if (this.isNew && !this.orderNumber) {
    console.log("🔢 Generating order number...");

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");

    this.orderNumber = `ORD-${year}${month}${day}-${random}`;
    console.log("✅ Generated order number:", this.orderNumber);
  }
});

// Method to generate OTP
orderSchema.methods.generateOTP = function() {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  this.deliveryOTP = otp;
  this.deliveryOTPSentAt = new Date();
  this.deliveryOTPVerified = false;
  this.deliveryOTPAttempts = 0;
  return otp;
};

// Method to verify OTP
orderSchema.methods.verifyOTP = function(enteredOTP) {
  // Check if OTP exists
  if (!this.deliveryOTP) {
    return { success: false, message: 'No OTP generated' };
  }
  
  // Check if OTP is expired (10 minutes)
  const otpSentAt = new Date(this.deliveryOTPSentAt);
  const now = new Date();
  const otpAge = (now - otpSentAt) / 1000 / 60; // in minutes
  
  if (otpAge > 10) {
    // Clear expired OTP
    this.deliveryOTP = null;
    this.deliveryOTPSentAt = null;
    this.deliveryOTPAttempts = 0;
    return { success: false, message: 'OTP has expired' };
  }
  
  // Check OTP attempts
  if (this.deliveryOTPAttempts >= 3) {
    return { success: false, message: 'Too many failed attempts. Please request new OTP' };
  }
  
  // Verify OTP
  if (this.deliveryOTP !== enteredOTP) {
    this.deliveryOTPAttempts += 1;
    const attemptsRemaining = 3 - this.deliveryOTPAttempts;
    return { 
      success: false, 
      message: 'Invalid OTP', 
      attemptsRemaining,
      locked: this.deliveryOTPAttempts >= 3
    };
  }
  
  // OTP is valid
  this.deliveryOTPVerified = true;
  this.deliveryOTPVerifiedAt = new Date();
  this.deliveryOTPAttempts = 0;
  
  return { success: true, message: 'OTP verified successfully' };
};

// Method to check if OTP can be resent
orderSchema.methods.canResendOTP = function() {
  if (!this.deliveryOTPSentAt) {
    return { canResend: true, waitTime: 0 };
  }
  
  const lastSent = new Date(this.deliveryOTPSentAt);
  const now = new Date();
  const cooldown = (now - lastSent) / 1000 / 60; // in minutes
  
  if (cooldown >= 2) {
    return { canResend: true, waitTime: 0 };
  } else {
    const waitTime = Math.ceil((2 - cooldown) * 60); // in seconds
    return { canResend: false, waitTime };
  }
};

// Method to get OTP status
orderSchema.methods.getOTPStatus = function() {
  const status = {
    hasOTP: !!this.deliveryOTP,
    verified: this.deliveryOTPVerified || false,
    sentAt: this.deliveryOTPSentAt,
    verifiedAt: this.deliveryOTPVerifiedAt,
    attempts: this.deliveryOTPAttempts || 0
  };
  
  // Check if OTP is expired
  if (this.deliveryOTPSentAt) {
    const otpSentAt = new Date(this.deliveryOTPSentAt);
    const now = new Date();
    const otpAge = (now - otpSentAt) / 1000 / 60; // in minutes
    status.isExpired = otpAge > 10;
    status.expiresIn = Math.max(0, Math.floor((10 - otpAge) * 60)); // in seconds
  }
  
  return status;
};

// Virtual for order age
orderSchema.virtual("orderAge").get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function () {
  const nonCancellableStatuses = ["delivered", "cancelled", "returned", "shipped"];
  return !nonCancellableStatuses.includes(this.orderStatus);
};

// Method to check if order can be returned
orderSchema.methods.canBeReturned = function () {
  if (this.orderStatus !== "delivered") return false;
  
  const daysSinceDelivery = Math.floor(
    (new Date() - this.deliveredAt) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceDelivery <= 7;
};

// Static methods
orderSchema.statics.findByStatus = function (status) {
  return this.find({ orderStatus: status })
    .populate("user", "fullName email mobileno")
    .populate("assignedTo", "name email phone")
    .sort({ createdAt: -1 });
};

orderSchema.statics.getPendingCount = function () {
  return this.countDocuments({ orderStatus: "pending" });
};

// Static method to generate unique order number
orderSchema.statics.generateOrderNumber = async function () {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  
  const count = await this.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });
  
  return `ORD-${year}${month}${day}-${String(count + 1).padStart(4, "0")}`;
};

module.exports = mongoose.model("Order", orderSchema);