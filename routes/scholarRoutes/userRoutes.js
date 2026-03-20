const express = require("express");
const router = express.Router();

const UserController = require("../../controller/Scholars/userController");
const ScholarAuthController = require("../../controller/Scholars/scholarAuthController");
const ScholarAuth = require("../../middleware/scholarAuthMiddleware");
const upload = require("../../middleware/uploadMiddleware");

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
  (req, res, next) => {
    upload.array("documents")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message: err.message,
        });
      }
      next();
    });
  },
  ScholarAuthController.uploadDocuments,
);

router.get(
  "/scholar/documents",
  ScholarAuth,
  ScholarAuthController.getUserDocuments,
);

router.post(
  "/scholar/apply",
  ScholarAuth,
  ScholarAuthController.applyScholarship,
);

router.get(
  "/scholar/application-status/:scholarshipId",
  ScholarAuth,
  ScholarAuthController.getUserApplicationStatus,
);

router.get(
  "/scholar/my-applications",
  ScholarAuth,
  ScholarAuthController.getMyApplications,
);

router.post("/send-otp", ScholarAuthController.sendOtp);
router.post("/verify-otp", ScholarAuthController.verifyOtp);
router.post("/change-password", ScholarAuthController.changePassword);

/* ===============================
   GET USER BY ID (KEEP LAST)
================================ */

router.get("/:id", UserController.getUser);

module.exports = router;
