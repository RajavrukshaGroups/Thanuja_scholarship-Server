const memberPlans = require("../../models/memberPlans");
const Payment = require("../../models/payment");
const membershipSubscription = require("../../models/membershipSubscription");
const User = require("../../models/user");
const ScholarshipApplication = require("../../models/scholarshipAppicationModel");
const { decrypt } = require("../../utils/encryption");
const generateToken = require("../../utils/generateToken");
const bcrypt = require("bcryptjs");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { uploadToDrive } = require("../../utils/uploadToDrive");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

    const subscription = await membershipSubscription
      .findOne({
        user: req.user.id,
        status: "active",
      })
      .populate({
        path: "selectedScholarships.scholarship",
        select: "name eligibilityCriteria documentsRequired",
      })
      .populate({
        path: "plan",
        select: "planTitle amount planDuration maxScholarships",
      });

    res.json({
      success: true,
      user,
      membershipPlan: subscription?.plan || null,
      selectedScholarships: subscription?.selectedScholarships || [],
      startDate: subscription?.startDate,
      expiryDate: subscription?.expiryDate,
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

exports.updateSelectedScholarships = async (req, res) => {
  try {
    const { scholarships } = req.body;

    const subscription = await membershipSubscription.findOne({
      user: req.user.id,
      status: "active",
    });

    if (!subscription) {
      return res.status(404).json({
        message: "Active membership not found",
      });
    }

    const formattedScholarships = scholarships.map((s) => ({
      scholarship: s._id,
      name: s.name,
      selectedAt: new Date(),
    }));

    subscription.selectedScholarships = formattedScholarships;

    await subscription.save();

    res.json({
      success: true,
      message: "Scholarships updated successfully",
      selectedScholarships: subscription.selectedScholarships,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getUpgradePlans = async (req, res) => {
  try {
    const subscription = await membershipSubscription
      .findOne({
        user: req.user.id,
        status: "active",
      })
      .populate("plan");

    if (!subscription) {
      return res.status(404).json({
        message: "Active subscription not found",
      });
    }

    const currentPlan = subscription.plan;
    const today = new Date();

    // remaining days
    const remainingDays = Math.max(
      0,
      Math.ceil(
        (new Date(subscription.expiryDate) - today) / (1000 * 60 * 60 * 24),
      ),
    );

    // daily price
    const dailyPrice = currentPlan.amount / currentPlan.planDuration;

    // remaining value (never negative)
    const remainingValue = Math.max(0, Math.round(remainingDays * dailyPrice));

    // find upgrade plans
    const upgradePlans = await memberPlans
      .find({
        amount: { $gt: currentPlan.amount },
        isActive: true,
      })
      .sort({ amount: 1 });

    // calculate upgrade price
    const upgradePlansWithPrice = upgradePlans.map((plan) => {
      const upgradePrice = Math.max(
        0,
        Math.round(plan.amount - remainingValue),
      );

      return {
        ...plan.toObject(),
        upgradePrice,
      };
    });

    res.json({
      success: true,
      currentPlan,
      remainingDays,
      remainingValue,
      upgradePlans: upgradePlansWithPrice,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.createUpgradeOrder = async (req, res) => {
  try {
    const { planId } = req.body;

    const user = await User.findById(req.user.id);

    const subscription = await membershipSubscription
      .findOne({ user: req.user.id, status: "active" })
      .populate("plan");

    if (!subscription) {
      return res.status(404).json({ message: "Active subscription not found" });
    }

    const upgradePlan = await memberPlans.findById(planId);

    const today = new Date();

    const remainingDays = Math.max(
      0,
      Math.ceil(
        (new Date(subscription.expiryDate) - today) / (1000 * 60 * 60 * 24),
      ),
    );

    const dailyPrice =
      subscription.plan.amount / subscription.plan.planDuration;

    const remainingValue = Math.max(0, remainingDays * dailyPrice);

    const upgradePrice = Math.max(
      0,
      Math.round(upgradePlan.amount - remainingValue),
    );

    const order = await razorpay.orders.create({
      amount: upgradePrice * 100,
      currency: "INR",
      receipt: `upgrade_${Date.now()}`,
    });

    const payment = await Payment.create({
      user: req.user.id,
      plan: planId,
      amount: upgradePrice,
      razorpayOrderId: order.id,
      status: "created",
      paymentType: "upgrade",
      userSnapshot: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        educationLevel: user.educationLevel,
        degreeLevel: user.degreeLevel,
      },
      scholarshipsSnapshot: [],
    });

    res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID,
      upgradePrice,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyUpgradePayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Payment verification failed",
      });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    /* 🔒 Prevent duplicate upgrade */
    if (!payment || payment.status === "success") {
      return res.json({
        success: true,
        message: "Payment already processed",
      });
    }

    payment.status = "success";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;

    await payment.save();

    const subscription = await membershipSubscription
      .findOne({ user: payment.user, status: "active" })
      .populate("plan");

    const newPlan = await memberPlans.findById(planId);

    const today = new Date();

    const expiry = new Date();
    expiry.setDate(today.getDate() + newPlan.planDuration);

    subscription.previousPlan = subscription.plan._id;

    subscription.plan = newPlan._id;

    subscription.startDate = today;

    subscription.expiryDate = expiry;

    subscription.upgradeHistory.push({
      fromPlan: subscription.previousPlan,
      toPlan: newPlan._id,
      upgradeDate: today,
      paidAmount: payment.amount,
    });

    await subscription.save();

    res.json({
      success: true,
      message: "Membership upgraded successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadDocument = async (req, res) => {
  const { scholarshipId, documentName } = req.body;

  const user = await User.findById(req.user.id);

  const driveFolderId = user.googleDriveFolderId;

  const file = req.file;

  const driveFile = await uploadToDrive(file, driveFolderId);

  let application = await ScholarshipApplication.findOne({
    user: req.user.id,
    scholarship: scholarshipId,
  });

  if (!application) {
    application = await ScholarshipApplication.create({
      user: req.user.id,
      scholarship: scholarshipId,
      documents: [],
    });
  }

  application.documents.push({
    documentName,
    fileUrl: driveFile.webViewLink,
    googleDriveFileId: driveFile.id,
  });

  await application.save();

  res.json({
    success: true,
  });
};
