const Razorpay = require("razorpay");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Payment = require("../../models/payment");
const MembershipPlan = require("../../models/memberPlans");
const MembershipSubscription = require("../../models/membershipSubscription");
const User = require("../../models/user");
const Enquiry = require("../../models/enquiredUsers");
const sendMail = require("../../utils/sendEmail");
const generatePassword = require("../../utils/generatePassword");
const { createUserFolder } = require("../../utils/googleDrive");
const generateUserId = require("../../utils/generateUserId");
const { encrypt } = require("../../utils/encryption");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* =====================================================
   CREATE ORDER
===================================================== */

exports.createOrder = async (req, res) => {
  try {
    const { planId, enquiryId, userData, scholarships } = req.body;

    /* ================================
       VALIDATE INPUT
    ================================= */

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    if (!userData?.email || !userData?.phone) {
      return res.status(400).json({
        success: false,
        message: "Email and phone are required",
      });
    }

    /* ================================
       CHECK IF USER ALREADY EXISTS
    ================================= */

    const existingUser = await User.findOne({
      $or: [{ email: userData.email }, { phone: userData.phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or phone already exists. Please login.",
      });
    }

    /* ================================
       GET MEMBERSHIP PLAN
    ================================= */

    const plan = await MembershipPlan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Membership plan not found",
      });
    }

    /* ================================
       CREATE RAZORPAY ORDER
    ================================= */

    const options = {
      amount: plan.amount * 100, // Razorpay expects paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        enquiryId: enquiryId || "",
        planId: planId.toString(),
      },
    };

    const order = await razorpay.orders.create(options);

    /* ================================
       SAVE PAYMENT SNAPSHOT
    ================================= */

    await Payment.create({
      enquiry: enquiryId || null,
      plan: planId,
      amount: plan.amount,

      razorpayOrderId: order.id,
      status: "created",
      paymentType:"membership",

      userSnapshot: {
        fullName: userData.fullName || "",
        email: userData.email || "",
        phone: userData.phone || "",
        educationLevel: userData.educationLevel || "",
        degreeLevel: userData.degreeLevel || "",
      },

      scholarshipsSnapshot: (scholarships || []).map((sch) => ({
        scholarship: sch._id || sch.scholarship,
        name: sch.name,
      })),
    });

    /* ================================
       RETURN ORDER TO FRONTEND
    ================================= */

    res.status(200).json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create Order Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
    });
  }
};

