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

    previousPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
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

    upgradeHistory: [
      {
        fromPlan: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MembershipPlan",
        },

        toPlan: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MembershipPlan",
        },

        upgradeDate: Date,

        creditUsed: Number,

        paidAmount: Number,
      },
    ],

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

/* Prevent multiple active subscriptions per user */
membershipSubscriptionSchema.index(
  { user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

module.exports = mongoose.model(
  "MembershipSubscription",
  membershipSubscriptionSchema,
);
