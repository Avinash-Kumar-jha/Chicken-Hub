const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  orderItemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'Product damaged/defective',
      'Wrong item delivered',
      'Size/fit issues',
      'Product not as described',
      'Quality not satisfactory',
      'Changed my mind',
      'Found better price elsewhere',
      'Received extra item',
      'Missing parts/accessories',
      'Delivery delay',
      'Other'
    ]
  },
  description: {
    type: String,
    trim: true
  },
  images: [{
    url: String,
    public_id: String
  }],
  status: {
    type: String,
    enum: [
      'pending',
      'approved',
      'rejected',
      'pickup_scheduled',
      'pickup_completed',
      'in_transit_to_warehouse',
      'received_at_warehouse',
      'quality_check_passed',
      'quality_check_failed',
      'refund_initiated',
      'refund_completed',
      'exchange_initiated',
      'exchange_delivered',
      'cancelled'
    ],
    default: 'pending'
  },
  pickupAddress: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String,
    phoneNumber: String
  },
  pickupDate: Date,
  pickupTimeSlot: String,
  pickupAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryAgent'
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  refundAmount: {
    type: Number,
    min: 0
  },
  refundMethod: {
    type: String,
    enum: ['original_payment', 'store_credit', 'bank_transfer', 'wallet']
  },
  refundTransactionId: String,
  refundDate: Date,
  exchangeProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  exchangeSize: String,
  exchangeColor: String,
  adminNotes: [{
    note: String,
    adminId: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now }
  }],
  qualityCheckNotes: String,
  rejectionReason: String,
  trackingNumber: String,
  courierPartner: String,
  estimatedRefundDate: Date,
  isPickupCompleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
returnSchema.index({ userId: 1, status: 1 });
returnSchema.index({ orderId: 1 });
returnSchema.index({ status: 1 });
returnSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Return', returnSchema);