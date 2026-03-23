const mongoose = require("mongoose");
const Scholarships = require("../../models/scholarship");
const ScholarshipTypes = require("../../models/scholarshipTypes");
const ScholarshipSponsors = require("../../models/scholarshipSponsors");
const FieldOfStudy = require("../../models/fieldOfStudy");
const MembershipPlan = require("../../models/memberPlans");
const DocumentType = require("../../models/documentType");
const User = require("../../models/user");
const UserDocument = require("../../models/userDocument");
const ScholarshipApplication = require("../../models/scholarshipAppicationModel");
const Payment = require("../../models/payment");
const MembershipSubscription = require("../../models/membershipSubscription");

const createScholarship = async (req, res) => {
  try {
    const {
      name,
      catchyPhrase,
      description,
      sponsor,
      type,
      fieldOfStudy,
      coverageArea,
      eligibilityCriteria,
      documentsRequired,
      benefits,
      applicationStartDate,
      applicationDeadline,
      isFeatured,
      educationLevels,
      genderEligibility,
    } = req.body;

    // 🔎 Basic Validation
    if (
      !name ||
      !description ||
      !Array.isArray(sponsor) ||
      sponsor.length === 0 ||
      !type ||
      !Array.isArray(type) ||
      type.length === 0 ||
      !fieldOfStudy ||
      !coverageArea ||
      !applicationStartDate ||
      !applicationDeadline
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    // ✅ Validate fieldOfStudy
    const fieldExists = await FieldOfStudy.findById(fieldOfStudy);
    if (!fieldExists) {
      return res.status(400).json({
        message: "Invalid Field Of Study selected",
      });
    }

    // ✅ Validate Gender (Optional but Professional)
    const allowedGenders = ["Male", "Female", "Other"];

    let finalGenderEligibility = ["Male", "Female", "Other"]; // default = open to all

    if (Array.isArray(genderEligibility) && genderEligibility.length > 0) {
      const isValid = genderEligibility.every((g) =>
        allowedGenders.includes(g),
      );

      if (!isValid) {
        return res.status(400).json({
          message: "Invalid gender selection",
        });
      }

      finalGenderEligibility = genderEligibility;
    }

    if (documentsRequired && documentsRequired.length > 0) {
      const validDocs = await DocumentType.find({
        _id: { $in: documentsRequired },
      });

      if (validDocs.length !== documentsRequired.length) {
        return res.status(400).json({
          message: "Invalid document types selected",
        });
      }
    }

    const newScholarship = await Scholarships.create({
      name,
      catchyPhrase,
      description,
      sponsor,
      type,
      fieldOfStudy,
      coverageArea,
      eligibilityCriteria,
      documentsRequired,
      benefits,
      applicationStartDate,
      applicationDeadline,
      isFeatured,
      educationLevels,
      genderEligibility: finalGenderEligibility, // ✅ ADDED HERE
    });

    return res.status(201).json({
      message: "Scholarship created successfully",
      data: newScholarship,
    });
  } catch (err) {
    console.error("Create scholarship error:", err);
    return res.status(500).json({
      message: "Server error while creating scholarship",
    });
  }
};
const getAllScholarships = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const status = req.query.status || "all";
    const sponsorFilter = req.query.sponsor ? req.query.sponsor.split(",") : [];
    const typeFilter = req.query.type ? req.query.type.split(",") : [];
    const fieldFilter = req.query.fieldOfStudy || null;
    const genderFilter = req.query.gender || null;

    /* =========================================
       STEP 1: BUILD MATCH CONDITIONS (BEFORE LOOKUP)
    ========================================== */

    const matchConditions = {};

    // Status filter
    if (status === "active") matchConditions.isActive = true;
    if (status === "inactive") matchConditions.isActive = false;
    if (status === "featured") matchConditions.isFeatured = true;

    // Sponsor filter (array field)
    if (sponsorFilter.length > 0) {
      matchConditions.sponsor = {
        $in: sponsorFilter.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // Type filter (array field)
    if (typeFilter.length > 0) {
      matchConditions.type = {
        $in: typeFilter.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // Field of study filter
    if (fieldFilter) {
      matchConditions.fieldOfStudy = new mongoose.Types.ObjectId(fieldFilter);
    }

    // Gender filter (array field)
    if (genderFilter) {
      matchConditions.genderEligibility = genderFilter;
    }

    const basePipeline = [];

    if (Object.keys(matchConditions).length > 0) {
      basePipeline.push({ $match: matchConditions });
    }

    /* =========================================
       STEP 2: LOOKUPS
    ========================================== */

    basePipeline.push(
      {
        $lookup: {
          from: "scholarshipsponsors",
          localField: "sponsor",
          foreignField: "_id",
          as: "sponsor",
        },
      },
      {
        $lookup: {
          from: "scholarshiptypes",
          localField: "type",
          foreignField: "_id",
          as: "type",
        },
      },
      {
        $lookup: {
          from: "fieldofstudies",
          localField: "fieldOfStudy",
          foreignField: "_id",
          as: "fieldOfStudy",
        },
      },
      {
        $unwind: {
          path: "$fieldOfStudy",
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    /* =========================================
       STEP 3: SEARCH (AFTER LOOKUP)
    ========================================== */

    if (search) {
      basePipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { "sponsor.title": { $regex: search, $options: "i" } },
            { "type.title": { $regex: search, $options: "i" } },
            { "fieldOfStudy.name": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    /* =========================================
       STEP 4: GLOBAL STATS (UNFILTERED)
    ========================================== */

    const statsResult = await Scholarships.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          inactive: {
            $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] },
          },
          featured: {
            $sum: { $cond: [{ $eq: ["$isFeatured", true] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = statsResult[0] || {
      total: 0,
      active: 0,
      inactive: 0,
      featured: 0,
    };

    /* =========================================
       STEP 5: PAGINATION COUNT
    ========================================== */

    const countPipeline = [...basePipeline, { $count: "total" }];
    const totalData = await Scholarships.aggregate(countPipeline);

    const totalCount = totalData[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    /* =========================================
       STEP 6: FETCH DATA
    ========================================== */

    const dataPipeline = [
      ...basePipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const scholarships = await Scholarships.aggregate(dataPipeline);

    return res.status(200).json({
      currentPage: page,
      totalPages,
      totalCount,
      stats,
      data: scholarships,
    });
  } catch (err) {
    console.error("Aggregation error:", err);
    return res.status(500).json({
      message: "Server error while fetching scholarships",
    });
  }
};
// const updateScholarship = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const scholarship = await Scholarships.findById(id);

//     if (!scholarship) {
//       return res.status(404).json({
//         message: "Scholarship not found",
//       });
//     }

//     // ✅ If fieldOfStudy is being updated, validate it
//     if (req.body.fieldOfStudy) {
//       const fieldExists = await FieldOfStudy.findById(req.body.fieldOfStudy);

//       if (!fieldExists) {
//         return res.status(400).json({
//           message: "Invalid Field Of Study selected",
//         });
//       }
//     }

//     Object.assign(scholarship, req.body);

//     await scholarship.save();

//     return res.status(200).json({
//       message: "Scholarship updated successfully",
//       data: scholarship,
//     });
//   } catch (err) {
//     console.error("Update error:", err);
//     return res.status(500).json({
//       message: "Server error while updating scholarship",
//     });
//   }
// };

const updateScholarship = async (req, res) => {
  try {
    const { id } = req.params;

    const scholarship = await Scholarships.findById(id);

    if (!scholarship) {
      return res.status(404).json({
        message: "Scholarship not found",
      });
    }

    const updateData = { ...req.body };

    /* ===============================
       VALIDATE FIELD OF STUDY
    =============================== */

    if (updateData.fieldOfStudy) {
      const fieldExists = await FieldOfStudy.findById(updateData.fieldOfStudy);

      if (!fieldExists) {
        return res.status(400).json({
          message: "Invalid Field Of Study selected",
        });
      }
    }

    /* ===============================
       CLEAN DOCUMENTS REQUIRED
    =============================== */

    if (updateData.documentsRequired) {
      updateData.documentsRequired = updateData.documentsRequired.filter(
        (doc) => mongoose.Types.ObjectId.isValid(doc),
      );
    }

    Object.assign(scholarship, updateData);

    await scholarship.save();

    return res.status(200).json({
      message: "Scholarship updated successfully",
      data: scholarship,
    });
  } catch (err) {
    console.error("Update error:", err);

    return res.status(500).json({
      message: "Server error while updating scholarship",
    });
  }
};
const deleteScholarship = async (req, res) => {
  try {
    const { id } = req.params;

    const scholarship = await Scholarships.findById(id);

    if (!scholarship) {
      return res.status(404).json({
        message: "Scholarship not found",
      });
    }

    await Scholarships.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Scholarship deleted successfully",
    });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({
      message: "Server error while deleting scholarship",
    });
  }
};
const toggleScholarshipStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const scholarship = await Scholarships.findById(id);

    if (!scholarship) {
      return res.status(404).json({
        message: "Scholarship not found",
      });
    }

    scholarship.isActive = !scholarship.isActive;
    await scholarship.save();

    return res.status(200).json({
      message: `Scholarship is now ${
        scholarship.isActive ? "Active" : "Inactive"
      }`,
      data: scholarship,
    });
  } catch (err) {
    console.error("Status toggle error:", err);
    return res.status(500).json({
      message: "Server error while updating status",
    });
  }
};

const getSponsorsDropdown = async (req, res) => {
  try {
    const sponsors = await ScholarshipSponsors.find({ isActive: true })
      .select("_id title")
      .sort({ title: 1 });

    return res.status(200).json({
      data: sponsors,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching sponsors",
    });
  }
};

const getTypesDropdown = async (req, res) => {
  try {
    const types = await ScholarshipTypes.find({ isActive: true })
      .select("_id title")
      .sort({ title: 1 });

    return res.status(200).json({
      data: types,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching scholarship types",
    });
  }
};

const getFieldOfStudyDropdown = async (req, res) => {
  try {
    const fields = await FieldOfStudy.find({ isActive: true })
      .select("_id name")
      .sort({ name: 1 });

    return res.status(200).json({
      data: fields,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching fields of study",
    });
  }
};

const getDocumentTypes = async (req, res) => {
  const docs = await DocumentType.find().sort({ title: 1 });
  res.json({
    success: true,
    data: docs,
  });
};

const createFieldOfStudy = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Field name is required",
      });
    }

    const existing = await FieldOfStudy.findOne({ name });

    if (existing) {
      return res.status(400).json({
        message: "Field already exists",
      });
    }

    const field = await FieldOfStudy.create({ name });

    return res.status(201).json({
      message: "Field created successfully",
      data: field,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error creating field of study",
    });
  }
};

const createMembershipPlan = async (req, res) => {
  try {
    const { planTitle, amount, planDuration, maxScholarships, benefits } =
      req.body;

    if (!planTitle || !amount || !planDuration || !maxScholarships) {
      return res.status(400).json({
        message:
          "Plan title, amount, duration and maximum scholarships are required",
      });
    }

    const plan = await MembershipPlan.create({
      planTitle,
      amount,
      planDuration,
      maxScholarships,
      benefits,
    });

    res.status(201).json({
      message: "Membership plan created successfully",
      data: plan,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================
   GET ALL MEMBERSHIP PLANS
====================================== */

const getAllMembershipPlans = async (req, res) => {
  try {
    const plans = await MembershipPlan.find().sort({ createdAt: -1 });

    return res.status(200).json({
      data: plans,
    });
  } catch (err) {
    console.error("Fetch plans error:", err);
    return res.status(500).json({
      message: "Error fetching membership plans",
    });
  }
};

/* ======================================
   UPDATE MEMBERSHIP PLAN
====================================== */

const updateMembershipPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await MembershipPlan.findById(id);

    if (!plan) {
      return res.status(404).json({
        message: "Membership plan not found",
      });
    }

    const { planTitle, amount, planDuration, maxScholarships, benefits } =
      req.body;

    if (planTitle !== undefined) plan.planTitle = planTitle;
    if (amount !== undefined) plan.amount = amount;
    if (planDuration !== undefined) plan.planDuration = planDuration;
    if (maxScholarships !== undefined) plan.maxScholarships = maxScholarships;
    if (benefits !== undefined) plan.benefits = benefits;

    await plan.save();

    return res.status(200).json({
      message: "Membership plan updated successfully",
      data: plan,
    });
  } catch (err) {
    console.error("Update plan error:", err);
    return res.status(500).json({
      message: "Error updating membership plan",
    });
  }
};

/* ======================================
   DELETE MEMBERSHIP PLAN
====================================== */

const deleteMembershipPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await MembershipPlan.findById(id);

    if (!plan) {
      return res.status(404).json({
        message: "Membership plan not found",
      });
    }

    await MembershipPlan.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Membership plan deleted successfully",
    });
  } catch (err) {
    console.error("Delete plan error:", err);
    return res.status(500).json({
      message: "Error deleting membership plan",
    });
  }
};

/* ======================================
   TOGGLE ACTIVE / INACTIVE
====================================== */

const toggleMembershipPlanStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await MembershipPlan.findById(id);

    if (!plan) {
      return res.status(404).json({
        message: "Membership plan not found",
      });
    }

    plan.isActive = !plan.isActive;

    await plan.save();

    return res.status(200).json({
      message: `Membership plan is now ${
        plan.isActive ? "Active" : "Inactive"
      }`,
      data: plan,
    });
  } catch (err) {
    console.error("Toggle plan error:", err);
    return res.status(500).json({
      message: "Error toggling membership plan status",
    });
  }
};

const viewAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim() || "";
    const skip = (page - 1) * limit;

    const searchFilter = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { userId: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const pipeline = [
      { $match: searchFilter },

      /* DOCUMENTS */
      {
        $lookup: {
          from: "userdocuments",
          localField: "_id",
          foreignField: "user",
          as: "documents",
        },
      },

      /* APPLICATIONS WITH SCHOLARSHIP NAME */
      {
        $lookup: {
          from: "scholarshipapplications",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$user", "$$userId"] },
              },
            },
            {
              $lookup: {
                from: "scholarships",
                localField: "scholarship",
                foreignField: "_id",
                as: "scholarship",
              },
            },
            {
              $addFields: {
                scholarshipName: {
                  $arrayElemAt: ["$scholarship.name", 0],
                },
              },
            },
            {
              $project: {
                scholarship: 0,
              },
            },
          ],
          as: "applications",
        },
      },

      /* PAYMENTS */
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "user",
          as: "payments",
        },
      },

      /* MEMBERSHIP SUBSCRIPTION */
      {
        $lookup: {
          from: "membershipsubscriptions",
          localField: "_id",
          foreignField: "user",
          as: "subscription",
        },
      },

      {
        $addFields: {
          subscription: { $arrayElemAt: ["$subscription", 0] },
        },
      },

      /* ✅ PLAN DETAILS (IMPORTANT FIX) */
      {
        $lookup: {
          from: "membershipplans", // ⚠️ collection name (VERY IMPORTANT)
          localField: "subscription.plan",
          foreignField: "_id",
          as: "planDetails",
        },
      },
      {
        $addFields: {
          "subscription.planTitle": {
            $arrayElemAt: ["$planDetails.planTitle", 0],
          },
          "subscription.planAmount": {
            $arrayElemAt: ["$planDetails.amount", 0],
          },
          "subscription.planDuration": {
            $arrayElemAt: ["$planDetails.planDuration", 0],
          },
        },
      },
      {
        $project: {
          planDetails: 0,
        },
      },

      { $sort: { createdAt: -1 } },
    ];

    // COUNT
    const countResult = await User.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);

    const totalCount = countResult[0]?.total || 0;

    // PAGINATION
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // CLEAN RESPONSE
    pipeline.push({
      $project: {
        password: 0,
        __v: 0,
      },
    });

    const users = await User.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      limit,
      data: users,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

module.exports = {
  createScholarship,
  getAllScholarships,
  updateScholarship,
  deleteScholarship,
  toggleScholarshipStatus,
  getSponsorsDropdown,
  getTypesDropdown,
  getFieldOfStudyDropdown,
  getDocumentTypes,
  createFieldOfStudy,
  createMembershipPlan,
  getAllMembershipPlans,
  updateMembershipPlan,
  deleteMembershipPlan,
  toggleMembershipPlanStatus,
  viewAllUsers,
};
