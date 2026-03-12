require("dotenv").config();
const mongoose = require("mongoose");
const MembershipSubscription = require("../models/membershipSubscription");

const MONGO_URL = process.env.MONGO_URL;

const deleteAllMembershipSubscription = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("MongoDB connected");

    const result = await MembershipSubscription.deleteMany({});
    console.log(
      `✅ Deleted ${result.deletedCount} membership subscription successfully`,
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error deleting categories:", error);
    process.exit(1);
  }
};

deleteAllMembershipSubscription();
