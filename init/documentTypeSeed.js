const mongoose = require("mongoose");
const dotenv = require("dotenv");
const DocumentType = require("../models/documentType");

dotenv.config();

mongoose.connect(process.env.MONGO_URL);

const documentTypes = [
  { title: "Aadhaar Card" },
  { title: "Passport Size Photograph" },
  { title: "Educational Qualification Marksheets/Certificates" },
  { title: "Valid Income Certificate Issued by the Competent Authority" },
  { title: "Domicile Certificate" },
  { title: "Caste/Community Certificate Issued by the Competent Authority" },
  { title: "Disability Certificate" },
  { title: "Bank Account details/Bank Passbook" },
  { title: "Admission Rank Proof" },
  { title: "Proof of Fee Details to Claim the Scholarship" },
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
