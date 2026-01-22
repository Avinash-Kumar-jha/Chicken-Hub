const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Security middleware
app.use(helmet());

// -------------------- CORS --------------------
const corsOptions = {
  origin: function (origin, callback) {
    // In production, allow all origins or specify your frontend URL
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
          'http://localhost:5174',
          'https://chicken-hub.onrender.com',
          'https://your-frontend-domain.com' // Add your frontend URL here
        ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      process.env.NODE_ENV === 'development' ||
      origin.includes('render.com') // Allow render subdomains
    ) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// -------------------- BODY PARSERS --------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// -------------------- LOGGING --------------------
app.use(morgan('dev'));

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    time: new Date().toISOString(),
    service: 'ChickenHub API 🐔',
    version: '1.0.0'
  });
});

// ==================== CATEGORIES ROUTE (FIX: Add this missing route) ====================
app.get('/api/categories', async (req, res) => {
  try {
    // This should come from your Category model
    const categories = [
      { _id: '1', name: 'Fresh Chicken', slug: 'fresh-chicken', image: '' },
      { _id: '2', name: 'Marinated Chicken', slug: 'marinated-chicken', image: '' },
      { _id: '3', name: 'Ready to Cook', slug: 'ready-to-cook', image: '' },
      { _id: '4', name: 'Chicken Products', slug: 'chicken-products', image: '' }
    ];
    
    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

// ==================== AI COOKING ROUTES ====================
const chatbotRoutes = require('./routes/chatbotRoutes');
app.use('/api/chatbot', chatbotRoutes);

// ====================== Returns ==================================
const returnRoutes = require('./routes/returnRoutes');
app.use('/api/returns', returnRoutes);

// ==================== PRODUCT ROUTES (INCLUDES REVIEWS) ====================
const productRoutes = require('./routes/productsRoutes');
app.use('/api/products', productRoutes);

// ==================== USER ROUTES ====================
const authRouter = require('./routes/UserAuth');
app.use('/api/user', authRouter);

const cartRouter = require('./routes/cart');
app.use('/api/cart', cartRouter);

const orderRoutes = require('./routes/orderRoutes');
app.use('/api/orders', orderRoutes);

// ==================== FEEDBACK ROUTES ====================
const feedbackRoutes = require('./routes/FeedbackRoutes');
app.use('/api/feedback', feedbackRoutes);

// ===================== Delivery Routes ===============
const deliveryEarningsRoutes = require('./routes/delivery/deliveryEarningsRoutes');
const deliveryDashboardRoutes = require('./routes/delivery/deliveryDashboardRoutes');
const deliveryOrdersRoutes = require('./routes/delivery/deliveryOrdersRoutes');
const deliveryAuthRoutes = require('./routes/delivery/deliveryAuthRoutes');

app.use('/api/delivery/auth', deliveryAuthRoutes);
app.use('/api/delivery/orders', deliveryOrdersRoutes);
app.use('/api/delivery/dashboard', deliveryDashboardRoutes);
app.use('/api/delivery/earning', deliveryEarningsRoutes);

// ==================== ADMIN ROUTES ====================
const adminAuthRoutes = require('./routes/admin/adminAuthRoutes');
const adminDashboardRoutes = require('./routes/admin/adminDashboardRoutes');
const adminProductRoutes = require('./routes/admin/adminProductRoutes');
const adminOrderRoutes = require('./routes/admin/adminOrderRoutes');
const adminUserRoutes = require('./routes/admin/adminUserRoutes');
const adminCategoryRoutes = require('./routes/admin/adminCategoryRoutes');
const adminCouponRoutes = require('./routes/admin/adminCouponRoutes');
const adminReviewRoutes = require('./routes/admin/adminReviewRoutes');

// Admin auth routes
app.use('/api/admin/auth', adminAuthRoutes);

// Admin protected routes
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/coupons', adminCouponRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);

// -------------------- AI COOKING HEALTH --------------------
app.get('/api/ai-cooking/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Cooking Assistant is ready',
    timestamp: new Date().toISOString()
  });
});

// -------------------- ROOT --------------------
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to ChickenHub API 🐔',
    endpoints: {
      ai_cooking: '/api/chatbot',
      products: '/api/products',
      categories: '/api/categories', // Added this
      user_auth: '/api/user',
      cart: '/api/cart',
      admin: '/api/admin',
      reviews: '/api/reviews',
      feedback: '/api/feedback',
      health: '/api/health'
    }
  });
});

// -------------------- 404 --------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/categories', // Added this
      'GET /api/products',
      'GET /api/products/:id',
      'GET /api/products/:id/reviews',
      'POST /api/products/:id/reviews',
      'POST /api/chatbot/ask',
      'POST /api/feedback',
      'GET /api/feedback/user'
    ]
  });
});

// -------------------- ERROR HANDLER --------------------
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy error',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// -------------------- SERVER --------------------
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => { // Listen on all interfaces
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Base URL: http://0.0.0.0:${PORT}`);
  console.log(`🔗 Products API: http://localhost:${PORT}/api/products`);
  console.log(`🔗 Categories API: http://localhost:${PORT}/api/categories`);
  console.log(`🔗 Cart API: http://localhost:${PORT}/api/cart`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// -------------------- SAFETY --------------------
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
