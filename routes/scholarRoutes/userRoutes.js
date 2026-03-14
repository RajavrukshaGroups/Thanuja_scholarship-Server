const express = require("express");
const router = express.Router();

const UserController = require("../../controller/Scholars/userController");
const ScholarAuthController = require("../../controller/Scholars/scholarAuthController");
const ScholarAuth = require("../../middleware/scholarAuthMiddleware");
const upload = require("../../middleware/multer");

/* ===============================
   AUTH
================================ */

router.post("/login", ScholarAuthController.loginScholar);

/* ===============================
   USER CREATION
================================ */

router.post("/create-user", UserController.createUser);

/* ===============================
   PROFILE
================================ */

router.get("/profile", ScholarAuth, ScholarAuthController.getScholarProfile);
router.put("/profile", ScholarAuth, ScholarAuthController.updateScholarProfile);
router.post(
  "/scholar/subscription/update-scholarships",
  ScholarAuth,
  ScholarAuthController.updateSelectedScholarships,
);
router.get(
  "/scholar/membership/upgrade-options",
  ScholarAuth,
  ScholarAuthController.getUpgradePlans,
);
router.post(
  "/scholar/membership/create-upgrade-order",
  ScholarAuth,
  ScholarAuthController.createUpgradeOrder,
);
router.post(
  "/scholar/membership/verify-upgrade-payement",
  ScholarAuth,
  ScholarAuthController.verifyUpgradePayment,
);

router.post(
  "/scholar/upload-document",
  ScholarAuth,
  upload.single("document"),
  ScholarAuthController.uploadDocument,
);

/* ===============================
   GET USER BY ID (KEEP LAST)
================================ */

router.get("/:id", UserController.getUser);

module.exports = router;
