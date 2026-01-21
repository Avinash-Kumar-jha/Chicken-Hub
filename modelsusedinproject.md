Complete Models Overview for Chicken Delivery Website
Here's a comprehensive list of all models you'll need for your project:

1. User Model ✅ (Already Discussed)
Purpose: Store customer information and authentication
Key Data:

Personal info (name, email, phone, age, password)
Multiple addresses (home, work with pincode, district, state)
Recent 3 orders (quick access)
Order statistics (total orders, total spent)
Current cart snapshot
Recent 5 payments
Product reviews
Website feedback
Role (user/admin/delivery)
Verification status


2. Product Model 🍗
Purpose: Store chicken products catalog
Key Data:

Product name (e.g., "Whole Chicken", "Chicken Breast", "Chicken Wings")
Description (fresh, frozen, marinated, etc.)
Category (whole, cuts, marinated, ready-to-cook, combos)
Price (current price)
Original price (for showing discounts)
Weight/Size options (500g, 1kg, etc.)
Stock quantity (available pieces)
Images (multiple product images)
Nutritional info (protein, calories, etc.)
Is available (in stock or out of stock)
Average rating (calculated from reviews)
Total reviews count
Tags (halal, fresh, organic, antibiotic-free)
Best before date / Expiry tracking
Preparation instructions
Created by (admin who added)
Created date


3. Order Model 📦
Purpose: Store complete order history and details
Key Data:

