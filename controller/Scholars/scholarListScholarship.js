const Scholarships = require("../../models/scholarship");
const ScholarshipTypes = require("../../models/scholarshipTypes");
const FieldOfStudy = require("../../models/fieldOfStudy");
const ScholarshipSponsors = require("../../models/scholarshipSponsors");

const getScholarships = async (req, res) => {
  try {
    const { search, fields, degreeLevels, types, sort = "latest" } = req.query;

    let filter = {
      isActive: true,
      applicationDeadline: { $gte: new Date() },
    };

    // 🔎 Search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // 🎓 Field of Study
    if (fields) {
      filter.fieldOfStudy = { $in: fields.split(",") };
    }

    // 🎓 Degree Level
    if (degreeLevels) {
      filter.educationLevels = { $in: degreeLevels.split(",") };
    }

    // 🏷 Scholarship Type
    if (types) {
      filter.type = { $in: types.split(",") };
    }

    let query = Scholarships.find(filter).populate("sponsor type fieldOfStudy");

    if (sort === "latest") {
      query = query.sort({ createdAt: -1 });
    }

    const scholarships = await query;

    res.status(200).json({ data: scholarships });
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

module.exports = {
  getScholarships,
  getFeaturedScholarships,
  getScholarshipBySlug,
  getFieldsDropdown,
  getTypesDropdown,
  getSponsorsDropdown,
};
