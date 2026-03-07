const mongoose = require("mongoose");

const membershipPlanSchema = new mongoose.Schema(
  {
    planTitle: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    planDuration: {
      type: Number, // days
      required: true,
      min: 1,
    },

    maxScholarships: {
      type: Number,
      required: true,
      min: 1,
    },

    benefits: [
      {
        type: String,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("MembershipPlan", membershipPlanSchema);