User reference (who placed order)
Order items (products, quantities, prices at time of order)
Order number (unique identifier like #ORD-2024-001)
Shipping address (full address with pincode, district, state)
Billing address (if different from shipping)
Order status (Pending → Confirmed → Preparing → Packed → Out for Delivery → Delivered → Cancelled)
Payment info (method, status, transaction ID)
Pricing breakdown:

Items subtotal
Delivery charges
Tax/GST
Discount applied
Final total amount


Delivery partner assigned (reference to User with delivery role)
Estimated delivery time
Actual delivery time
Order notes/special instructions
Cancellation reason (if cancelled)
Refund status (if applicable)
Tracking updates timeline
Created date
Updated date


4. Cart Model 🛒
Purpose: Temporary storage of items user wants to buy
Key Data:

User reference
Cart items array:

Product reference
Quantity
Price at time of adding
Selected weight/size


Cart total value
Discount codes applied
Last updated timestamp
Expires after (auto-clear old carts after 7 days)

Note: Can also store cart in User model itself (like you have), but separate model is better for:

Guest users (before login)
Analytics on abandoned carts
Cart recovery emails


5. Payment Model 💳
Purpose: Store complete payment transaction history
Key Data:

User reference
Order reference
Transaction ID (from payment gateway)
Payment method (Card, UPI, COD, Wallet)
Payment gateway (Stripe, Razorpay, PayPal)
Amount paid
Currency (INR, USD)
Payment status (Success, Failed, Pending, Refunded)
Gateway response (raw response from payment gateway)
Refund details (if refunded)

Refund amount
Refund reason
Refund date
Refund transaction ID


Payment screenshot (for COD confirmation)
Payment date
Created timestamp


6. Review Model ⭐
Purpose: Store product reviews and ratings
Key Data:

User reference (who reviewed)
Product reference (which product)
Order reference (which order - ensures verified purchase)
Rating (1-5 stars)
Review title
Review comment/description
Images (user uploaded photos of product)
Helpful votes count (how many found it helpful)
Is verified purchase (badge for real buyers)
Admin response (if admin replies to review)
Is approved (moderation)
Created date


7. Category Model 📋
Purpose: Organize products into categories
Key Data:

Category name (e.g., "Whole Chicken", "Chicken Cuts", "Marinated", "Ready to Cook")
Category slug (for URLs like /products/marinated)
Description
Category image
Parent category (for subcategories)

Example: "Chicken Cuts" → "Breast", "Thigh", "Wings"


Is active (show/hide category)
Display order (sorting)
Product count (how many products in this category)
Created date


8. Coupon/Discount Model 🎫
Purpose: Store discount codes and promotional offers
Key Data:

Coupon code (e.g., "FIRST50", "WELCOME100")
Discount type (percentage or flat amount)
Discount value (50% or ₹100)
Minimum order value (apply only if order > ₹500)
Maximum discount cap (max ₹200 off)
Valid from date
Valid till date
Usage limit per user (1 time per user)
Total usage limit (first 100 users)
Current usage count
Applicable to (all products or specific categories)
Is active
Created by (admin)


9. DeliveryPartner Model 🏍️
Purpose: Store delivery person details and stats
Key Data:

Personal info (name, email, phone)
Vehicle details (bike number, type)
License number
Aadhar/ID proof
Photo
Current status (Available, Busy, Offline)
Current location (lat, long) - for live tracking
Assigned orders (current deliveries)
Delivery statistics:

Total deliveries completed
On-time delivery rate
Average delivery time
Customer ratings
Total earnings


Bank details (for payments)
Joined date
Is active/verified

Note: Can be combined with User model using role='delivery', but separate model gives more flexibility for delivery-specific fields.

10. Address Model 📍
Purpose: Store user addresses separately (optional - you can keep in User model)
Key Data:

User reference
Address type (Home, Work, Other)
Full address
Landmark
City
District
State
Pincode
Is default address
Latitude/Longitude (for map integration)
Delivery instructions
Contact person name (if different)
Contact phone (if different)


11. Notification Model 🔔
Purpose: Store in-app notifications for users
Key Data:

User reference
Notification type (Order update, Offer, Payment, Delivery)
Title
Message
Link/Action (where to redirect on click)
Is read (true/false)
Created date
Expires at (auto-delete old notifications)


12. WebsiteFeedback Model 💬
Purpose: Store user feedback about website experience
Key Data:

User reference (optional - can be anonymous)
Rating (1-5 stars)
Feedback category (UI/UX, Delivery, Product Quality, Customer Service)
Comment/Suggestion
Page URL (where feedback was given)
Device info (mobile/desktop)
Is resolved
Admin notes
Created date


13. FAQ Model ❓
Purpose: Store frequently asked questions
Key Data:

Question
Answer
Category (Orders, Delivery, Payment, Products, Returns)
Display order (sorting)
Is active
View count (how many times viewed)
Created/Updated date


14. ContactMessage Model 📧
Purpose: Store contact form submissions
Key Data:

Name
Email
Phone
Subject
Message
Status (New, In Progress, Resolved)
Admin notes
Responded at
Created date


15. Banner/Slider Model 🎨
Purpose: Store homepage banners and promotional sliders
Key Data:

Title
Description
Image (desktop & mobile versions)
Link URL (where banner redirects)
Button text (e.g., "Shop Now")
Display order
Start date
End date
Is active
Click count (analytics)


16. AdminActivity Model 📊
Purpose: Track admin actions for audit trail
Key Data:

Admin user reference
Action type (Created Product, Updated Order, Deleted User, etc.)
Entity type (Product, Order, User)
Entity ID (which product/order was modified)
Old value (before change)
New value (after change)
IP address
Timestamp


17. Inventory Model 📦
Purpose: Track product stock management
Key Data:

Product reference
Current stock
Low stock threshold (alert when below this)
Reorder quantity
Supplier info
Last restocked date
Stock location (warehouse/section)
Expiry date tracking
Stock movement history:

Date
Type (Added, Sold, Damaged, Returned)
Quantity
Reason




18. Promocode Usage Model 🎟️
Purpose: Track who used which promocode
Key Data:

User reference
Coupon reference
Order reference
Discount received
Used at (timestamp)


19. Analytics Model 📈
Purpose: Store daily/monthly analytics data
Key Data:

Date
Total orders
Total revenue
New users
Returning customers
Top selling products
Average order value
Delivery success rate
Payment success rate
Category-wise sales


20. ReturnRequest Model 🔄
Purpose: Handle product return requests
Key Data:

User reference
Order reference
Product reference
Return reason
Description
Images (proof of issue)
Status (Requested, Approved, Rejected, Completed)
Refund amount
Pickup date
Admin notes
Created date


Priority Order for Building Models:
Phase 1 (Core - Start Here):

User
Product
Category
Cart
Order

Phase 2 (Essential):

Payment
Review
Coupon
Address (if separate)

Phase 3 (Important):

DeliveryPartner
Notification
WebsiteFeedback
ContactMessage

Phase 4 (Nice to Have):

FAQ
Banner
Inventory
Analytics
ReturnRequest
PromocodeUsage
AdminActivity


Models You Might NOT Need (Yet):

Wishlist Model - Users can save favorite products for later
Subscription Model - If you plan weekly/monthly chicken delivery subscriptions
Referral Model - If you add referral program (refer friend, get discount)
Wallet Model - If users can store money in website wallet
Recipe Model - If you want to share chicken recipes
Blog Model - If you plan to add blog/articles section
