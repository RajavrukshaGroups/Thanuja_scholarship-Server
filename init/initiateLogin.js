require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Login = require("../models/login");
const loginData = require("./loginCred");

const MONGO_URL = process.env.MONGO_URL;

const seedLogin = async () => {
  try {
    if (!MONGO_URL) {
      throw new Error("MONGO_URL is missing in .env");
    }

    await mongoose.connect(MONGO_URL);
    console.log("MongoDB connected");

    for (const user of loginData) {
      if (!user.email || !user.password) {
        console.log("Missing email or password in .env");
        continue;
      }

      const exists = await Login.findOne({ email: user.email });

      if (exists) {
        console.log(`Admin already exists: ${user.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);

      await Login.create({
        email: user.email,
        password: hashedPassword,
      });

      console.log(`Admin created: ${user.email}`);
    }

    console.log("Seeding completed ✅");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedLogin();
