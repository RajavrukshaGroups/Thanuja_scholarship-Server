const mongoose = require("mongoose");

const EnquiredUserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    educationLevel: {
      type: String,
      enum: ["Post Matric", "Pre Matric"],
    },

    degreeLevel: {
      type: String,
      enum: ["Undergraduate", "Postgraduate", "PhD"],
    },

    searchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("EnquiredUsers", EnquiredUserSchema);
