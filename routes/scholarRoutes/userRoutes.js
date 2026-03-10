const express = require("express");
const router = express.Router();

const UserController = require("../../controller/Scholars/userController");

router.post("/create-user", UserController.createUser);
router.get("/:id", UserController.getUser);

module.exports = router;
