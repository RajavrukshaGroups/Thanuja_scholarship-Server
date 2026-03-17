const mongoose = require("mongoose");

const scholarshipApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    scholarship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scholarship",
      required: true,
    },

    status: {
      type: String,
      enum: ["submitted", "under_review", "approved", "rejected"],
      default: "submitted",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "ScholarshipApplication",
  scholarshipApplicationSchema,
);
