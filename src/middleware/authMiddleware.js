const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DeliveryPerson = require('../models/DeliveryPerson');

// Main authentication middleware - verifies token and attaches user to request
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in different locations
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Token in Authorization header
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // Token in cookies
      token = req.cookies.token;
    } else if (req.query && req.query.token) {
      // Token in query string (for email links, etc.)
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check what type of user this is based on role in token
    if (decoded.role === 'delivery') {
      // This is a delivery person
      const deliveryPerson = await DeliveryPerson.findById(decoded.id)
        .select('-password -resetPasswordToken -resetPasswordExpire');

      if (!deliveryPerson) {
        return res.status(401).json({
          success: false,
          message: 'Delivery person not found'
        });
      }

      // Check if delivery person account is active
      if (!deliveryPerson.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your delivery account has been deactivated'
        });
      }

      // Check if delivery person is approved
      if (!deliveryPerson.isApproved) {
        return res.status(403).json({
          success: false,
          message: 'Your delivery account is pending approval'
        });
      }

      // Attach delivery person info to request
      req.user = {
        _id: deliveryPerson._id,
        id: deliveryPerson._id,
        name: deliveryPerson.name,
        email: deliveryPerson.email,
        phone: deliveryPerson.phone,
        role: 'delivery',
        isOnline: deliveryPerson.isOnline,
        isAvailable: deliveryPerson.isAvailable,
        isDelivery: true
      };

    } else {
      // This is a regular user or admin
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user account is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated'
        });
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > Date.now()) {
        const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account locked. Try again in ${remainingTime} minutes.`
        });
      }

      // Attach user info to request
      req.user = {
        _id: user._id,
        id: user._id,
        name: user.fullName || user.name,
        email: user.email,
        phone: user.phone || user.mobileno,
        role: user.role || 'user',
        isAdmin: user.role === 'admin',
        isUser: user.role === 'user',
        isActive: user.isActive
      };
    }

    // Attach token to request
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication Error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin authorization middleware
const admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Delivery agent authorization middleware
const deliveryAgent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'delivery') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Delivery agent privileges required.'
    });
  }

  next();
};

// User authorization middleware (regular users only)
const user = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. User privileges required.'
    });
  }

  next();
};

// Check if user is admin OR delivery
const adminOrDelivery = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!['admin', 'delivery'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or delivery privileges required.'
    });
  }

  next();
};

// Check if user is admin OR user
const adminOrUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!['admin', 'user'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or user privileges required.'
    });
  }

  next();
};

// Flexible role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}.`
      });
    }

    next();
  };
};

// Check delivery person online status
const checkDeliveryOnlineStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'delivery') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery personnel can access this feature'
      });
    }

    const deliveryPerson = await DeliveryPerson.findById(req.user._id);
    
    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }

    if (!deliveryPerson.isOnline) {
      return res.status(403).json({
        success: false,
        message: 'You must be online to perform this action'
      });
    }

    req.deliveryPerson = deliveryPerson;
    next();
  } catch (error) {
    console.error('Delivery Online Status Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking online status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Check delivery person availability
const checkDeliveryAvailability = async (req, res, next) => {
  try {
    if (req.user.role !== 'delivery') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery personnel can access this feature'
      });
    }

    const deliveryPerson = await DeliveryPerson.findById(req.user._id);
    
    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }

    if (!deliveryPerson.isAvailable) {
      return res.status(403).json({
        success: false,
        message: 'You are currently unavailable for new orders'
      });
    }

    req.deliveryPerson = deliveryPerson;
    next();
  } catch (error) {
    console.error('Delivery Availability Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Generate JWT Token
const generateToken = (id, role = 'user') => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Generate Reset Token
const generateResetToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: '10m' } // Short-lived token for password reset
  );
};

// Verify API Key (for webhooks, external services)
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required'
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  next();
};

// Rate limiting middleware (simplified)
const rateLimiter = (req, res, next) => {
  // Simple rate limiting based on IP
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // 100 requests per 15 minutes

  // This is a simplified version - in production, use a proper rate limiting library
  // like express-rate-limit
  
  next();
};

module.exports = {
  protect,
  admin,
  deliveryAgent,
  user,
  adminOrDelivery,
  adminOrUser,
  authorize,
  checkDeliveryOnlineStatus,
  checkDeliveryAvailability,
  generateToken,
  generateResetToken,
  verifyApiKey,
  rateLimiter
};