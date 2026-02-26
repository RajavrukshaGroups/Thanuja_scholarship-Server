const Scholarships = require("../../models/scholarship");
const ScholarshipTypes = require("../../models/scholarshipTypes");
const ScholarshipSponsors = require("../../models/scholarshipSponsors");

const createScholarship = async (req, res) => {
  try {
    const {
      name,
      catchyPhrase,
      description,
      sponsor,
      type,
      coverageArea,
      eligibilityCriteria,
      documentsRequired,
      benefits,
      applicationStartDate,
      applicationDeadline,
      isFeatured,
    } = req.body;

    // 🔎 Basic Validation
    if (
      !name ||
      !description ||
      !sponsor ||
      !type ||
      !coverageArea ||
      !applicationStartDate ||
      !applicationDeadline
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    const newScholarship = await Scholarships.create({
      name,
      catchyPhrase,
      description,
      sponsor,
      type,
      coverageArea,
      eligibilityCriteria,
      documentsRequired,
      benefits,
      applicationStartDate,
      applicationDeadline,
      isFeatured,
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
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "all";
    const skip = (page - 1) * limit;

    const basePipeline = [
      {
        $lookup: {
          from: "scholarshipsponsors",
          localField: "sponsor",
          foreignField: "_id",
          as: "sponsor",
        },
      },
      { $unwind: "$sponsor" },
      {
        $lookup: {
          from: "scholarshiptypes",
          localField: "type",
          foreignField: "_id",
          as: "type",
        },
      },
      { $unwind: "$type" },
    ];

    /* 🔎 SEARCH FILTER */
    if (search) {
      basePipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { "sponsor.title": { $regex: search, $options: "i" } },
            { "type.title": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    /* 🔥 STATUS FILTER */
    if (status === "active") {
      basePipeline.push({ $match: { isActive: true } });
    }

    if (status === "inactive") {
      basePipeline.push({ $match: { isActive: false } });
    }

    if (status === "featured") {
      basePipeline.push({ $match: { isFeatured: true } });
    }

    /* =========================
       GLOBAL STATS (NEW)
    ========================== */

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

    /* =========================
       PAGINATION COUNT
    ========================== */

    const countPipeline = [...basePipeline, { $count: "total" }];
    const totalData = await Scholarships.aggregate(countPipeline);

    const totalCount = totalData[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    /* =========================
       FETCH DATA
    ========================== */

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
      stats, // 🔥 SEND GLOBAL STATS
      data: scholarships,
    });
  } catch (err) {
    console.error("Aggregation error:", err);
    return res.status(500).json({
      message: "Server error while fetching scholarships",
    });
  }
};
const updateScholarship = async (req, res) => {
  try {
    const { id } = req.params;

    const scholarship = await Scholarships.findById(id);

    if (!scholarship) {
      return res.status(404).json({
        message: "Scholarship not found",
      });
    }

    Object.assign(scholarship, req.body);

    await scholarship.save(); // slug auto updates if name changes

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

module.exports = {
  createScholarship,
  getAllScholarships,
  updateScholarship,
  deleteScholarship,
  toggleScholarshipStatus,
  getSponsorsDropdown,
  getTypesDropdown,
};
