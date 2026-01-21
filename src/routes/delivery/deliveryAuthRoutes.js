// routes/deliveryAuthRoutes.js
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  toggleOnlineStatus,
  updateLocation
} = require('../../controllers/delivery/DeliveryAuthController');
const { protectDelivery } = require('../../middleware/deliveryAuth');
const DeliveryPerson = require('../../models/DeliveryPerson');

// TEMPORARY DEBUG ROUTES - REMOVE IN PRODUCTION
router.get('/debug/all', async (req, res) => {
  const all = await DeliveryPerson.find({});
  res.json({ count: all.length, data: all });
});

router.delete('/debug/clear-all', async (req, res) => {
  await DeliveryPerson.deleteMany({});
  res.json({ success: true, message: 'All delivery persons deleted' });
});

router.put('/debug/approve-all', async (req, res) => {
  await DeliveryPerson.updateMany({}, { isApproved: true, isActive: true });
  res.json({ success: true, message: 'All delivery persons approved' });
});

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (requires authentication)
router.use(protectDelivery); // Apply middleware to all routes below

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.put('/toggle-status', toggleOnlineStatus);
router.put('/location', updateLocation);

module.exports = router;