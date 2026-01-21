const Order = require("../../models/Order");
const User = require("../../models/User");
const DeliveryPerson = require("../../models/DeliveryPerson");

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.orderStatus = status;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("user", "fullName email mobileno")
      .populate("assignedTo", "name email phone");

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// @desc    Get single order
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "fullName email mobileno address")
      .populate("assignedTo", "name email phone vehicleType")
      .populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "packed",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
      "returned",
      "failed",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // If delivering, check if assigned to delivery person
    if (status === "out_for_delivery" && !order.assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Order must be assigned to a delivery person before marking as out for delivery",
      });
    }

    order.orderStatus = status;

    // Add status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user._id,
    });

    // If delivered, set delivery date and update delivery person stats
    if (status === "delivered") {
      order.deliveredAt = new Date();
      
      // Update delivery person stats
      if (order.assignedTo) {
        const deliveryPerson = await DeliveryPerson.findById(order.assignedTo);
        if (deliveryPerson) {
          deliveryPerson.activeOrders = deliveryPerson.activeOrders.filter(
            orderId => orderId.toString() !== order._id.toString()
          );
          deliveryPerson.completedDeliveries += 1;
          // Add commission (example: 10% of order total)
          const commission = order.totalAmount * 0.1;
          deliveryPerson.totalEarnings += commission;
          deliveryPerson.todayEarnings += commission;
          await deliveryPerson.save();
        }
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

// @desc    Assign order to delivery person
// @route   PUT /api/admin/orders/:id/assign-delivery
// @access  Private/Admin
const assignDelivery = async (req, res) => {
  try {
    const { deliveryPersonId } = req.body;

    console.log('Assigning delivery - Order ID:', req.params.id);
    console.log('Delivery Person ID:', deliveryPersonId);

    if (!deliveryPersonId) {
      return res.status(400).json({
        success: false,
        message: "Delivery person ID is required",
      });
    }

    // 1️⃣ Find delivery person
    const deliveryPerson = await DeliveryPerson.findById(deliveryPersonId);

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: "Delivery person not found",
      });
    }

    if (!deliveryPerson.isActive || !deliveryPerson.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Delivery person is not active or approved",
      });
    }

    // 2️⃣ Find order
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log('Current order status:', order.orderStatus);

    // Check if order is already assigned
    if (order.assignedTo && order.assignedTo.toString() === deliveryPersonId) {
      return res.status(400).json({
        success: false,
        message: "Order is already assigned to this delivery person",
      });
    }

    // If order was previously assigned to someone else, remove from their active orders
    if (order.assignedTo && order.assignedTo.toString() !== deliveryPersonId) {
      const previousDeliveryPerson = await DeliveryPerson.findById(order.assignedTo);
      if (previousDeliveryPerson) {
        previousDeliveryPerson.activeOrders = previousDeliveryPerson.activeOrders.filter(
          orderId => orderId.toString() !== order._id.toString()
        );
        await previousDeliveryPerson.save();
      }
    }

    // 3️⃣ Assign order
    order.assignedTo = deliveryPerson._id;
    
    // Store delivery person details for reference
    order.deliveryPersonDetails = {
      name: deliveryPerson.name,
      phone: deliveryPerson.phone,
      email: deliveryPerson.email,
      vehicleType: deliveryPerson.vehicleType
    };
    
    // Generate 6-digit OTP for delivery verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    order.deliveryOTP = otp;
    
    // Update status to "processing" if not already
    if (!["processing", "packed", "shipped", "out_for_delivery", "delivered"].includes(order.orderStatus)) {
      order.orderStatus = "processing";
    }

    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: `Assigned to ${deliveryPerson.name} (${deliveryPerson.phone}) by admin. Delivery OTP: ${otp}`,
      updatedBy: req.user._id,
    });

    await order.save();
    
    // 4️⃣ Add to delivery person active orders
    deliveryPerson.activeOrders.addToSet(order._id);
    await deliveryPerson.save();

    // Populate the order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'fullName email mobileno')
      .populate('assignedTo', 'name email phone vehicleType');

    res.status(200).json({
      success: true,
      message: "Order assigned to delivery person successfully",
      data: populatedOrder,
      deliveryOTP: otp,
      deliveryInfo: {
        deliveryPersonName: deliveryPerson.name,
        deliveryPersonEmail: deliveryPerson.email,
        deliveryPersonPhone: deliveryPerson.phone,
        vehicleType: deliveryPerson.vehicleType,
        otp: otp
      },
    });

  } catch (error) {
    console.error("Assign Delivery Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign delivery person",
      error: error.message,
    });
  }
};

