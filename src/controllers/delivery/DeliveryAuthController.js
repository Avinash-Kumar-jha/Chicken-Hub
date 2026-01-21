// controllers/deliveryAuthController.js
const DeliveryPerson = require('../../models/DeliveryPerson');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id, role: 'delivery' }, process.env.JWT_SECRET || 'your-secret-key-here', {
    expiresIn: '30d'
  });
};

// @desc    Register new delivery person
// @route   POST /api/delivery/auth/register
// @access  Public (or Admin only - your choice)
exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      vehicleType,
      vehicleNumber,
      drivingLicense
    } = req.body;

    // Validation
    if (!name || !email || !password || !phone || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if delivery person already exists
    const deliveryPersonExists = await DeliveryPerson.findOne({
      $or: [{ email }, { phone }]
    });

    if (deliveryPersonExists) {
      return res.status(400).json({
        success: false,
        message: 'Delivery person with this email or phone already exists'
      });
    }

    // Create delivery person
    const deliveryPerson = await DeliveryPerson.create({
      name,
      email,
      password,
      phone,
      vehicleType,
      vehicleNumber,
      drivingLicense,
      isApproved: true, // Auto-approve for development
      isActive: true
    });

    // Generate token
    const token = generateToken(deliveryPerson._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now login.',
      data: {
        _id: deliveryPerson._id,
        name: deliveryPerson.name,
        email: deliveryPerson.email,
        phone: deliveryPerson.phone,
        vehicleType: deliveryPerson.vehicleType,
        isApproved: deliveryPerson.isApproved,
        isActive: deliveryPerson.isActive
      },
      token
    });

  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

// @desc    Login delivery person
// @route   POST /api/delivery/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find delivery person and include password
    const deliveryPerson = await DeliveryPerson.findOne({ email }).select('+password');

    if (!deliveryPerson) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!deliveryPerson.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact admin.'
      });
    }

    // Check password
    const isPasswordValid = await deliveryPerson.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if approved
    if (!deliveryPerson.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval from admin'
      });
    }

    // Update last active time
    deliveryPerson.lastActiveAt = Date.now();
    await deliveryPerson.save();

    // Generate token
    const token = generateToken(deliveryPerson._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: deliveryPerson._id,
        name: deliveryPerson.name,
        email: deliveryPerson.email,
        phone: deliveryPerson.phone,
        vehicleType: deliveryPerson.vehicleType,
        isOnline: deliveryPerson.isOnline,
        isAvailable: deliveryPerson.isAvailable,
        rating: deliveryPerson.rating,
        completedDeliveries: deliveryPerson.completedDeliveries,
        totalEarnings: deliveryPerson.totalEarnings,
        todayEarnings: deliveryPerson.todayEarnings
      },
      token
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Logout delivery person
// @route   POST /api/delivery/auth/logout
// @access  Private (Delivery)
exports.logout = async (req, res) => {
  try {
    // Set delivery person to offline
    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id);
    
    if (deliveryPerson) {
      deliveryPerson.isOnline = false;
      deliveryPerson.lastActiveAt = Date.now();
      await deliveryPerson.save();
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
};

// @desc    Get current delivery person profile
// @route   GET /api/delivery/auth/me
// @access  Private (Delivery)
exports.getMe = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id)
      .populate('activeOrders');

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }

    res.status(200).json({
      success: true,
      data: deliveryPerson
    });

  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update delivery person profile
// @route   PUT /api/delivery/auth/profile
// @access  Private (Delivery)
exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ['name', 'phone', 'vehicleType', 'vehicleNumber', 'drivingLicense'];
    const updates = {};

    // Only allow specific fields to be updated
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const deliveryPerson = await DeliveryPerson.findByIdAndUpdate(
      req.deliveryPerson.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: deliveryPerson
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/delivery/auth/change-password
// @access  Private (Delivery)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get delivery person with password
    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id).select('+password');

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }

    // Verify current password
    const isPasswordValid = await deliveryPerson.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    deliveryPerson.password = newPassword;
    await deliveryPerson.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Toggle online/offline status
// @route   PUT /api/delivery/auth/toggle-status
// @access  Private (Delivery)
exports.toggleOnlineStatus = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id);

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }

    await deliveryPerson.toggleOnlineStatus();

    res.status(200).json({
      success: true,
      message: `You are now ${deliveryPerson.isOnline ? 'online' : 'offline'}`,
      data: {
        isOnline: deliveryPerson.isOnline
      }
    });

  } catch (error) {
    console.error('Toggle Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update location
// @route   PUT /api/delivery/auth/location
// @access  Private (Delivery)
exports.updateLocation = async (req, res) => {
  try {
    const { longitude, latitude, address } = req.body;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide longitude and latitude'
      });
    }

    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id);

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }

    await deliveryPerson.updateLocation(longitude, latitude, address);

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        currentLocation: deliveryPerson.currentLocation
      }
    });

  } catch (error) {
    console.error('Update Location Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};