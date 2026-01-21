// migrations/fixCartSchema.js
// Run this ONCE to fix existing users with old cart schema

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const fixCartSchema = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to database');

    // Find all users with array-type cart
    const usersWithArrayCart = await User.find({
      cart: { $type: 'array' }
    });

    console.log(`Found ${usersWithArrayCart.length} users with old cart schema`);

    // Fix each user
    for (const user of usersWithArrayCart) {
      console.log(`Fixing cart for user: ${user.email}`);
      
      // Convert array cart to object cart
      user.cart = {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        lastUpdated: new Date()
      };

      await user.save({ validateBeforeSave: false });
      console.log(`✅ Fixed ${user.email}`);
    }

    // Also fix any users with undefined/null cart
    const usersWithNoCart = await User.find({
      $or: [
        { cart: null },
        { cart: { $exists: false } }
      ]
    });

    console.log(`Found ${usersWithNoCart.length} users with no cart`);

    for (const user of usersWithNoCart) {
      console.log(`Adding cart to user: ${user.email}`);
      
      user.cart = {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        lastUpdated: new Date()
      };

      await user.save({ validateBeforeSave: false });
      console.log(`✅ Added cart to ${user.email}`);
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
fixCartSchema();