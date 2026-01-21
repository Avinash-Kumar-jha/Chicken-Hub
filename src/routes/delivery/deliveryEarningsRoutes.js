const express = require('express');
const router = express.Router();
const {
  getEarningsSummary,
  getTransactions,
  requestWithdrawal,
  updateBankDetails
} = require('../../controllers/delivery/deliveryEarningsController');
const { protectDelivery } = require('../../middleware/deliveryAuth');

router.use(protectDelivery);

router.get('/summary', getEarningsSummary);
router.get('/transactions', getTransactions);
router.post('/withdraw', requestWithdrawal);
router.put('/bank-details', updateBankDetails);

module.exports = router;
