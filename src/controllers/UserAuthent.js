// controllers/UserAuthent.js - UPDATED WITH CART FIX
const User = require('../models/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const {generateToken, generateRefreshToken} = require('../utils/generateToken.js');
const {
  validateEmail,
  validatePassword,
  validateMobile,
  validateFullName,
  validateAge,
  sanitizeInput
} = require('../utils/validator.js');
const {sendEmail }= require('../utils/sendEmail');
const {
  passwordResetTemplate,
  otpTemplate,
  emailVerificationTemplate
} = require('../utils/emailTemplates');

// Helper function to ensure cart structure
const ensureCartStructure = (user) => {
  if (!user.cart || Array.isArray(user.cart) || !user.cart.items) {
    user.cart = {
      items: [],
      totalItems: 0,
      totalPrice: 0,
      lastUpdated: new Date()
    };
  }
  return user;
};

// @desc    Register new user
// @route   POST /api/user/signup
// @access  Public
const Signup = async (req, res) => {
  try {
    const { fullName, age, email, mobileno, password, confirmPassword } = req.body;

    if (!fullName || !age || !email || !mobileno || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    try {
      validateFullName(fullName);
      validateAge(age);
      validateEmail(email);
      validateMobile(mobileno);
      validatePassword(password);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { mobileno }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
      if (existingUser.mobileno === mobileno) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number already registered'
        });
      }
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedEmailToken = crypto
      .createHash('sha256')
      .update(emailVerificationToken)
      .digest('hex');

    const mobileOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user with proper cart structure
    const user = await User.create({
      fullName: sanitizeInput(fullName),
      age,
      email: email.toLowerCase(),
      mobileno,
      password: hashedPassword,
      cart: {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        lastUpdated: new Date()
      },
      verificationStatus: {
        isEmailVerified: false,
        isMobileVerified: false,
        emailVerificationToken: hashedEmailToken,
        mobileVerificationOTP: mobileOTP,
        verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000
      }
    });

    if (user) {
      const token = generateToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please verify your email and mobile number.',
        data: {
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobileno: user.mobileno,
            age: user.age,
            role: user.role,
            isEmailVerified: user.verificationStatus.isEmailVerified,
            isMobileVerified: user.verificationStatus.isMobileVerified,
            cart: user.cart
          },
          token,
          mobileOTP: process.env.NODE_ENV === 'development' ? mobileOTP : undefined
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid user data'
      });
    }
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup',
      error: error.message
    });
  }
};

// @desc    Login with 2FA
// @route   POST /api/user/login
// @access  Public
const LoginWith2FA = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    try {
      validateEmail(email);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Fix cart structure if needed
    user = ensureCartStructure(user);

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(401).json({
        success: false,
        message: `Account locked. Try again in ${remainingTime} minutes`
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        return res.status(401).json({
          success: false,
          message: 'Too many failed login attempts. Account locked for 15 minutes'
        });
      }

      await user.save({ validateBeforeSave: false });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        attemptsLeft: 5 - user.loginAttempts
      });
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;

    if (user.twoFactorAuth.isEnabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      user.otp = {
        code: otp,
        expiresAt: Date.now() + 10 * 60 * 1000,
        purpose: 'login'
      };

      await user.save({ validateBeforeSave: false });

      const emailSent = await sendEmail({
        email: user.email,
        subject: 'Your 2FA Login Code',
        html: otpTemplate(otp, user.fullName)
      });

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again'
        });
      }

      return res.status(200).json({
        success: true,
        message: '2FA enabled. Please check your email for OTP',
        requires2FA: true,
        userId: user._id,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      });
    }

    const token = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    user.updatedAt = Date.now();
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobileno: user.mobileno,
          age: user.age,
          role: user.role,
          isEmailVerified: user.verificationStatus.isEmailVerified,
          isMobileVerified: user.verificationStatus.isMobileVerified,
          twoFactorEnabled: user.twoFactorAuth.isEnabled,
          cart: user.cart
        },
        token
      }
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

