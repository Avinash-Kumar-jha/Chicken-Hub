const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const adminSchema = new Schema(
  {
    // Basic Information
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't return password by default
    },
    mobileno: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit mobile number"],
    },

    // Role & Permissions
    role: {
      type: String,
      enum: ["admin", "super_admin", "manager"],
      default: "admin",
    },
    permissions: [
      {
        type: String,
        enum: [
          "manage_products",
          "manage_orders",
          "manage_users",
          "manage_categories",
          "manage_coupons",
          "manage_reviews",
          "view_analytics",
          "manage_admins",
          "manage_settings",
          "manage_inventory",
          "manage_delivery",
          "send_notifications",
          "export_data",
          "manage_payments",
          "manage_returns", // NEW
          "process_refunds", // NEW
          "approve_returns", // NEW
          "reject_returns", // NEW
          "manage_return_pickups", // NEW
          "view_return_analytics", // NEW
          "manage_return_quality_checks", // NEW
          "initiate_exchanges" // NEW
        ],
      },
    ],

    // Profile
    profileImage: {
      type: String,
      default: null,
    },
    department: {
      type: String,
      enum: ["operations", "sales", "support", "logistics", "IT", "management"],
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    designation: {
      type: String,
      trim: true,
    },

    // Status & Security
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    lockUntil: {
      type: Date,
    },

    // Authentication & Security
    lastLogin: {
      type: Date,
    },
    lastPasswordChange: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },

    // Session Management
    activeSessions: [
      {
        token: String,
        device: String,
        browser: String,
        ipAddress: String,
        location: String,
        loginAt: {
          type: Date,
          default: Date.now,
        },
        lastActivity: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Activity Tracking
    activityLog: [
      {
        action: {
          type: String,
          required: true,
        },
        module: {
          type: String,
          enum: [
            "products",
            "orders",
            "users",
            "categories",
            "coupons",
            "reviews",
            "settings",
            "dashboard",
            "reports",
            "returns" // NEW
          ],
        },
        description: String,
        metadata: mongoose.Schema.Types.Mixed,
        ipAddress: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Return Management Stats - NEW
    returnStats: {
      totalReturnsProcessed: {
        type: Number,
        default: 0
      },
      returnsProcessedToday: {
        type: Number,
        default: 0
      },
      totalRefundsProcessed: {
        type: Number,
        default: 0
      },
      averageProcessingTime: {
        type: Number, // in hours
        default: 0
      },
      lastReturnProcessed: {
        type: Date
      }
    },

    // Return Performance Metrics - NEW
    returnPerformance: {
      approvedReturns: {
        type: Number,
        default: 0
      },
      rejectedReturns: {
        type: Number,
        default: 0
      },
      averageApprovalTime: {
        type: Number, // in hours
        default: 0
      },
      returnProcessingRate: {
        type: Number, // percentage
        default: 0
      }
    },

    // Return Activity Log - NEW
    returnActivityLog: [
      {
        action: {
          type: String,
          enum: [
            "return_approved",
            "return_rejected",
            "refund_initiated",
            "exchange_processed",
            "pickup_agent_assigned",
            "quality_check_updated",
            "return_status_changed"
          ]
        },
        returnId: {
          type: Schema.Types.ObjectId,
          ref: "Return"
        },
        orderId: {
          type: Schema.Types.ObjectId,
          ref: "Order"
        },
        description: String,
        amount: Number, // for refunds
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // Notification Preferences
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true,
      },
      sms: {
        type: Boolean,
        default: false,
      },
      push: {
        type: Boolean,
        default: true,
      },
      newOrders: {
        type: Boolean,
        default: true,
      },
      lowStock: {
        type: Boolean,
        default: true,
      },
      userActivity: {
        type: Boolean,
        default: false,
      },
      systemAlerts: {
        type: Boolean,
        default: true,
      },
      newReturnRequests: { // NEW
        type: Boolean,
        default: true,
      },
      returnApprovals: { // NEW
        type: Boolean,
        default: true,
      },
      refundIssues: { // NEW
        type: Boolean,
        default: true,
      },
    },

    // Work Schedule (optional)
    workSchedule: {
      monday: { start: String, end: String, isWorking: Boolean },
      tuesday: { start: String, end: String, isWorking: Boolean },
      wednesday: { start: String, end: String, isWorking: Boolean },
      thursday: { start: String, end: String, isWorking: Boolean },
      friday: { start: String, end: String, isWorking: Boolean },
      saturday: { start: String, end: String, isWorking: Boolean },
      sunday: { start: String, end: String, isWorking: Boolean },
    },

    // Additional Info
    dateOfJoining: {
      type: Date,
      default: Date.now,
    },
    dateOfBirth: {
      type: Date,
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: "India",
      },
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },

    // Performance Metrics
    metrics: {
      ordersProcessed: {
        type: Number,
        default: 0,
      },
      productsAdded: {
        type: Number,
        default: 0,
      },
      usersManaged: {
        type: Number,
        default: 0,
      },
      issuesResolved: {
        type: Number,
        default: 0,
      },
      averageResponseTime: {
        type: Number, // in minutes
        default: 0,
      },
      returnsManaged: { // NEW
        type: Number,
        default: 0,
      },
      refundsProcessed: { // NEW
        type: Number,
        default: 0,
      },
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    deactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    deactivatedAt: {
      type: Date,
    },
    deactivationReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ employeeId: 1 });
adminSchema.index({ department: 1 });
adminSchema.index({ createdAt: -1 });
adminSchema.index({ "returnStats.lastReturnProcessed": -1 }); // NEW

// Virtual for account lock status
adminSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for password age (days since last change)
adminSchema.virtual("passwordAge").get(function () {
  if (!this.lastPasswordChange) return null;
  const now = new Date();
  const diff = now - this.lastPasswordChange;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to hash password
adminSchema.pre("save", async function (next) {
  // Only hash if password is modified
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Update last password change timestamp
    if (!this.isNew) {
      this.lastPasswordChange = new Date();
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to generate employee ID
adminSchema.pre("save", async function (next) {
  if (this.isNew && !this.employeeId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("Admin").countDocuments();
    this.employeeId = `EMP${year}${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Method to compare passwords
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
adminSchema.methods.incrementLoginAttempts = async function () {
  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) }; // 30 min
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
adminSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  });
};

// Method to log activity
adminSchema.methods.logActivity = function (action, module, description, metadata) {
  this.activityLog.push({
    action,
    module,
    description,
    metadata,
    timestamp: new Date(),
  });

  // Keep only last 100 activities
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }

  return this.save();
};

// Method to log return activity - NEW
adminSchema.methods.logReturnActivity = function(action, returnId, orderId, description, amount = 0) {
  this.returnActivityLog.push({
    action,
    returnId,
    orderId,
    description,
    amount,
    timestamp: new Date()
  });

  // Update metrics based on action
  if (action === 'return_approved' || action === 'return_rejected') {
    this.metrics.returnsManaged += 1;
  }
  
  if (action === 'refund_initiated' && amount > 0) {
    this.metrics.refundsProcessed += amount;
  }

  // Update performance metrics based on action
  if (action === 'return_approved') {
    this.returnPerformance.approvedReturns += 1;
  } else if (action === 'return_rejected') {
    this.returnPerformance.rejectedReturns += 1;
  }

  // Keep only last 50 return activities
  if (this.returnActivityLog.length > 50) {
    this.returnActivityLog = this.returnActivityLog.slice(-50);
  }

  return this.save();
};

// Method to add active session
adminSchema.methods.addSession = function (sessionData) {
  this.activeSessions.push(sessionData);

  // Keep only last 5 sessions
  if (this.activeSessions.length > 5) {
    this.activeSessions = this.activeSessions.slice(-5);
  }

  return this.save();
};

// Method to remove session
adminSchema.methods.removeSession = function (token) {
  this.activeSessions = this.activeSessions.filter((s) => s.token !== token);
  return this.save();
};

// Method to check if admin has permission
adminSchema.methods.hasPermission = function (permission) {
  if (this.role === "super_admin") return true;
  return this.permissions.includes(permission);
};

// Method to check return permissions - NEW
adminSchema.methods.hasReturnPermission = function(permission) {
  if (this.role === "super_admin") return true;
  
  const returnPermissions = [
    "manage_returns",
    "process_refunds",
    "approve_returns",
    "reject_returns",
    "manage_return_pickups",
    "view_return_analytics",
    "manage_return_quality_checks",
    "initiate_exchanges"
  ];
  
  // Check if the permission is a return permission and user has it
  if (returnPermissions.includes(permission)) {
    return this.permissions.includes(permission);
  }
  
  return true; // Non-return permissions are handled by hasPermission
};

// Method to update return stats - NEW
adminSchema.methods.updateReturnStats = async function(returnData) {
  this.returnStats.totalReturnsProcessed += 1;
  this.returnStats.returnsProcessedToday += 1;
  
  if (returnData.refundAmount) {
    this.returnStats.totalRefundsProcessed += returnData.refundAmount;
  }
  
  this.returnStats.lastReturnProcessed = new Date();
  
  // Calculate average processing time if we have processing time
  if (returnData.processingTime) {
    const currentAvg = this.returnStats.averageProcessingTime;
    const totalProcessed = this.returnStats.totalReturnsProcessed;
    this.returnStats.averageProcessingTime = 
      ((currentAvg * (totalProcessed - 1)) + returnData.processingTime) / totalProcessed;
  }
  
  return this.save();
};

// Method to get return metrics - NEW
adminSchema.methods.getReturnMetrics = function() {
  const totalReturns = this.returnPerformance.approvedReturns + this.returnPerformance.rejectedReturns;
  return {
    totalProcessed: this.returnStats.totalReturnsProcessed,
    todayProcessed: this.returnStats.returnsProcessedToday,
    totalRefunds: this.returnStats.totalRefundsProcessed,
    averageTime: this.returnStats.averageProcessingTime,
    approved: this.returnPerformance.approvedReturns,
    rejected: this.returnPerformance.rejectedReturns,
    approvalRate: totalReturns > 0 ? 
      (this.returnPerformance.approvedReturns / totalReturns) * 100 : 0
  };
};

// Static method to find active admins
adminSchema.statics.findActiveAdmins = function () {
  return this.find({ isActive: true }).select("-password");
};

// Static method to find by role
adminSchema.statics.findByRole = function (role) {
  return this.find({ role, isActive: true }).select("-password");
};

// Static method to get admin stats
adminSchema.statics.getStats = async function () {
  const total = await this.countDocuments();
  const active = await this.countDocuments({ isActive: true });
  const byRole = await this.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    total,
    active,
    inactive: total - active,
    byRole,
  };
};

// Static method to get top return processors - NEW
adminSchema.statics.getTopReturnProcessors = async function(limit = 5) {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        "returnStats.totalReturnsProcessed": { $gt: 0 }
      }
    },
    {
      $project: {
        fullName: 1,
        email: 1,
        department: 1,
        totalReturnsProcessed: "$returnStats.totalReturnsProcessed",
        totalRefundsProcessed: "$returnStats.totalRefundsProcessed",
        averageProcessingTime: "$returnStats.averageProcessingTime",
        approvedReturns: "$returnPerformance.approvedReturns"
      }
    },
    {
      $sort: { totalReturnsProcessed: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Don't return sensitive fields by default
adminSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.twoFactorSecret;
    delete ret.activeSessions;
    return ret;
  },
});

module.exports = mongoose.model("Admin", adminSchema);