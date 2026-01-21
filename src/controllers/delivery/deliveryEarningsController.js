// controllers/delivery/deliveryEarningsController.js
const DeliveryPerson = require('../../models/DeliveryPerson');
const Order = require('../../models/Order');

// @desc    Get earnings summary
// @route   GET /api/delivery/earning/summary
// @access  Private (Delivery)
exports.getEarningsSummary = async (req, res) => {
  try {
    console.log('📊 Fetching earnings for delivery person:', req.deliveryPerson.id);

    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id);

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }

    // Get date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    const monthStart = new Date(today);
    monthStart.setMonth(today.getMonth());
    monthStart.setDate(1);

    // Get today's earnings - using assignedTo instead of deliveryPerson
    const todayOrders = await Order.find({
      assignedTo: req.deliveryPerson.id,
      orderStatus: 'delivered',
      deliveredAt: { $gte: today, $lt: tomorrow }
    });
    const todayEarnings = todayOrders.reduce((sum, order) => sum + (order.deliveryCharge || 50), 0);

    // Get weekly earnings
    const weeklyOrders = await Order.find({
      assignedTo: req.deliveryPerson.id,
      orderStatus: 'delivered',
      deliveredAt: { $gte: weekStart }
    });
    const weeklyEarnings = weeklyOrders.reduce((sum, order) => sum + (order.deliveryCharge || 50), 0);

    // Get monthly earnings
    const monthlyOrders = await Order.find({
      assignedTo: req.deliveryPerson.id,
      orderStatus: 'delivered',
      deliveredAt: { $gte: monthStart }
    });
    const monthlyEarnings = monthlyOrders.reduce((sum, order) => sum + (order.deliveryCharge || 50), 0);

    console.log('✅ Earnings fetched:', {
      today: todayEarnings,
      week: weeklyEarnings,
      month: monthlyEarnings,
      total: deliveryPerson.totalEarnings
    });

    res.status(200).json({
      success: true,
      data: {
        today: todayEarnings,
        week: weeklyEarnings,
        month: monthlyEarnings,
        total: deliveryPerson.totalEarnings || 0,
        todayDeliveries: todayOrders.length,
        weeklyDeliveries: weeklyOrders.length,
        monthlyDeliveries: monthlyOrders.length,
        totalDeliveries: deliveryPerson.completedDeliveries || 0
      }
    });

  } catch (error) {
    console.error('❌ Get Earnings Summary Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get earnings transactions
// @route   GET /api/delivery/earning/transactions
// @access  Private (Delivery)
exports.getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    console.log('📋 Fetching transactions for delivery person:', req.deliveryPerson.id);

    const orders = await Order.find({
      assignedTo: req.deliveryPerson.id,
      orderStatus: 'delivered'
    })
      .select('_id orderNumber totalAmount deliveryCharge deliveredAt user deliveryAddress')
      .populate('user', 'fullName name')
      .sort({ deliveredAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({
      assignedTo: req.deliveryPerson.id,
      orderStatus: 'delivered'
    });

    const transactions = orders.map(order => ({
      id: order._id,
      orderId: order.orderNumber || `#${order._id.toString().slice(-6).toUpperCase()}`,
      customerName: order.deliveryAddress?.fullName || order.user?.fullName || order.user?.name || 'Customer',
      amount: order.deliveryCharge || 50,
      date: order.deliveredAt,
      status: 'completed'
    }));

    console.log(`✅ Found ${transactions.length} transactions`);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: transactions
    });

  } catch (error) {
    console.error('❌ Get Transactions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Request withdrawal
// @route   POST /api/delivery/earning/withdraw
// @access  Private (Delivery)
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;

    console.log('💰 Withdrawal request:', { amount, deliveryPersonId: req.deliveryPerson.id });

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid withdrawal amount'
      });
    }

    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id);

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }

    if (amount > (deliveryPerson.totalEarnings || 0)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Minimum withdrawal check
    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is ₹100'
      });
    }

    // Check if bank details exist
    if (!deliveryPerson.bankDetails || !deliveryPerson.bankDetails.accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please add bank details before withdrawal'
      });
    }

    // Create withdrawal request (you can create a separate Withdrawal model)
    // For now, just return success
    // In production: Create withdrawal request, admin approves, then transfer

    console.log('✅ Withdrawal request submitted');

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully. Funds will be transferred within 2-3 business days.',
      data: {
        amount,
        requestedAt: new Date(),
        status: 'pending',
        bankAccount: `****${deliveryPerson.bankDetails.accountNumber.slice(-4)}`
      }
    });

  } catch (error) {
    console.error('❌ Request Withdrawal Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update bank details
// @route   PUT /api/delivery/earning/bank-details
// @access  Private (Delivery)
exports.updateBankDetails = async (req, res) => {
  try {
    const { accountNumber, ifscCode, accountHolderName, bankName } = req.body;

    console.log('🏦 Updating bank details for:', req.deliveryPerson.id);

    if (!accountNumber || !ifscCode || !accountHolderName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required bank details'
      });
    }

    const deliveryPerson = await DeliveryPerson.findByIdAndUpdate(
      req.deliveryPerson.id,
      {
        bankDetails: {
          accountNumber,
          ifscCode,
          accountHolderName,
          bankName
        }
      },
      { new: true }
    );

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }

    console.log('✅ Bank details updated');

    res.status(200).json({
      success: true,
      message: 'Bank details updated successfully',
      data: {
        bankDetails: {
          accountNumber: `****${accountNumber.slice(-4)}`,
          ifscCode,
          accountHolderName,
          bankName
        }
      }
    });

  } catch (error) {
    console.error('❌ Update Bank Details Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};