const validator = require('validator');

// Validate email
const validateEmail = (email) => {
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email format');
  }
  return true;
};

// Validate password strength
const validatePassword = (password) => {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  if (password.length > 16) {
    throw new Error('Password must not exceed 16 characters');
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }

  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new Error('Password must contain at least one special character');
  }

  return true;
};

// Validate mobile number
const validateMobile = (mobile) => {
  const mobileRegex = /^[6-9]\d{9}$/; // Indian mobile number format
  if (!mobileRegex.test(mobile)) {
    throw new Error('Invalid mobile number. Must be 10 digits starting with 6-9');
  }
  return true;
};

// Validate full name
const validateFullName = (name) => {
  if (!validator.isLength(name, { min: 3, max: 50 })) {
    throw new Error('Full name must be between 3 and 50 characters');
  }

  if (!/^[a-zA-Z\s]+$/.test(name)) {
    throw new Error('Full name can only contain letters and spaces');
  }

  return true;
};

// Validate age
const validateAge = (age) => {
  if (!validator.isInt(age.toString(), { min: 10, max: 100 })) {
    throw new Error('Age must be between 10 and 100');
  }
  return true;
};

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
  return validator.escape(input.trim());
};

module.exports = {
  validateEmail,
  validatePassword,
  validateMobile,
  validateFullName,
  validateAge,
  sanitizeInput
};