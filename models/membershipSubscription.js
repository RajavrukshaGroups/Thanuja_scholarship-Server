const mongoose = require("mongoose");

const membershipSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },

    selectedScholarships: [
      {
        scholarship: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Scholarship",
        },

        name: String,

        selectedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "MembershipSubscription",
  membershipSubscriptionSchema,
);
