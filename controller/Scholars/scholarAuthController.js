const memberPlans = require("../../models/memberPlans");
const Payment = require("../../models/payment");
const membershipSubscription = require("../../models/membershipSubscription");
const User = require("../../models/user");
const ScholarshipApplication = require("../../models/scholarshipAppicationModel");
const UserDocument = require("../../models/userDocument");

const { decrypt } = require("../../utils/encryption");
const generateToken = require("../../utils/generateToken");
const bcrypt = require("bcryptjs");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { uploadToDrive } = require("../../utils/uploadToDrive");
const { uploadFileToDrive } = require("../../utils/googleDriveUpload");

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
        populate: {
          path: "documentsRequired",
          select: "title",
        },
      })
      .populate({
        path: "plan",
        select: "planTitle amount planDuration maxScholarships",
      });

    /* =========================
       EXTRACT DOCUMENTS SERVER SIDE
    ========================= */

    let requiredDocuments = [];

    if (subscription?.selectedScholarships?.length) {
      const docSet = new Map();

      subscription.selectedScholarships.forEach((item) => {
        item.scholarship?.documentsRequired?.forEach((doc) => {
          docSet.set(doc._id.toString(), {
            id: doc._id,
            title: doc.title,
          });
        });
      });

      requiredDocuments = Array.from(docSet.values());
    }

    res.json({
      success: true,
      user,
      membershipPlan: subscription?.plan || null,
      selectedScholarships: subscription?.selectedScholarships || [],
      requiredDocuments,
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

// exports.uploadDocument = async (req, res) => {
//   const { scholarshipId, documentName } = req.body;

//   const user = await User.findById(req.user.id);

//   const driveFolderId = user.googleDriveFolderId;

//   const file = req.file;

//   const driveFile = await uploadToDrive(file, driveFolderId);

//   let application = await ScholarshipApplication.findOne({
//     user: req.user.id,
//     scholarship: scholarshipId,
//   });

//   if (!application) {
//     application = await ScholarshipApplication.create({
//       user: req.user.id,
//       scholarship: scholarshipId,
//       documents: [],
//     });
//   }

//   application.documents.push({
//     documentName,
//     fileUrl: driveFile.webViewLink,
//     googleDriveFileId: driveFile.id,
//   });

//   await application.save();

//   res.json({
//     success: true,
//   });
// };

exports.uploadDocuments = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const userFolderId = user.googleDriveFolderId;

    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        message: "No files uploaded",
      });
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          message: `${file.originalname} exceeds 5MB`,
        });
      }
    }

    let documentNames = req.body.documentNames;

    // Fix for single document upload
    if (!Array.isArray(documentNames)) {
      documentNames = [documentNames];
    }

    let uploadedDocs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const docName = documentNames[i];

      const uploadResult = await uploadFileToDrive(
        file,
        `${docName}-${Date.now()}`,
        userFolderId,
      );

      const existingDoc = await UserDocument.findOne({
        user: userId,
        "document.documentName": docName,
      });

      if (existingDoc) {
        // Replace existing document
        existingDoc.fileUrl = uploadResult.fileUrl;
        existingDoc.googleDriveFileId = uploadResult.fileId;

        existingDoc.document.verificationStatus = "pending";
        existingDoc.document.verifiedBy = null;
        existingDoc.document.verifiedAt = null;

        await existingDoc.save();

        uploadedDocs.push(existingDoc);
      } else {
        const newDoc = await UserDocument.create({
          user: userId,
          document: {
            documentName: docName,
            verificationStatus: "pending",
          },
          fileUrl: uploadResult.fileUrl,
          googleDriveFileId: uploadResult.fileId,
        });

        uploadedDocs.push(newDoc);
      }
    }

    res.json({
      success: true,
      message: "Documents uploaded successfully",
      documents: uploadedDocs,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Upload failed",
    });
  }
};

exports.getUserDocuments = async (req, res) => {
  try {
    const userId = req.user.id;

    const documents = await UserDocument.find({
      user: userId,
    });

    res.json({
      success: true,
      documents,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch documents",
    });
  }
};

exports.verifyUserDocument = async (req, res) => {
  try {
    const { documentId, status } = req.body;

    const doc = await UserDocument.findById(documentId);

    if (!doc) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    doc.document.verificationStatus = status;
    doc.document.verifiedBy = req.admin.id;
    doc.document.verifiedAt = new Date();

    await doc.save();

    res.json({
      success: true,
      message: "Document verification updated",
    });
  } catch (error) {
    res.status(500).json({
      message: "Verification failed",
    });
  }
};

exports.applyScholarship = async (req, res) => {
  try {
    const userId = req.user.id;
    const { scholarshipId } = req.body;

    // ✅ Check if already applied
    const existing = await ScholarshipApplication.findOne({
      user: userId,
      scholarship: scholarshipId,
    });

    if (existing) {
      return res.status(400).json({
        message: "You have already applied for this scholarship",
      });
    }

    // ✅ Create application
    const application = await ScholarshipApplication.create({
      user: userId,
      scholarship: scholarshipId,
      status: "submitted",
    });

    res.json({
      success: true,
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to apply",
    });
  }
};

exports.getUserApplicationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { scholarshipId } = req.params;

    const application = await ScholarshipApplication.findOne({
      user: userId,
      scholarship: scholarshipId,
    });

    if (!application) {
      return res.json({
        applied: false,
      });
    }

    res.json({
      applied: true,
      status: application.status,
      appliedAt: application.createdAt,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to fetch application status",
    });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await ScholarshipApplication.find({
      user: userId,
    })
      .populate("scholarship")
      .lean();

    // Convert to map for easy frontend use
    const formatted = applications.map((app) => ({
      scholarshipId: app.scholarship?._id,
      status: app.status,
      appliedAt: app.createdAt,
    }));

    res.json({
      applications: formatted,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to fetch applications",
    });
  }
};
