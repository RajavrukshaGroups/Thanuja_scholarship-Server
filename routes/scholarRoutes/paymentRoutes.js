const express = require("express");
const router = express.Router();
const PaymentController = require("../../controller/Scholars/paymentController");

router.post("/create-order", PaymentController.createOrder);
router.post("/verify-payment", PaymentController.verifyPayment);
router.post("/webhook", PaymentController.webhook);

module.exports = router;
