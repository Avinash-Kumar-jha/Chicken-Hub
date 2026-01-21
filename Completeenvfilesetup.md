# Server
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/chickenshop

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Choose one)
# Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# SendGrid (Better for production)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourwebsite.com
FROM_NAME=Chicken Delivery

# Payment Gateways
# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Razorpay
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# SMS (Choose one)
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Fast2SMS (India)
FAST2SMS_API_KEY=your_fast2sms_api_key

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Admin Email
ADMIN_EMAIL=admin@yourwebsite.com
```

---

## 📚 Essential Links & Resources

### **Learning Resources**
```
1. MongoDB University (Free)
   https://university.mongodb.com

2. Express.js Documentation
   https://expressjs.com

3. Mongoose Documentation
   https://mongoosejs.com/docs

4. JWT Introduction
   https://jwt.io/introduction

5. REST API Best Practices
   https://restfulapi.net

6. Node.js Best Practices
   https://github.com/goldbergyoni/nodebestpractices
```

### **Testing APIs**
```
1. Postman
   https://www.postman.com

2. Insomnia
   https://insomnia.rest

3. Thunder Client (VS Code Extension)
   Search in VS Code extensions
```

---

## 🎯 Development Workflow
```
1. Setup project structure
   ├── Create folders (models, routes, controllers, etc.)
   ├── Initialize npm
   └── Install core packages

2. Setup database
   ├── Create MongoDB Atlas account
   ├── Create cluster
   ├── Get connection string
   └── Test connection

3. Build Authentication
   ├── User model
   ├── Register/Login routes
   ├── JWT middleware
   └── Test with Postman

4. Build Core Features
   ├── Products CRUD
   ├── Cart functionality
   ├── Order creation
   └── Test each feature

5. Integrate Third-party Services
   ├── Payment gateway
   ├── Email service
   ├── Image upload (Cloudinary)
   └── SMS (optional)

6. Add Admin Panel APIs
   ├── Dashboard stats
   ├── Product management
   ├── Order management
   └── User management

7. Testing
   ├── Unit tests (Jest)
   ├── API tests (Supertest)
   └── Manual testing (Postman)

8. Deployment
   ├── Choose hosting platform
   ├── Setup environment variables
   ├── Deploy backend
   ├── Setup custom domain (optional)
   └── Monitor and maintain