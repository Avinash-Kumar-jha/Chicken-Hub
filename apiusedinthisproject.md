npm install --save-dev nodemon jest supertest
```

---

## 🌐 Complete API Route Structure
```
BASE_URL: http://localhost:5000/api

# Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/forgot-password
PUT    /api/auth/reset-password/:token
PUT    /api/auth/update-password

# Users
GET    /api/users/profile
PUT    /api/users/profile
PUT    /api/users/update-avatar
POST   /api/users/add-address
PUT    /api/users/address/:addressId
DELETE /api/users/address/:addressId
GET    /api/users/orders
GET    /api/users/orders/:id
POST   /api/users/review-product/:productId
POST   /api/users/review-website

# Products (Public)
GET    /api/products
GET    /api/products/:id
GET    /api/products/search?q=chicken
GET    /api/products/category/:categorySlug
GET    /api/products/featured
GET    /api/products/best-sellers

# Cart
GET    /api/cart
POST   /api/cart/add
PUT    /api/cart/update/:itemId
DELETE /api/cart/remove/:itemId
DELETE /api/cart/clear

# Orders
POST   /api/orders/create
GET    /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id/cancel
GET    /api/orders/:id/track
POST   /api/orders/:id/review

# Payment
POST   /api/payment/create-intent
POST   /api/payment/verify
POST   /api/payment/webhook (Stripe/Razorpay webhook)
GET    /api/payment/history

# Coupons
GET    /api/coupons/validate/:code
GET    /api/coupons (user coupons)

# Reviews
GET    /api/reviews/product/:productId
POST   /api/reviews/product/:productId
PUT    /api/reviews/:reviewId
DELETE /api/reviews/:reviewId

# Admin - Dashboard
GET    /api/admin/dashboard/stats
GET    /api/admin/dashboard/recent-orders
GET    /api/admin/dashboard/analytics

# Admin - Products
POST   /api/admin/products
PUT    /api/admin/products/:id
DELETE /api/admin/products/:id
PUT    /api/admin/products/:id/stock

# Admin - Orders
GET    /api/admin/orders
GET    /api/admin/orders/:id
PUT    /api/admin/orders/:id/status
PUT    /api/admin/orders/:id/assign-delivery
DELETE /api/admin/orders/:id

# Admin - Users
GET    /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
PUT    /api/admin/users/:id/role

# Admin - Categories
POST   /api/admin/categories
PUT    /api/admin/categories/:id
DELETE /api/admin/categories/:id
GET    /api/admin/categories

# Admin - Coupons
POST   /api/admin/coupons
PUT    /api/admin/coupons/:id
DELETE /api/admin/coupons/:id
GET    /api/admin/coupons

# Admin - Reviews (Moderation)
GET    /api/admin/reviews/pending
PUT    /api/admin/reviews/:id/approve
DELETE /api/admin/reviews/:id

# Delivery Partner
GET    /api/delivery/dashboard
GET    /api/delivery/assigned-orders
GET    /api/delivery/orders/:id
PUT    /api/delivery/orders/:id/status
PUT    /api/delivery/orders/:id/location
POST   /api/delivery/orders/:id/report-issue
GET    /api/delivery/earnings

# Public Routes
GET    /api/public/categories
GET    /api/public/faqs
GET    /api/public/about
POST   /api/public/contact
GET    /api/public/banners