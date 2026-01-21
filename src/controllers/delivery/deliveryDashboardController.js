// controllers/delivery/deliveryDashboardController.js
const Order = require('../../models/Order');
const DeliveryPerson = require('../../models/DeliveryPerson');

// @desc    Get dashboard stats
// @route   GET /api/delivery/dashboard/stats
// @access  Private (Delivery)
exports.getDashboardStats = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id);

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count today's deliveries
    const todayDeliveries = await Order.countDocuments({
      deliveryPerson: req.deliveryPerson.id,
      orderStatus: 'Delivered',
      deliveredAt: { $gte: today, $lt: tomorrow }
    });

    // Count assigned orders (pending + out for delivery)
    const assignedOrders = await Order.countDocuments({
      deliveryPerson: req.deliveryPerson.id,
      orderStatus: { $in: ['Preparing', 'out_for_delivery'] }
    });

    // Count active orders (currently delivering)
    const activeOrders = await Order.countDocuments({
      deliveryPerson: req.deliveryPerson.id,
      orderStatus: 'out_for_delivery'
    });

    // Calculate today's active hours (you can track this via login/logout)
    const activeHours = 6.5; // Mock for now, implement tracking later

    const stats = {
      assigned: assignedOrders,
      active: activeOrders,
      todayDeliveries,
      completed: deliveryPerson.completedDeliveries,
      earnings: deliveryPerson.todayEarnings,
      totalEarnings: deliveryPerson.totalEarnings,
      rating: deliveryPerson.rating,
      totalRatings: deliveryPerson.totalRatings,
      activeHours,
      isOnline: deliveryPerson.isOnline,
      isAvailable: deliveryPerson.isAvailable
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get Dashboard Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get recent activity
// @route   GET /api/delivery/dashboard/activity
// @access  Private (Delivery)
exports.getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get recent delivered orders
    const recentOrders = await Order.find({
      deliveryPerson: req.deliveryPerson.id,
      orderStatus: 'Delivered'
    })
      .select('_id orderStatus deliveredAt user')
      .populate('user', 'name')
      .sort({ deliveredAt: -1 })
      .limit(limit);

    // Format activity
    const activity = recentOrders.map(order => ({
      id: order._id,
      action: 'Order Delivered',
      orderId: `#${order._id.toString().slice(-6).toUpperCase()}`,
      time: getTimeAgo(order.deliveredAt),
      customerName: order.user?.name || 'Customer'
    }));

    res.status(200).json({
      success: true,
      count: activity.length,
      data: activity
    });

  } catch (error) {
    console.error('Get Recent Activity Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get earnings breakdown
// @route   GET /api/delivery/dashboard/earnings
// @access  Private (Delivery)
exports.getEarningsBreakdown = async (req, res) => {
  try {
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

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    const monthStart = new Date(today);
    monthStart.setDate(1);

    // Calculate weekly earnings
    const weeklyOrders = await Order.find({
      deliveryPerson: req.deliveryPerson.id,
      orderStatus: 'Delivered',
      deliveredAt: { $gte: weekStart }
    });

    const weeklyEarnings = weeklyOrders.reduce((sum, order) => 
      sum + (order.deliveryCharge || 50), 0
    );

    // Calculate monthly earnings
    const monthlyOrders = await Order.find({
      deliveryPerson: req.deliveryPerson.id,
      orderStatus: 'Delivered',
      deliveredAt: { $gte: monthStart }
    });

    const monthlyEarnings = monthlyOrders.reduce((sum, order) => 
      sum + (order.deliveryCharge || 50), 0
    );

    res.status(200).json({
      success: true,
      data: {
        today: deliveryPerson.todayEarnings,
        week: weeklyEarnings,
        month: monthlyEarnings,
        total: deliveryPerson.totalEarnings,
        avgPerDelivery: deliveryPerson.completedDeliveries > 0 
          ? (deliveryPerson.totalEarnings / deliveryPerson.completedDeliveries).toFixed(2)
          : 0
      }
    });

  } catch (error) {
    console.error('Get Earnings Breakdown Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to get time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}