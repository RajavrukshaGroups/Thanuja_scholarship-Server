const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    enquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
    },

    amount: Number,

    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    status: {
      type: String,
      enum: ["created", "success", "failed"],
      default: "created",
    },

    userSnapshot: {
      fullName: String,
      email: String,
      phone: String,
      educationLevel: String,
      degreeLevel: String,
    },
    paymentType: {
      type: String,
      enum: ["membership", "upgrade"],
    },

    scholarshipsSnapshot: [
      {
        scholarship: mongoose.Schema.Types.ObjectId,
        name: String,
      },
    ],
  },
  { timestamps: true },
);

paymentSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
