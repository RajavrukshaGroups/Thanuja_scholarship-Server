require("dotenv").config();
const mongoose = require("mongoose");
const Users = require("../models/user");

const MONGO_URL = process.env.MONGO_URL;

const deleteAllUsers = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("mongodb connected");

    const result = await Users.deleteMany({});
    console.log(`deleted ${result.deletedCount} users`);
    process.exit(0);
  } catch (err) {
    console.error("error deleting categories", err);
    process.exit(1);
  }
};

deleteAllUsers();
