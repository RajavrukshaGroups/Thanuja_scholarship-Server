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

    documents: [
      {
        documentName: String,

        fileUrl: String,

        googleDriveFileId: String,

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      enum: ["draft", "submitted", "under_review", "approved", "rejected"],
      default: "draft",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "ScholarshipApplication",
  scholarshipApplicationSchema,
);
