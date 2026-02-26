const ScholarshipsSponsors = require("../../models/scholarshipSponsors");

const addScholarshipSponsors = async (req, res) => {
  try {
    const { title, description } = req.body;

    // 1️⃣ Validate input
    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
      });
    }

    // 2️⃣ Check if already exists (case insensitive)
    const existingSponsor = await ScholarshipsSponsors.findOne({
      title: { $regex: new RegExp(`^${title}$`, "i") },
    });

    if (existingSponsor) {
      return res.status(400).json({
        message: "Sponsor type already exists",
      });
    }

    // 3️⃣ Create new sponsor
    const newSponsor = await ScholarshipsSponsors.create({
      title,
      description,
    });

    return res.status(201).json({
      message: "Scholarship sponsor created successfully",
      data: newSponsor,
    });
  } catch (err) {
    console.error("Error creating sponsor:", err);
    return res.status(500).json({
      message: "Server error while creating sponsor",
    });
  }
};

const getAllSponsors = async (req, res) => {
  try {
    const sponsors = await ScholarshipsSponsors.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Sponsors fetched successfully",
      data: sponsors,
    });
  } catch (err) {
    console.error("Fetch error:", err);
    return res.status(500).json({
      message: "Server error while fetching sponsors",
    });
  }
};

const updateSponsor = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
      });
    }

    const existingSponsor = await ScholarshipsSponsors.findById(id);
    if (!existingSponsor) {
      return res.status(404).json({
        message: "Sponsor not found",
      });
    }

    existingSponsor.title = title;
    existingSponsor.description = description;

    await existingSponsor.save();

    return res.status(200).json({
      message: "Sponsor updated successfully",
      data: existingSponsor,
    });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({
      message: "Server error while updating sponsor",
    });
  }
};

const deleteSponsor = async (req, res) => {
  try {
    const { id } = req.params;

    const sponsor = await ScholarshipsSponsors.findById(id);

    if (!sponsor) {
      return res.status(404).json({
        message: "Sponsor not found",
      });
    }

    await ScholarshipsSponsors.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Sponsor deleted successfully",
    });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({
      message: "Server error while deleting sponsor",
    });
  }
};

const toggleSponsorStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const sponsor = await ScholarshipsSponsors.findById(id);

    if (!sponsor) {
      return res.status(404).json({
        message: "Sponsor not found",
      });
    }

    sponsor.isActive = !sponsor.isActive;
    await sponsor.save();

    return res.status(200).json({
      message: `Sponsor is now ${sponsor.isActive ? "Active" : "Inactive"}`,
      data: sponsor,
    });
  } catch (err) {
    console.error("Status toggle error:", err);
    return res.status(500).json({
      message: "Server error while updating status",
    });
  }
};

module.exports = {
  addScholarshipSponsors,
  getAllSponsors,
  updateSponsor,
  deleteSponsor,
  toggleSponsorStatus,
};
