const membershipSubscription = require("../../models/membershipSubscription");
const User = require("../../models/user");
const { decrypt } = require("../../utils/encryption");
const generateToken = require("../../utils/generateToken");
const bcrypt = require("bcryptjs");

/* ================================
   SCHOLAR LOGIN
================================ */

exports.loginScholar = async (req, res) => {
  try {
    let { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifier and password are required",
      });
    }

    identifier = identifier.trim();
    password = password.trim();

    const user = await User.findOne({
      $or: [
        { userId: identifier },
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
      isActive: true,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid User Id or Password",
      });
    }

    const decryptedPassword = decrypt(user.password);

    if (decryptedPassword !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid User Id or Password",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ================================
   GET PROFILE
================================ */

exports.getScholarProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    const subscription = await membershipSubscription.findOne({
      user: req.user.id,
      status: "active",
    });

    res.json({
      success: true,
      user,
      selectedScholarships: subscription?.selectedScholarships || [],
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================================
   UPDATE PROFILE
================================ */

exports.updateScholarProfile = async (req, res) => {
  try {
    const { fullName, phone } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.fullName = fullName || user.fullName;
    user.phone = phone || user.phone;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
