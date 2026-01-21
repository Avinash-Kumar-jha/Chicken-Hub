backend/
├── config/
│   ├── database.js
│   ├── cloudinary.js (for product images)
│   └── payment.js (Stripe/Razorpay config)
│
├── middleware/
│   ├── auth.js (verify JWT tokens)
│   ├── roleCheck.js (user/admin/delivery)
│   ├── errorHandler.js
│   └── upload.js (multer for images)
│
├── models/
│   ├── User.js
│   ├── Admin.js
│   ├── DeliveryPartner.js
│   ├── Product.js
│   ├── Order.js
│   ├── Cart.js
│   ├── Payment.js
│   └── Review.js
│
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── admin.routes.js
│   ├── delivery.routes.js
│   ├── product.routes.js
│   ├── order.routes.js
│   ├── payment.routes.js
│   └── cart.routes.js
│
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── adminController.js
│   ├── deliveryController.js
│   ├── productController.js
│   ├── orderController.js
│   ├── paymentController.js
│   └── cartController.js
│
├── utils/
│   ├── jwtToken.js
│   ├── sendEmail.js
│   ├── apiFeatures.js
│   └── errorResponse.js
│
└── server.js

Routes for auth 
POST   /api/auth/register              - User registration
POST   /api/auth/login                 - User login
POST   /api/auth/logout                - Logout
GET    /api/auth/me                    - Get current user
POST   /api/auth/forgot-password       - Send reset email
PUT    /api/auth/reset-password/:token - Reset password
PUT    /api/auth/update-password       - Update password (logged in)

2. User Routes (/api/users)
GET    /api/users/profile              - Get user profile
PUT    /api/users/profile              - Update profile
GET    /api/users/orders               - Get user's orders
GET    /api/users/orders/:id           - Get specific order
POST   /api/users/orders/:id/review    - Review order/product
GET    /api/users/track/:orderId       - Track order

3. Admin Route 
GET    /api/admin/dashboard            - Dashboard stats
GET    /api/admin/users                - Get all users
GET    /api/admin/users/:id            - Get user details
PUT    /api/admin/users/:id            - Update user
DELETE /api/admin/users/:id            - Delete user

GET    /api/admin/orders               - Get all orders
GET    /api/admin/orders/:id           - Get order details
PUT    /api/admin/orders/:id/status    - Update order status
DELETE /api/admin/orders/:id           - Cancel order

POST   /api/admin/products             - Create product
PUT    /api/admin/products/:id         - Update product
DELETE /api/admin/products/:id         - Delete product

GET    /api/admin/assigned-delivery    - Get delivery assignments
POST   /api/admin/assign-delivery      - Assign order to delivery

4. Delivery Partner Route 
GET    /api/delivery/dashboard         - Dashboard stats
GET    /api/delivery/orders            - Get assigned orders
GET    /api/delivery/orders/:id        - Get order details
PUT    /api/delivery/orders/:id/status - Update delivery status
POST   /api/delivery/orders/:id/report - Report issue
GET    /api/delivery/earnings          - Get earnings

5. Product Route 

GET    /api/products                   - Get all products (public)
GET    /api/products/:id               - Get single product (public)
GET    /api/products/search            - Search products
GET    /api/products/category/:cat     - Filter by category
POST   /api/products/:id/review        - Add review (authenticated)

6. Cart Routes (/api/cart)
GET    /api/cart                       - Get user cart
POST   /api/cart                       - Add to cart
PUT    /api/cart/:itemId               - Update cart item
DELETE /api/cart/:itemId               - Remove from cart
DELETE /api/cart                       - Clear cart

7. Order Routes (/api/orders)
POST   /api/orders                     - Create order (checkout)
GET    /api/orders                     - Get user orders
GET    /api/orders/:id                 - Get order details
PUT    /api/orders/:id/cancel          - Cancel order
GET    /api/orders/:id/track           - Track order
POST   /api/orders/:id/review          - Review order

8. Payment Routes (/api/payment)
POST   /api/payment/create-intent      - Create payment intent (Stripe)
POST   /api/payment/verify             - Verify payment
POST   /api/payment/webhook            - Payment webhook (Stripe/Razorpay)
GET    /api/payment/history            - Get payment history
POST   /api/payment/refund             - Process refund (admin)

9. Public Routes (/api/public)
GET    /api/public/about               - About page data
GET    /api/public/contact             - Contact info
POST   /api/public/contact             - Submit contact form
GET    /api/public/faq                 - FAQs
GET    /api/public/returns-policy      - Returns policy
GET    /api/public/ai-cooking-help     - AI cooking tips

Database Schema Quick Reference
User Model
javascript{
  name, email, password (hashed), phone,
  avatar, address[], 
  role: ['user', 'admin', 'delivery'],
  isVerified, resetPasswordToken, resetPasswordExpire,
  createdAt
}
Product Model
javascript{
  name, description, price, category,
  images[], stock, ratings, numReviews,
  reviews: [{user, rating, comment, createdAt}],
  isAvailable, createdAt
}
Order Model
javascript{
  user: userId,
  items: [{product, quantity, price}],
  shippingAddress: {},
  paymentInfo: {method, status, transactionId},
  itemsPrice, taxPrice, shippingPrice, totalPrice,
  orderStatus: ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'],
  deliveryPartner: userId,
  deliveredAt, createdAt
}
Cart Model
javascript{
  user: userId,
  items: [{product, quantity, price}],
  totalPrice, updatedAt
}

Step-by-Step Starting Guide
Week 1: Setup & Auth

Initialize Node.js project (npm init)
Install dependencies: express, mongoose, bcryptjs, jsonwebtoken, dotenv, cors, express-validator
Setup MongoDB connection
Create User model with password hashing
Build auth routes (register, login, logout)
Implement JWT middleware
Test with Postman

Week 2: Core Logic

Create Product model and routes
Create Order model and routes
Create Cart model and routes
Implement admin dashboard APIs
Test order flow

Week 3: Delivery & Payment

Extend User model for delivery partners
Build delivery assignment logic
Integrate payment gateway (Stripe recommended for beginners)
Test complete checkout flow


Tech Stack Recommendation

Backend: Node.js + Express
Database: MongoDB + Mongoose
Auth: JWT + bcryptjs
Payment: Stripe (easier) or Razorpay (India)
File Upload: Cloudinary or AWS S3
Email: Nodemailer
API Testing: Postman

<!-- Message Queue will be added at the end  -->
<!-- Rate limiting -->
