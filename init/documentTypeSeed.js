const mongoose = require("mongoose");
const dotenv = require("dotenv");
const DocumentType = require("../models/documentType");

dotenv.config();

mongoose.connect(process.env.MONGO_URL);

const documentTypes = [
  { title: "Aadhaar Card" },
  { title: "Income Certificate" },
  { title: "Caste Certificate" },
  { title: "Marksheet of Class 10th" },
  { title: "Admission Letter" },
  { title: "Sports Certificate" },
  { title: "Passport Photo" },
  { title: "Bank Passbook" },
  { title: "Bonafide Certificate" },
  { title: "Disability Certificate" },
  { title: "Rural Certificate" },
];

const seedDocuments = async () => {
  try {
    for (const doc of documentTypes) {
      await DocumentType.updateOne(
        { title: doc.title }, // check if exists
        { $setOnInsert: doc }, // insert only if not exists
        { upsert: true }, // create if missing
      );
    }

    console.log("Document types seeded successfully");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedDocuments();
