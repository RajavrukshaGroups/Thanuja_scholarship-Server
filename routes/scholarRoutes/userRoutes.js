const express = require("express");
const router = express.Router();

const UserController = require("../../controller/Scholars/userController");
const ScholarAuthController = require("../../controller/Scholars/scholarAuthController");
const ScholarAuth = require("../../middleware/scholarAuthMiddleware");

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

/* ===============================
   GET USER BY ID (KEEP LAST)
================================ */

router.get("/:id", UserController.getUser);

module.exports = router;