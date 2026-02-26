const ScholarshipTypes = require("../../models/scholarshipTypes");

const addScholarshipType = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
      });
    }

    // Check duplicate (case insensitive)
    const existingType = await ScholarshipTypes.findOne({
      title: { $regex: new RegExp(`^${title}$`, "i") },
    });

    if (existingType) {
      return res.status(400).json({
        message: "Scholarship type already exists",
      });
    }

    const newType = await ScholarshipTypes.create({
      title,
      description,
    });

    return res.status(201).json({
      message: "Scholarship type created successfully",
      data: newType,
    });
  } catch (err) {
    console.error("Create error:", err);
    return res.status(500).json({
      message: "Server error while creating scholarship type",
    });
  }
};
const getAllScholarshipTypes = async (req, res) => {
  try {
    const types = await ScholarshipTypes.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Scholarship types fetched successfully",
      data: types,
    });
  } catch (err) {
    console.error("Fetch error:", err);
    return res.status(500).json({
      message: "Server error while fetching scholarship types",
    });
  }
};
const updateScholarshipTypes = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
      });
    }

    const type = await ScholarshipTypes.findById(id);

    if (!type) {
      return res.status(404).json({
        message: "Scholarship type not found",
      });
    }

    type.title = title;
    type.description = description;

    await type.save(); // slug auto-updates if title changes

    return res.status(200).json({
      message: "Scholarship type updated successfully",
      data: type,
    });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({
      message: "Server error while updating scholarship type",
    });
  }
};
const deleteScholarshipType = async (req, res) => {
  try {
    const { id } = req.params;

    const type = await ScholarshipTypes.findById(id);

    if (!type) {
      return res.status(404).json({
        message: "Scholarship type not found",
      });
    }

    await ScholarshipTypes.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Scholarship type deleted successfully",
    });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({
      message: "Server error while deleting scholarship type",
    });
  }
};
const toggleScholarshipTypeStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const type = await ScholarshipTypes.findById(id);

    if (!type) {
      return res.status(404).json({
        message: "Scholarship type not found",
      });
    }

    type.isActive = !type.isActive;
    await type.save();

    return res.status(200).json({
      message: `Scholarship type is now ${
        type.isActive ? "Active" : "Inactive"
      }`,
      data: type,
    });
  } catch (err) {
    console.error("Status toggle error:", err);
    return res.status(500).json({
      message: "Server error while updating status",
    });
  }
};
module.exports = {
  addScholarshipType,
  getAllScholarshipTypes,
  updateScholarshipTypes,
  deleteScholarshipType,
  toggleScholarshipTypeStatus,
};
