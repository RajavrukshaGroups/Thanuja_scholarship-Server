require("dotenv").config();
const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// STEP 1: Generate URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", // 🔥 REQUIRED for refresh token
  prompt: "consent",      // 🔥 FORCE new refresh token
  scope: ["https://www.googleapis.com/auth/drive"],
});

console.log("\n👉 Open this URL in browser:\n");
console.log(authUrl);