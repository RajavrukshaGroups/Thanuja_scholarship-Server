require("dotenv").config();
const mongoose = require("mongoose");
const ScholarshipApplication = require("../models/scholarshipAppicationModel");

const MONGO_URL = process.env.MONGO_URL;

const deleteAllScholartshipApplication = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("MongoDB connected");

    const result = await ScholarshipApplication.deleteMany({});
    console.log(
      `✅ Deleted ${result.deletedCount} member application successfully`,
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error deleting categories:", error);
    process.exit(1);
  }
};

deleteAllScholartshipApplication();
