const Scholarships = require("../../models/scholarship");
const ScholarshipTypes = require("../../models/scholarshipTypes");
const FieldOfStudy = require("../../models/fieldOfStudy");
const ScholarshipSponsors = require("../../models/scholarshipSponsors");
const EnquiredUsers = require("../../models/enquiredUsers");
const MembershipPlan = require("../../models/memberPlans");

const getScholarships = async (req, res) => {
  try {
    const {
      search,
      fields,
      degreeLevels,
      types,
      sponsors,
      page = 1,
      limit = 10,
      sort = "latest",
    } = req.query;

    const skip = (page - 1) * limit;

    let filter = {
      isActive: true,
      applicationDeadline: { $gte: new Date() },
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (fields) {
      filter.fieldOfStudy = { $in: fields.split(",") };
    }

    if (degreeLevels) {
      filter.educationLevels = { $in: degreeLevels.split(",") };
    }

    if (types) {
      filter.type = { $in: types.split(",") };
    }

    if (sponsors) {
      filter.sponsor = { $in: sponsors.split(",") };
    }

    let query = Scholarships.find(filter)
      .populate("sponsor type fieldOfStudy")
      .skip(skip)
      .limit(parseInt(limit));

    if (sort === "latest") {
      query = query.sort({ createdAt: -1 });
    }

    const scholarships = await query;
    const total = await Scholarships.countDocuments(filter);

    res.status(200).json({
      data: scholarships,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching scholarships" });
  }
};

const getFeaturedScholarships = async (req, res) => {
  try {
    const scholarships = await Scholarships.find({
      isActive: true,
      isFeatured: true,
      applicationDeadline: { $gte: new Date() },
    }).populate("sponsor type fieldOfStudy");

    res.status(200).json({ data: scholarships });
  } catch (err) {
    res.status(500).json({ message: "Error fetching featured scholarships" });
  }
};

const getScholarshipBySlug = async (req, res) => {
  try {
    const scholarship = await Scholarships.findOne({
      slug: req.params.slug,
      isActive: true,
    }).populate("sponsor type fieldOfStudy");

    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    res.status(200).json({ data: scholarship });
  } catch (err) {
    res.status(500).json({ message: "Error fetching scholarship" });
  }
};

const getFieldsDropdown = async (req, res) => {
  try {
    const fields = await FieldOfStudy.find({ isActive: true })
      .select("_id name")
      .sort({ name: 1 });

    res.status(200).json({
      data: fields,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching fields",
    });
  }
};

const getTypesDropdown = async (req, res) => {
  try {
    const types = await ScholarshipTypes.find({ isActive: true })
      .select("_id title")
      .sort({ title: 1 });

    res.status(200).json({
      data: types,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching scholarship types",
    });
  }
};

const getSponsorsDropdown = async (req, res) => {
  try {
    const sponsors = await ScholarshipSponsors.find({ isActive: true })
      .select("_id title")
      .sort({ title: 1 });

    res.status(200).json({
      data: sponsors,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching sponsors",
    });
  }
};

const getFilterStats = async (req, res) => {
  try {
    const stats = await Scholarships.aggregate([
      {
        $match: {
          isActive: true,
          applicationDeadline: { $gte: new Date() },
        },
      },
      {
        $facet: {
          fields: [
            { $group: { _id: "$fieldOfStudy", count: { $sum: 1 } } },
            {
              $lookup: {
                from: "fieldofstudies",
                localField: "_id",
                foreignField: "_id",
                as: "field",
              },
            },
            { $unwind: "$field" },
            {
              $project: {
                name: "$field.name",
                count: 1,
              },
            },
          ],

          types: [
            { $unwind: "$type" },
            { $group: { _id: "$type", count: { $sum: 1 } } },
            {
              $lookup: {
                from: "scholarshiptypes",
                localField: "_id",
                foreignField: "_id",
                as: "type",
              },
            },
            { $unwind: "$type" },
            {
              $project: {
                title: "$type.title",
                count: 1,
              },
            },
          ],
        },
      },
    ]);

    res.json(stats[0]);
  } catch (err) {
    res.status(500).json({ message: "Stats error" });
  }
};

const createEnquiry = async (req, res) => {
  try {
    const { fullName, email, phone, educationLevel, degreeLevel } = req.body;

    const enquiryData = {
      fullName,
      email,
      phone,
      educationLevel,
    };

    // only include degreeLevel if Post Metric
    if (educationLevel === "Post Metric" && degreeLevel) {
      enquiryData.degreeLevel = degreeLevel;
    }

    const enquiry = await EnquiredUsers.create(enquiryData);

    res.status(201).json({
      message: "Enquiry stored",
      data: enquiry,
    });
  } catch (err) {
    console.error("ENQUIRY ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};
/* ======================================
   GET ACTIVE MEMBERSHIP PLANS
====================================== */

const getMembershipPlans = async (req, res) => {
  try {
    const plans = await MembershipPlan.find({ isActive: true }).sort({
      amount: 1,
    }); // sorted by price

    res.status(200).json({
      data: plans,
    });
  } catch (err) {
    console.error("Membership plan fetch error:", err);

    res.status(500).json({
      message: "Error fetching membership plans",
    });
  }
};

module.exports = {
  getScholarships,
  getFeaturedScholarships,
  getScholarshipBySlug,
  getFieldsDropdown,
  getTypesDropdown,
  getSponsorsDropdown,
  getFilterStats,
  createEnquiry,
  getMembershipPlans,
};