/* =====================================================
   VERIFY PAYMENT
===================================================== */

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    /* =============================
       VERIFY SIGNATURE
    ============================== */

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    /* =============================
       FIND PAYMENT RECORD
    ============================== */

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    /* =============================
       PREVENT DUPLICATE PROCESSING
    ============================== */

    if (payment.status === "success") {
      return res.json({
        success: true,
        message: "Payment already processed",
      });
    }

    /* =============================
       UPDATE PAYMENT STATUS
    ============================== */

    payment.status = "success";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    await payment.save();

    /* =============================
       USER SNAPSHOT
    ============================== */

    const userData = payment.userSnapshot;

    userData.email = userData.email.toLowerCase().trim();
    userData.phone = userData.phone?.trim();

    const scholarships = payment.scholarshipsSnapshot;
    const planId = payment.plan;

    if (!userData?.email) {
      return res.status(400).json({
        success: false,
        message: "User snapshot missing",
      });
    }

    /* =============================
       FIND OR CREATE USER
    ============================== */

    let user = await User.findOne({
      $or: [{ email: userData.email }, { phone: userData.phone }],
    });

    let rawPassword = null;

    if (!user) {
      rawPassword = generatePassword();

      const encryptedPassword = encrypt(rawPassword);

      console.log("Generated password:", rawPassword);
      console.log("Encrypted password:", encryptedPassword);

      const userId = generateUserId();

      const userPayload = {
        userId,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        educationLevel: userData.educationLevel,
        password: encryptedPassword,
      };

      if (userData.degreeLevel) {
        userPayload.degreeLevel = userData.degreeLevel;
      }

      user = await User.create(userPayload);

      /* =============================
         GOOGLE DRIVE FOLDER
      ============================== */

      const folderName = `${user.fullName}-${user.userId}`;

      const folderId = await createUserFolder(folderName);

      user.googleDriveFolderId = folderId;

      await user.save();

      /* =============================
         SEND LOGIN EMAIL
      ============================== */

      const LOGO_URL = process.env.EDU_FIN_LOGO;

      await sendMail({
        to: user.email,
        subject: "🎉 Welcome to Edufin Scholarships",
        html: `
  <div style="font-family: Arial, sans-serif; background:#f5f7fb; padding:30px;">
    
    <div style="max-width:550px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.08);">
      
      <!-- HEADER -->
<div style="background:#ffffff; padding:30px 20px; text-align:center; border-bottom:1px solid #eee;">
<img 
  src="${LOGO_URL}" 
  alt="Edufin" 
  style="height:80px; object-fit:contain;" 
/>      </div>

      <!-- CONTENT -->
      <div style="padding:30px;">
        
        <h2 style="text-align:center;">Welcome, ${user.fullName} 🎉</h2>

        <p style="color:#555; font-size:14px; text-align:center;">
          Your scholarship membership has been successfully activated.
        </p>

        <!-- LOGIN BOX -->
        <div style="
          margin:25px 0;
          padding:20px;
          background:#f9f9f9;
          border-radius:10px;
        ">
          <p><strong>User ID:</strong> ${user.userId}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Password:</strong> 
            <span style="background:#eee; padding:5px 8px; border-radius:5px;">
              ${rawPassword}
            </span>
          </p>
        </div>

        <p style="font-size:14px; color:#555;">
          Please login and change your password immediately for security.
        </p>

        <!-- BUTTON -->
        <div style="text-align:center; margin-top:25px;">
          <a href="https://yourdomain.com/login" 
             style="
               background:#000;
               color:#fff;
               padding:12px 20px;
               text-decoration:none;
               border-radius:8px;
               display:inline-block;
             ">
            Login to Dashboard
          </a>
        </div>

      </div>

      <!-- FOOTER -->
      <div style="background:#f9f9f9; padding:15px; text-align:center; font-size:12px; color:#888;">
        © ${new Date().getFullYear()} Edufin Scholarships. All rights reserved.
      </div>

    </div>
  </div>
  `,
      });
    }

    /* =============================
       GET PLAN
    ============================== */

    const plan = await MembershipPlan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Membership plan not found",
      });
    }

    /* =============================
       CHECK EXISTING SUBSCRIPTION
    ============================== */

    const activeSubscription = await MembershipSubscription.findOne({
      user: user._id,
      status: "active",
      expiryDate: { $gt: new Date() },
    }).populate("plan");

    if (activeSubscription) {
      if (activeSubscription.plan._id.toString() === planId.toString()) {
        return res.status(400).json({
          success: false,
          message: "You already have this plan active",
        });
      }

      if (plan.amount < activeSubscription.plan.amount) {
        return res.status(400).json({
          success: false,
          message: "Downgrade not allowed while subscription is active",
        });
      }

      await MembershipSubscription.updateMany(
        { user: user._id, status: "active" },
        { status: "expired" },
      );
    }

    /* =============================
       CREATE SUBSCRIPTION
    ============================== */

    const startDate = new Date();

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.planDuration);

    const subscription = await MembershipSubscription.create({
      user: user._id,
      plan: planId,
      startDate,
      expiryDate,
      selectedScholarships: (scholarships || []).map((sch) => ({
        scholarship: sch.scholarship || sch._id,
        name: sch.name,
      })),
    });

    /* =============================
       LINK USER TO PAYMENT
    ============================== */

    payment.user = user._id;
    await payment.save();

    /* =============================
       SUCCESS RESPONSE
    ============================== */

    res.json({
      success: true,
      message: "Payment verified successfully",
      user,
      subscription,
    });
  } catch (err) {
    console.error("Verify Payment Error:", err);

    res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};

/* =====================================================
   RAZORPAY WEBHOOK
===================================================== */

exports.webhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const signature = req.headers["x-razorpay-signature"];

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(req.body) // req.body is raw buffer here
      .digest("hex");

    if (generatedSignature !== signature) {
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === "payment.failed") {
      const orderId = event.payload.payment.entity.order_id;

      await Payment.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { status: "failed" },
      );
    }

    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Webhook error");
  }
};
