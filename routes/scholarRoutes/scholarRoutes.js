const express = require("express");
const router = express.Router();

const ListScholarshipsController = require("../../controller/Scholars/scholarListScholarship");

const userRoutes = require("./userRoutes");
const paymentRoutes = require("./paymentRoutes");

router.get("/scholarships", ListScholarshipsController.getScholarships);
router.get(
  "/scholarships/featured",
  ListScholarshipsController.getFeaturedScholarships,
);
router.get(
  "/scholarships/:slug",
  ListScholarshipsController.getScholarshipBySlug,
);
router.get("/dropdown/fields", ListScholarshipsController.getFieldsDropdown);
router.get("/dropdown/types", ListScholarshipsController.getTypesDropdown);
router.get(
  "/dropdown/sponsors",
  ListScholarshipsController.getSponsorsDropdown,
);
router.get("/filter-stats", ListScholarshipsController.getFilterStats);
router.post("/enquiry", ListScholarshipsController.createEnquiry);
router.get("/membership-plans", ListScholarshipsController.getMembershipPlans);
router.post("/contact", ListScholarshipsController.contactAdmin);

/* ===============================
   USER ROUTES
================================ */
router.use("/user", userRoutes);

/* ===============================
   PAYMENT ROUTES
================================ */
router.use("/payment", paymentRoutes);

module.exports = router;
