// middleware/deliveryAuth.js
const jwt = require('jsonwebtoken');
const DeliveryPerson = require('../models/DeliveryPerson');

// Protect delivery routes
exports.protectDelivery = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      console.log('No token found in headers');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
      console.log('Token decoded:', decoded);

      // Check if role is delivery
      if (decoded.role !== 'delivery') {
        console.log('Invalid role:', decoded.role);
        return res.status(403).json({
          success: false,
          message: 'Access denied. Delivery personnel only.'
        });
      }

      // Get delivery person from token
      const deliveryPerson = await DeliveryPerson.findById(decoded.id);

      if (!deliveryPerson) {
        console.log('Delivery person not found:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'Delivery person not found'
        });
      }

      // Check if account is active
      if (!deliveryPerson.isActive) {
        console.log('Account not active');
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated'
        });
      }

      // Check if approved
      if (!deliveryPerson.isApproved) {
        console.log('Account not approved');
        return res.status(403).json({
          success: false,
          message: 'Your account is pending approval'
        });
      }

      // Attach delivery person to request
      req.deliveryPerson = {
        id: deliveryPerson._id,
        name: deliveryPerson.name,
        email: deliveryPerson.email,
        role: 'delivery'
      };

      console.log('Auth successful for:', deliveryPerson.email);
      next();

    } catch (error) {
      console.log('Token verification error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }

  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      error: error.message
    });
  }
};

// Check if delivery person is online
exports.checkOnlineStatus = async (req, res, next) => {
  try {
    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id);

    if (!deliveryPerson.isOnline) {
      return res.status(403).json({
        success: false,
        message: 'You must be online to perform this action'
      });
    }

    next();

  } catch (error) {
    console.error('Online Status Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Check if delivery person is available
exports.checkAvailability = async (req, res, next) => {
  try {
    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id);

    if (!deliveryPerson.isAvailable) {
      return res.status(403).json({
        success: false,
        message: 'You are currently unavailable for new orders'
      });
    }

    next();

  } catch (error) {
    console.error('Availability Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};