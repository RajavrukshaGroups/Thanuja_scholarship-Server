const express = require("express");
const router = express.Router();

const ListScholarshipsController = require("../../controller/Scholars/scholarListScholarship");

router.get("/scholarships", ListScholarshipsController.getScholarships);
router.get(
  "/scholarships/featured",
  ListScholarshipsController.getFeaturedScholarships,
);
router.get(
  "scholarships/:slug",
  ListScholarshipsController.getScholarshipBySlug,
);
router.get("/dropdown/fields", ListScholarshipsController.getFieldsDropdown);
router.get("/dropdown/types", ListScholarshipsController.getTypesDropdown);
router.get(
  "/dropdown/sponsors",
  ListScholarshipsController.getSponsorsDropdown,
);

module.exports = router;
