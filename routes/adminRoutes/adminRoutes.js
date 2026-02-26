const express = require("express");
const router = express.Router();
const adminLoginController = require("../../controller/Admin/adminLoginController");
const adminSponsorController = require("../../controller/Admin/adminListScholarshipSponsors");
const adminScholarTypesController = require("../../controller/Admin/adminListScholarshipTypes");
const adminScholarships = require("../../controller/Admin/adminListScholarships");
const { protect } = require("../../middleware/authMiddleware");

//login,logout
router.post("/login", adminLoginController.loginDetails);
router.post("/logout", adminLoginController.logoutDetails);

//scholarship sponsors
router.post(
  "/create-sponsors",
  protect,
  adminSponsorController.addScholarshipSponsors,
);
router.get("/sponsors", protect, adminSponsorController.getAllSponsors);
router.put("/sponsors/:id", protect, adminSponsorController.updateSponsor);
router.delete("/sponsors/:id", protect, adminSponsorController.deleteSponsor);
router.patch(
  "/sponsors/status/:id",
  protect,
  adminSponsorController.toggleSponsorStatus,
);

//scholarship types
router.post(
  "/create-scholarshiptype",
  protect,
  adminScholarTypesController.addScholarshipType,
);
router.get(
  "/scholarship-types",
  protect,
  adminScholarTypesController.getAllScholarshipTypes,
);
router.put(
  "/scholarship-type/:id",
  protect,
  adminScholarTypesController.updateScholarshipTypes,
);
router.delete(
  "/scholarship-type/:id",
  protect,
  adminScholarTypesController.deleteScholarshipType,
);
router.patch(
  "/scholarship-type/status/:id",
  protect,
  adminScholarTypesController.toggleScholarshipTypeStatus,
);

//scholarships
router.post(
  "/create-scholarship-details",
  protect,
  adminScholarships.createScholarship,
);
router.get(
  "/view-all-scholarships",
  protect,
  adminScholarships.getAllScholarships,
);

router.put(
  "/scholarship-update/:id",
  protect,
  adminScholarships.updateScholarship,
);
router.delete(
  "/scholarship-delete/:id",
  protect,
  adminScholarships.deleteScholarship,
);
router.patch(
  "/scholarship/status/:id",
  protect,
  adminScholarships.toggleScholarshipStatus,
);

router.get(
  "/dropdown/sponsors",
  protect,
  adminScholarships.getSponsorsDropdown,
);

router.get("/dropdown/types", protect, adminScholarships.getTypesDropdown);
module.exports = router;
