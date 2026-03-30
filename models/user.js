const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
    },

    fullName: String,

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    phone: {
      type: String,
      unique: true,
    },

    educationLevel: {
      type: String,
      enum: ["Post Matric", "Pre Matric"],
    },

    degreeLevel: {
      type: String,
      enum: ["Undergraduate", "Postgraduate", "PhD"],
    },

    password: String,

    googleDriveFolderId: String,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
