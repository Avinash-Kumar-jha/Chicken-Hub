// middleware/rateLimit.js - FIXED VERSION
const rateLimit = require('express-rate-limit');

const cookingAssistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many requests to AI Cooking Assistant. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator or use the default
});

module.exports = cookingAssistantLimiter;