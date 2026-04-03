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

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User is now ${user.isActive ? "Active" : "Inactive"}`,
      data: user,
    });
  } catch (err) {
    console.error("Toggle user error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to toggle user status",
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

      /* APPLICATIONS */
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
              $unwind: {
                path: "$scholarship",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "documenttypes",
                localField: "scholarship.documentsRequired",
                foreignField: "_id",
                as: "requiredDocuments",
              },
            },
            {
              $addFields: {
                scholarshipName: "$scholarship.name",
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

      /* SUBSCRIPTION */
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

      /* CURRENT PLAN DETAILS */
      {
        $lookup: {
          from: "membershipplans",
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

      /* 🔥 UPGRADE PLAN LOOKUPS */
      {
        $lookup: {
          from: "membershipplans",
          localField: "subscription.upgradeHistory.fromPlan",
          foreignField: "_id",
          as: "fromPlans",
        },
      },
      {
        $lookup: {
          from: "membershipplans",
          localField: "subscription.upgradeHistory.toPlan",
          foreignField: "_id",
          as: "toPlans",
        },
      },

      /* 🔥 MAP UPGRADE HISTORY */
      {
        $addFields: {
          "subscription.upgradeHistory": {
            $map: {
              input: "$subscription.upgradeHistory",
              as: "history",
              in: {
                $mergeObjects: [
                  "$$history",
                  {
                    fromPlanTitle: {
                      $let: {
                        vars: {
                          plan: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$fromPlans",
                                  as: "p",
                                  cond: {
                                    $eq: ["$$p._id", "$$history.fromPlan"],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: "$$plan.planTitle",
                      },
                    },
                    toPlanTitle: {
                      $let: {
                        vars: {
                          plan: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$toPlans",
                                  as: "p",
                                  cond: {
                                    $eq: ["$$p._id", "$$history.toPlan"],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: "$$plan.planTitle",
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      /* CLEANUP */
      {
        $project: {
          planDetails: 0,
          fromPlans: 0,
          toPlans: 0,
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

    // FINAL CLEAN
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

const updateDocumentStatus = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status } = req.body; // "verified" | "rejected"

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updatedDoc = await UserDocument.findByIdAndUpdate(
      documentId,
      {
        "document.verificationStatus": status,
        "document.verifiedBy": req.admin?._id || null, // if you have admin auth
        "document.verifiedAt": new Date(),
      },
      { new: true },
    );

    if (!updatedDoc) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document status updated",
      data: updatedDoc,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update document",
    });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    // ✅ validate
    if (!["under_review", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updatedApp = await ScholarshipApplication.findByIdAndUpdate(
      applicationId,
      { status },
      { new: true },
    );

    if (!updatedApp) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Application status updated",
      data: updatedApp,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update application status",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const updates = req.body;

    // 🔥 validation
    if (updates.degreeLevel && updates.educationLevel === "Pre Matric") {
      return res.status(400).json({
        success: false,
        message: "Degree not allowed for Pre Matric",
      });
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    return res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [
      sponsorsCount,
      typesCount,
      scholarshipsCount,
      usersCount,
      payments,
      membershipPlans,
    ] = await Promise.all([
      ScholarshipSponsors.countDocuments({ isActive: true }),
      ScholarshipTypes.countDocuments({ isActive: true }),
      Scholarships.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      Payment.find({ status: "success" }),
      MembershipPlan.countDocuments({ isActive: true }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    res.json({
      success: true,
      data: {
        sponsors: sponsorsCount,
        types: typesCount,
        scholarships: scholarshipsCount,
        users: usersCount,
        payments: totalRevenue,
        paymentsCount: payments.length,
        membershipPlansCount: membershipPlans,
      },
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getApplicationStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalApplications, todayApplications, totalUsers, todayUsers] =
      await Promise.all([
        ScholarshipApplication.countDocuments(),
        ScholarshipApplication.countDocuments({
          createdAt: {
            $gte: todayStart,
            $lte: todayEnd,
          },
        }),
        User.countDocuments(),
        User.countDocuments({
          createdAt: {
            $gte: todayStart,
            $lte: todayEnd,
          },
        }),
      ]);

    res.json({
      success: true,
      data: {
        totalApplications,
        todayApplications,
        totalUsers,
        todayUsers,
      },
    });
  } catch (error) {
    console.error("Application stats error:", error);
    res.status(500).json({ success: false });
  }
};

const getApplicationsList = async (req, res) => {
  try {
    const {
      todayPage = 1,
      todayLimit = 10,
      allPage = 1,
      allLimit = 10,
    } = req.query;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 🔹 TODAY QUERY
    const todayQuery = {
      createdAt: { $gte: todayStart, $lte: todayEnd },
    };

    const todayTotal = await ScholarshipApplication.countDocuments(todayQuery);

    const todayApps = await ScholarshipApplication.find(todayQuery)
      .populate("user", "fullName email phone")
      .populate("scholarship", "name")
      .sort({ createdAt: -1 })
      .skip((todayPage - 1) * todayLimit)
      .limit(Number(todayLimit));

    // 🔹 ALL QUERY
    const allTotal = await ScholarshipApplication.countDocuments();

    const allApps = await ScholarshipApplication.find({})
      .populate("user", "fullName email phone")
      .populate("scholarship", "name")
      .sort({ createdAt: -1 })
      .skip((allPage - 1) * allLimit)
      .limit(Number(allLimit));

    res.json({
      success: true,
      data: {
        today: {
          data: todayApps,
          total: todayTotal,
          page: Number(todayPage),
          totalPages: Math.ceil(todayTotal / todayLimit),
        },
        all: {
          data: allApps,
          total: allTotal,
          page: Number(allPage),
          totalPages: Math.ceil(allTotal / allLimit),
        },
      },
    });
  } catch (error) {
    console.error("Applications list error:", error);
    res.status(500).json({ success: false });
  }
};

const getUserFullDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) },
      },

      // 🔹 DOCUMENTS
      {
        $lookup: {
          from: "userdocuments",
          localField: "_id",
          foreignField: "user",
          as: "documents",
        },
      },

      // 🔹 APPLICATIONS
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
              $unwind: {
                path: "$scholarship",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "documenttypes",
                localField: "scholarship.documentsRequired",
                foreignField: "_id",
                as: "requiredDocuments",
              },
            },
            {
              $addFields: {
                scholarshipName: "$scholarship.name",
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

      // 🔹 PAYMENTS
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "user",
          as: "payments",
        },
      },

      // 🔥 ADD PLAN DETAILS TO PAYMENTS
      {
        $lookup: {
          from: "membershipplans",
          localField: "payments.plan",
          foreignField: "_id",
          as: "paymentPlans",
        },
      },

      // 🔹 SUBSCRIPTION
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

      // 🔥 CURRENT PLAN DETAILS
      {
        $lookup: {
          from: "membershipplans",
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

      // 🔥 UPGRADE HISTORY PLAN LOOKUPS
      {
        $lookup: {
          from: "membershipplans",
          localField: "subscription.upgradeHistory.fromPlan",
          foreignField: "_id",
          as: "fromPlans",
        },
      },
      {
        $lookup: {
          from: "membershipplans",
          localField: "subscription.upgradeHistory.toPlan",
          foreignField: "_id",
          as: "toPlans",
        },
      },

      // 🔥 MAP UPGRADE HISTORY
      {
        $addFields: {
          "subscription.upgradeHistory": {
            $map: {
              input: "$subscription.upgradeHistory",
              as: "history",
              in: {
                $mergeObjects: [
                  "$$history",
                  {
                    fromPlanTitle: {
                      $let: {
                        vars: {
                          plan: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$fromPlans",
                                  as: "p",
                                  cond: {
                                    $eq: ["$$p._id", "$$history.fromPlan"],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: "$$plan.planTitle",
                      },
                    },
                    toPlanTitle: {
                      $let: {
                        vars: {
                          plan: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$toPlans",
                                  as: "p",
                                  cond: {
                                    $eq: ["$$p._id", "$$history.toPlan"],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: "$$plan.planTitle",
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // 🔹 CLEANUP
      {
        $project: {
          password: 0,
          __v: 0,
          planDetails: 0,
          fromPlans: 0,
          toPlans: 0,
        },
      },
    ]);

    res.json({
      success: true,
      data: user[0] || null,
    });
  } catch (err) {
    console.error("User full details error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
    });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentType,
      search,
      fromDate,
      toDate,
    } = req.query;

    const query = {};

    // 🔹 Filter by status
    if (status) {
      query.status = status;
    }

    // 🔹 Filter by payment type
    if (paymentType) {
      query.paymentType = paymentType;
    }

    // 🔹 Date filter
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // 🔹 Search (userSnapshot)
    if (search) {
      query.$or = [
        { "userSnapshot.fullName": { $regex: search, $options: "i" } },
        { "userSnapshot.email": { $regex: search, $options: "i" } },
        { "userSnapshot.phone": { $regex: search, $options: "i" } },
        { razorpayOrderId: { $regex: search, $options: "i" } },
        { razorpayPaymentId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate("user", "fullName email phone")
        .populate("plan", "planTitle amount")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),

      Payment.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
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
  updateDocumentStatus,
  updateApplicationStatus,
  updateUser,
  getDashboardStats,
  getApplicationStats,
  getApplicationsList,
  getUserFullDetails,
  getAllPayments,
  toggleUserStatus,
};
