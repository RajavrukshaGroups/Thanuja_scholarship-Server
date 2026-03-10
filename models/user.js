const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: String,
    email: {
      type: String,
      unique: true,
      lowercase: true,
    },
    phone: String,

    educationLevel: {
      type: String,
      enum: ["Pre Metric", "Post Metric"],
    },

    degreeLevel: {
      type: String,
      enum: ["Undergraduate", "Postgraduate", "PhD"],
    },

    password: String,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
