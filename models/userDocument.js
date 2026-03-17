const mongoose = require("mongoose");

const userDocumentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    document: {
      documentName: {
        type: String,
        required: true,
      },

      verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
      },

      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
      },

      verifiedAt: Date,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    googleDriveFileId: String,

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

/* ===============================
   PREVENT DUPLICATE DOCUMENTS
================================ */

userDocumentSchema.index(
  { user: 1, "document.documentName": 1 },
  { unique: true },
);

module.exports = mongoose.model("UserDocument", userDocumentSchema);
