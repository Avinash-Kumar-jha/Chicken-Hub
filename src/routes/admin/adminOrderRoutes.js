const express = require("express");
const router = express.Router();
const {
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
} = require("../../controllers/admin/adminOrderController");
const { authMiddleware, isAdmin } = require("../../middleware/adminAuth");

router.use(authMiddleware);
router.use(isAdmin);

// Order routes
router.get("/", getAllOrders);
router.get("/assigned-delivery", getAssignedDeliveryOrders);
router.get("/orders-ready-for-delivery", getOrdersReadyForDelivery);
router.get("/:id", getOrderById);
router.put("/:id/status", updateOrderStatus);
router.put("/:id/assign-delivery", assignDelivery);
router.put("/:id/unassign-delivery", unassignDelivery);
router.delete("/:id", deleteOrder);

// Delivery person management routes
router.get("/delivery-persons/all", getAllDeliveryPersons);
router.get("/delivery-persons/:id", getDeliveryPersonById);
router.put("/delivery-persons/:id/status", updateDeliveryPersonStatus);

module.exports = router;