// @desc    Unassign delivery person from order
// @route   PUT /api/admin/orders/:id/unassign-delivery
// @access  Private/Admin
const unassignDelivery = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Order is not assigned to any delivery person",
      });
    }

    // Remove from delivery person's active orders
    const deliveryPerson = await DeliveryPerson.findById(order.assignedTo);
    if (deliveryPerson) {
      deliveryPerson.activeOrders = deliveryPerson.activeOrders.filter(
        orderId => orderId.toString() !== order._id.toString()
      );
      await deliveryPerson.save();
    }

    // Update order
    const previousDeliveryPerson = order.deliveryPersonDetails;
    order.assignedTo = null;
    order.deliveryPersonDetails = null;
    order.deliveryOTP = null;
    
    // Update status to confirmed
    order.orderStatus = "confirmed";

    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: "confirmed",
      timestamp: new Date(),
      note: `Unassigned from ${previousDeliveryPerson?.name || 'delivery person'} by admin`,
      updatedBy: req.user._id,
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Delivery person unassigned successfully",
      data: order,
    });
  } catch (error) {
    console.error("Unassign Delivery Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unassign delivery person",
      error: error.message,
    });
  }
};

// @desc    Get all delivery persons
// @route   GET /api/admin/delivery-persons
// @access  Private/Admin
const getAllDeliveryPersons = async (req, res) => {
  try {
    const { isAvailable, isOnline, isApproved } = req.query;
    
    const query = {};
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';
    if (isOnline !== undefined) query.isOnline = isOnline === 'true';
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';

    const deliveryPersons = await DeliveryPerson.find(query)
      .select('-password') // Exclude password
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Delivery persons fetched successfully",
      data: deliveryPersons,
    });
  } catch (error) {
    console.error("Get delivery persons error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery persons",
      error: error.message,
    });
  }
};

// @desc    Get delivery person by ID
// @route   GET /api/admin/delivery-persons/:id
// @access  Private/Admin
const getDeliveryPersonById = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'activeOrders',
        select: 'orderNumber totalAmount deliveryAddress orderStatus createdAt',
        populate: {
          path: 'user',
          select: 'fullName phone'
        }
      });

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: "Delivery person not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Delivery person fetched successfully",
      data: deliveryPerson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery person",
      error: error.message,
    });
  }
};

// @desc    Update delivery person status
// @route   PUT /api/admin/delivery-persons/:id/status
// @access  Private/Admin
const updateDeliveryPersonStatus = async (req, res) => {
  try {
    const { isActive, isApproved, isAvailable } = req.body;

    const deliveryPerson = await DeliveryPerson.findById(req.params.id);

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: "Delivery person not found",
      });
    }

    if (isActive !== undefined) deliveryPerson.isActive = isActive;
    if (isApproved !== undefined) deliveryPerson.isApproved = isApproved;
    if (isAvailable !== undefined) deliveryPerson.isAvailable = isAvailable;

    await deliveryPerson.save();

    res.status(200).json({
      success: true,
      message: "Delivery person status updated successfully",
      data: deliveryPerson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update delivery person status",
      error: error.message,
    });
  }
};

// @desc    Get assigned delivery orders
// @route   GET /api/admin/assigned-delivery
// @access  Private/Admin
const getAssignedDeliveryOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      assignedTo: { $exists: true, $ne: null },
      orderStatus: { $nin: ['delivered', 'cancelled'] } // Only show active assigned orders
    })
      .populate("user", "fullName email mobileno")
      .populate("assignedTo", "name email phone vehicleType")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Assigned delivery orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch assigned orders",
      error: error.message,
    });
  }
};

// @desc    Get orders ready for assignment
// @route   GET /api/admin/orders-ready-for-delivery
// @access  Private/Admin
const getOrdersReadyForDelivery = async (req, res) => {
  try {
    const orders = await Order.find({
      orderStatus: { $in: ['confirmed', 'processing'] },
      assignedTo: null
    })
      .populate("user", "fullName email mobileno")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Orders ready for delivery fetched successfully",
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders ready for delivery",
      error: error.message,
    });
  }
};

// @desc    Delete/Cancel order
// @route   DELETE /api/admin/orders/:id
// @access  Private/Admin
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Only allow deletion of cancelled or pending orders
    if (!["cancelled", "pending"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Only cancelled or pending orders can be deleted",
      });
    }

    // If assigned, remove from delivery person's active orders
    if (order.assignedTo) {
      const deliveryPerson = await DeliveryPerson.findById(order.assignedTo);
      if (deliveryPerson) {
        deliveryPerson.activeOrders = deliveryPerson.activeOrders.filter(
          orderId => orderId.toString() !== order._id.toString()
        );
        await deliveryPerson.save();
      }
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  assignDelivery,
  unassignDelivery,
  deleteOrder,
  getAssignedDeliveryOrders,
  getOrdersReadyForDelivery,
  getAllDeliveryPersons,
  getDeliveryPersonById,
  updateDeliveryPersonStatus
};