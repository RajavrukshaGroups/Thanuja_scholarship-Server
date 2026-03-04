const mongoose = require("mongoose");
const slugify = require("slugify");

const scholarshipSchema = new mongoose.Schema(
  {
    // 🔹 Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    catchyPhrase: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    // 🔹 Relationships
    // sponsor: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "ScholarshipSponsors",
    //   required: true,
    // },

    sponsor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ScholarshipSponsors",
        required: true,
      },
    ],

    // type: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "ScholarshipTypes",
    //   required: true,
    // },

    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ScholarshipTypes",
        required: true,
      },
    ],

    fieldOfStudy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldOfStudy",
      required: true,
    },

    educationLevels: {
      type: [
        {
          type: String,
          enum: ["Undergraduate", "Postgraduate", "PhD"],
        },
      ],
      default: [],
    },

    genderEligibility: {
      type: [
        {
          type: String,
          enum: ["Male", "Female", "Other"],
        },
      ],
      default: ["Male", "Female", "Other"], // default = open to all
    },

    // 🔹 Coverage
    coverageArea: {
      type: String,
      enum: ["India", "Abroad"],
      required: true,
    },

    // 🔹 Multiple Fields
    eligibilityCriteria: [
      {
        type: String,
        trim: true,
      },
    ],

    documentsRequired: [
      {
        type: String,
        trim: true,
      },
    ],

    benefits: [
      {
        type: String,
        trim: true,
      },
    ],

    // 🔹 Dates
    applicationStartDate: {
      type: Date,
      required: true,
    },

    applicationDeadline: {
      type: Date,
      required: true,
    },

    // 🔹 Status
    isActive: {
      type: Boolean,
      default: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// 🔥 Auto-generate slug from scholarship name
scholarshipSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
    });
  }
  next();
});

module.exports = mongoose.model("Scholarship", scholarshipSchema);
