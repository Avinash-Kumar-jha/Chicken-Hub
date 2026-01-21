const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Basic Authentication Middleware
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header or cookie
    let token = req.header("Authorization")?.replace("Bearer ", "");
    
    // If no token in header, check cookies
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please login first.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Invalid token.",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated.",
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remainingTime} minutes.`,
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Admin Authorization Middleware
const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authorization failed.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Delivery Authorization Middleware
const isDelivery = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (req.user.role !== "delivery" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Delivery personnel privileges required.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authorization failed.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Check if user is Admin OR Delivery
const isAdminOrDelivery = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!["admin", "delivery"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or delivery privileges required.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authorization failed.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Flexible role checker
const hasRole = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${roles.join(" or ")}.`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Authorization failed.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };
};

module.exports = { 
  authMiddleware, 
  isAdmin, 
  isDelivery,
  isAdminOrDelivery,
  hasRole
};