// @desc    Logout user
// @route   POST /api/user/logout
// @access  Private
const Logout = async (req, res) => {
  try {
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0)
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful'
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

// @desc    Get current user profile
// @route   GET /api/user/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    let user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Fix cart structure if needed
    user = ensureCartStructure(user);
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify email
// @route   POST /api/user/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      'verificationStatus.emailVerificationToken': hashedToken,
      'verificationStatus.verificationTokenExpiry': { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.verificationStatus.isEmailVerified = true;
    user.verificationStatus.emailVerificationToken = undefined;
    user.verificationStatus.verificationTokenExpiry = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email Verification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification',
      error: error.message
    });
  }
};

// @desc    Verify mobile OTP
// @route   POST /api/user/verify-mobile
// @access  Private
const verifyMobile = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (
      user.verificationStatus.mobileVerificationOTP !== otp ||
      user.verificationStatus.verificationTokenExpiry < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.verificationStatus.isMobileVerified = true;
    user.verificationStatus.mobileVerificationOTP = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Mobile number verified successfully'
    });
  } catch (error) {
    console.error('Mobile Verification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during mobile verification',
      error: error.message
    });
  }
};

// @desc    Forgot Password
// @route   POST /api/user/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }

    try {
      validateEmail(email);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const emailSent = await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      html: passwordResetTemplate(resetUrl, user.fullName)
    });

    if (!emailSent) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Reset Password
// @route   POST /api/user/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const { token } = req.params;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide password and confirm password'
      });
    }

    try {
      validatePassword(password);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password'
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Enable 2FA
// @route   POST /api/user/enable-2fa
// @access  Private
const enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.verificationStatus.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email before enabling 2FA'
      });
    }

    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push({
        code,
        used: false
      });
    }

    user.twoFactorAuth.isEnabled = true;
    user.twoFactorAuth.backupCodes = backupCodes;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: '2FA enabled successfully. Save these backup codes securely!',
      backupCodes: backupCodes.map(bc => bc.code)
    });
  } catch (error) {
    console.error('Enable 2FA Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Disable 2FA
// @route   POST /api/user/disable-2fa
// @access  Private
const disable2FA = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your password to disable 2FA'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    user.twoFactorAuth.isEnabled = false;
    user.twoFactorAuth.secret = undefined;
    user.twoFactorAuth.backupCodes = [];

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Disable 2FA Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify 2FA OTP and complete login
// @route   POST /api/user/verify-2fa-login
// @access  Public
const verify2FALogin = async (req, res) => {
  try {
    const { userId, otp, backupCode } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!otp && !backupCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide OTP or backup code'
      });
    }

    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Fix cart structure
    user = ensureCartStructure(user);

    let verified = false;

    if (otp) {
      if (!user.otp || user.otp.purpose !== 'login') {
        return res.status(400).json({
          success: false,
          message: 'No OTP request found'
        });
      }

      if (user.otp.expiresAt < Date.now()) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired'
        });
      }

      if (user.otp.code !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }

      verified = true;
      user.otp = undefined;
    }

    if (backupCode && !verified) {
      const backupCodeIndex = user.twoFactorAuth.backupCodes.findIndex(
        bc => bc.code === backupCode.toUpperCase() && !bc.used
      );

      if (backupCodeIndex === -1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or already used backup code'
        });
      }

      verified = true;
      user.twoFactorAuth.backupCodes[backupCodeIndex].used = true;
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Verification failed'
      });
    }

    const token = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    user.updatedAt = Date.now();
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobileno: user.mobileno,
          age: user.age,
          role: user.role,
          isEmailVerified: user.verificationStatus.isEmailVerified,
          isMobileVerified: user.verificationStatus.isMobileVerified,
          twoFactorEnabled: user.twoFactorAuth.isEnabled,
          cart: user.cart
        },
        token
      }
    });
  } catch (error) {
    console.error('Verify 2FA Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Resend 2FA OTP
// @route   POST /api/user/resend-2fa-otp
// @access  Public
const resend2FAOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = {
      code: otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      purpose: 'login'
    };

    await user.save({ validateBeforeSave: false });

    const emailSent = await sendEmail({
      email: user.email,
      subject: 'Your New 2FA Login Code',
      html: otpTemplate(otp, user.fullName)
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP'
      });
    }

    res.status(200).json({
      success: true,
      message: 'New OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  Signup,
  Login: LoginWith2FA,
  Logout,
  getProfile,
  verifyEmail,
  verifyMobile,
  forgotPassword,
  resetPassword,
  enable2FA,
  disable2FA,
  verify2FALogin,
  resend2FAOTP
};