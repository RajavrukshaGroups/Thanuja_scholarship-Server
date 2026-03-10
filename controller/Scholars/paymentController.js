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

// exports.verifyPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//       planId,
//       scholarships,
//     } = req.body;

//     /* =============================
//        VERIFY SIGNATURE
//     ============================== */

//     const generatedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(razorpay_order_id + "|" + razorpay_payment_id)
//       .digest("hex");

//     if (generatedSignature !== razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: "Payment verification failed",
//       });
//     }

//     /* =============================
//        FIND PAYMENT RECORD
//     ============================== */

//     const payment = await Payment.findOne({
//       razorpayOrderId: razorpay_order_id,
//     });

//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         message: "Payment record not found",
//       });
//     }

//     /* =============================
//        UPDATE PAYMENT STATUS
//     ============================== */

//     payment.status = "success";
//     payment.razorpayPaymentId = razorpay_payment_id;
//     payment.razorpaySignature = razorpay_signature;

//     await payment.save();

//     /* =============================
//        GET USER DATA FROM SNAPSHOT
//     ============================== */

//     const userData = payment.userSnapshot;

//     if (!userData?.email) {
//       return res.status(400).json({
//         success: false,
//         message: "User snapshot data missing",
//       });
//     }

//     /* =============================
//        FIND OR CREATE USER
//     ============================== */

//     let user = await User.findOne({ email: userData.email });

//     if (!user) {
//       const userPayload = {
//         fullName: userData.fullName,
//         email: userData.email,
//         phone: userData.phone,
//         educationLevel: userData.educationLevel,
//       };

//       if (userData.degreeLevel) {
//         userPayload.degreeLevel = userData.degreeLevel;
//       }

//       user = await User.create(userPayload);
//     }
//     /* =============================
//        GET PLAN
//     ============================== */

//     const plan = await MembershipPlan.findById(planId);

//     if (!plan) {
//       return res.status(404).json({
//         success: false,
//         message: "Membership plan not found",
//       });
//     }

//     /* =============================
//        CREATE SUBSCRIPTION
//     ============================== */

//     const startDate = new Date();

//     const expiryDate = new Date();
//     expiryDate.setDate(expiryDate.getDate() + plan.planDuration);

//     const subscription = await MembershipSubscription.create({
//       user: user._id,
//       plan: planId,
//       startDate,
//       expiryDate,

//       selectedScholarships: (scholarships || []).map((sch) => ({
//         scholarship: sch._id,
//         name: sch.name,
//       })),
//     });

//     /* =============================
//        LINK USER TO PAYMENT
//     ============================== */

//     payment.user = user._id;
//     await payment.save();

//     /* =============================
//        SUCCESS RESPONSE
//     ============================== */

//     res.json({
//       success: true,
//       message: "Payment verified successfully",
//       user,
//       subscription,
//     });
//   } catch (err) {
//     console.error("Verify Payment Error:", err);

//     res.status(500).json({
//       success: false,
//       message: "Payment verification failed",
//     });
//   }
// };

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    /* =============================
       VERIFY RAZORPAY SIGNATURE
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
       UPDATE PAYMENT STATUS
    ============================== */

    payment.status = "success";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;

    await payment.save();

    /* =============================
       GET SNAPSHOT DATA
    ============================== */

    const userData = payment.userSnapshot;
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

    let user = await User.findOne({ email: userData.email });

    let generatedPassword = null;

    if (!user) {
      generatedPassword = generatePassword();
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      const userPayload = {
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        educationLevel: userData.educationLevel,
        password: hashedPassword,
      };

      if (userData.degreeLevel) {
        userPayload.degreeLevel = userData.degreeLevel;
      }

      user = await User.create(userPayload);

      //send welcome email
      await sendMail({
        to: user.email,
        subject: "🎉 Welcome to Edufin Scholarships",
        html: `
      <h2>Congratulations ${user.fullName} 🎉</h2>

      <p>Your scholarship membership has been activated successfully.</p>

      <p><b>Login Details</b></p>

      <p>Email: ${user.email}</p>
      <p>Password: <b>${generatedPassword}</b></p>

      <p>Please login and change your password.</p>

      <br/>

      <a href="https://yourdomain.com/login">
        Login to your account
      </a>

      <br/><br/>

      <p>Regards</p>
      <p><b>Edufin Scholarships Team</b></p>
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
       CHECK ACTIVE SUBSCRIPTION
    ============================== */

    const activeSubscription = await MembershipSubscription.findOne({
      user: user._id,
      status: "active",
      expiryDate: { $gt: new Date() },
    }).populate("plan");

    if (activeSubscription) {
      /* SAME PLAN */
      if (activeSubscription.plan._id.toString() === planId.toString()) {
        return res.status(400).json({
          success: false,
          message: "You already have this plan active",
        });
      }

      /* DOWNGRADE BLOCK */
      if (plan.amount < activeSubscription.plan.amount) {
        return res.status(400).json({
          success: false,
          message: "Downgrade not allowed while subscription is active",
        });
      }

      /* UPGRADE → EXPIRE OLD SUBSCRIPTION */
      await MembershipSubscription.updateMany(
        { user: user._id, status: "active" },
        { status: "expired" },
      );
    }

    /* =============================
       CREATE NEW SUBSCRIPTION
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
