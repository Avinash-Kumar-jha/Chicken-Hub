// Assuming you have these models
const Order = require("../../models/Order");
const User = require("../../models/User");
const Product = require("../../models/Product");

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Total counts
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalProducts = await Product.countDocuments();

    // Today's orders
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today },
    });

    // Monthly revenue
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          orderStatus: { $in: ["delivered", "completed"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    // Pending orders
    const pendingOrders = await Order.countDocuments({
      orderStatus: "pending",
    });

    res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: {
        totalOrders,
        totalUsers,
        totalProducts,
        todayOrders,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        pendingOrders,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};

// @desc    Get recent orders
// @route   GET /api/admin/dashboard/recent-orders
// @access  Private/Admin
const getRecentOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "fullName email mobileno")
      .select("orderNumber totalAmount orderStatus createdAt");

    res.status(200).json({
      success: true,
      message: "Recent orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent orders",
      error: error.message,
    });
  }
};

// @desc    Get analytics data
// @route   GET /api/admin/dashboard/analytics
// @access  Private/Admin
const getAnalytics = async (req, res) => {
  try {
    const { period = "week" } = req.query; // week, month, year

    let startDate;
    const today = new Date();

    switch (period) {
      case "week":
        startDate = new Date(today.setDate(today.getDate() - 7));
        break;
      case "month":
        startDate = new Date(today.setMonth(today.getMonth() - 1));
        break;
      case "year":
        startDate = new Date(today.setFullYear(today.getFullYear() - 1));
        break;
      default:
        startDate = new Date(today.setDate(today.getDate() - 7));
    }

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Revenue trend
    const revenueTrend = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $in: ["delivered", "completed"] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top products
    const topProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.price" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Analytics fetched successfully",
      data: {
        ordersByStatus,
        revenueTrend,
        topProducts,
        period,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getRecentOrders,
  getAnalytics,
};