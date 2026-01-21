
const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [4, "Coupon code must be at least 4 characters"],
      maxlength: [20, "Coupon code cannot exceed 20 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    usageLimit: {
      type: Number,
      default: null, // null = unlimited
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
    },
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    excludedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: true, // false = private/invite only
    },
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        orderAmount: Number,
        discountGiven: Number,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

// Index
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Method to check if coupon is valid
couponSchema.methods.isValid = function () {
  const now = new Date();
  
  if (!this.isActive) return { valid: false, message: "Coupon is inactive" };
  if (now < this.startDate) return { valid: false, message: "Coupon not yet active" };
  if (now > this.endDate) return { valid: false, message: "Coupon has expired" };
  
  if (this.usageLimit && this.usageCount >= this.usageLimit) {
    return { valid: false, message: "Coupon usage limit reached" };
  }
  
  return { valid: true };
};

// Method to check if user can use coupon
couponSchema.methods.canUserUse = function (userId) {
  const userUsage = this.usedBy.filter(
    (u) => u.user.toString() === userId.toString()
  ).length;
  
  if (userUsage >= this.perUserLimit) {
    return { canUse: false, message: "You have already used this coupon" };
  }
  
  return { canUse: true };
};

// Method to apply coupon
couponSchema.methods.applyCoupon = function (orderAmount) {
  if (orderAmount < this.minOrderAmount) {
    return {
      applied: false,
      message: `Minimum order amount of ₹${this.minOrderAmount} required`,
    };
  }
  
  let discount = 0;
  
  if (this.discountType === "percentage") {
    discount = (orderAmount * this.discountValue) / 100;
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else {
    discount = this.discountValue;
  }
  
  return {
    applied: true,
    discount: Math.round(discount * 100) / 100,
    finalAmount: orderAmount - discount,
  };
};

module.exports = mongoose.model("Coupon", couponSchema);

