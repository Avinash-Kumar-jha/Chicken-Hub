// middleware/errorHandler.js
const rateLimit = require('express-rate-limit');

// Custom Error Classes
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message || 'Validation failed', 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = 15 * 60 * 1000; // 15 minutes in milliseconds
  }
}

// Global Error Handler
const globalErrorHandler = (err, req, res, next) => {
  // Default error response
  const errorResponse = {
    success: false,
    status: 'error',
    message: process.env.NODE_ENV === 'production' && !err.isOperational 
      ? 'Something went wrong!' 
      : err.message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Development mode details
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.error = {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      isOperational: err.isOperational
    };
    
    // Log complete error in development
    console.error('\n❌ ======== ERROR DETAILS ========');
    console.error(`📛 Name: ${err.name}`);
    console.error(`📝 Message: ${err.message}`);
    console.error(`🔢 Status Code: ${err.statusCode || 500}`);
    console.error(`📍 Path: ${req.method} ${req.originalUrl}`);
    console.error(`📦 Body:`, req.body);
    console.error(`🎯 Params:`, req.params);
    console.error(`❓ Query:`, req.query);
    console.error(`📡 IP: ${req.ip}`);
    console.error(`🕒 Time: ${new Date().toISOString()}`);
    console.error(`📋 Stack: ${err.stack}`);
    console.error('===================================\n');
  } else {
    // Production logging (structured)
    const logError = {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString(),
      userAgent: req.get('user-agent')
    };
    
    // Different logging based on error type
    if (err.statusCode >= 500) {
      console.error('🔴 SERVER ERROR:', logError);
    } else if (err.statusCode === 429) {
      console.warn('🟡 RATE LIMIT EXCEEDED:', logError);
    } else if (err.statusCode === 401 || err.statusCode === 403) {
      console.warn('🔐 AUTH ERROR:', logError);
    } else if (err.statusCode === 404) {
      console.warn('🔍 NOT FOUND:', logError);
    } else {
      console.warn('🟠 CLIENT ERROR:', logError);
    }
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.message = 'Validation failed';
    errorResponse.errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  if (err.name === 'CastError') {
    errorResponse.message = `Invalid ${err.path}: ${err.value}`;
    errorResponse.field = err.path;
    errorResponse.value = err.value;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    errorResponse.message = `Duplicate value for ${field}`;
    errorResponse.field = field;
    errorResponse.value = err.keyValue[field];
  }

  if (err.name === 'JsonWebTokenError') {
    errorResponse.message = 'Invalid token. Please log in again.';
    errorResponse.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.message = 'Your token has expired. Please log in again.';
    errorResponse.statusCode = 401;
  }

  if (err.name === 'MongoError') {
    errorResponse.message = 'Database error occurred';
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = err.message;
    }
  }

  // Handle rate limiting errors
  if (err.name === 'RateLimitError' || err.statusCode === 429) {
    errorResponse.message = 'Too many requests, please try again later';
    errorResponse.retryAfter = err.retryAfter || 900; // Default 15 minutes in seconds
    errorResponse.details = process.env.NODE_ENV === 'development' ? {
      limit: err.limit,
      remaining: err.remaining,
      resetTime: err.resetTime
    } : undefined;
  }

  // Final status code
  const statusCode = err.statusCode || 500;

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Not found handler
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`);
  next(error);
};

// 404 Route handler
const routeNotFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    status: 'fail',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  routeNotFoundHandler
};