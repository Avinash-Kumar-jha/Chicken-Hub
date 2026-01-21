const express = require('express');
const authRouter = express.Router();

const {
  Login,
  Signup,
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
} = require('../controllers/UserAuthent');

const { protect } = require('../middleware/Auth.js');

// Public routes
authRouter.post('/signup', Signup);
authRouter.post('/login', Login);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password/:token', resetPassword);
authRouter.post('/verify-2fa-login', verify2FALogin);
authRouter.post('/resend-2fa-otp', resend2FAOTP);

// Protected routes
authRouter.post('/logout', protect, Logout);
authRouter.get('/profile', protect, getProfile);
authRouter.post('/verify-mobile', protect, verifyMobile);
authRouter.post('/enable-2fa', protect, enable2FA);
authRouter.post('/disable-2fa', protect, disable2FA);

module.exports = authRouter;