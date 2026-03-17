const { google } = require("googleapis");
const path = require("path");

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "../google-drive-key.json"),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({
  version: "v3",
  auth,
});

const createUserFolder = async (folderName) => {
  const folderMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [process.env.GOOGLE_DRIVE_PARENT_FOLDER],
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: "id",
    supportsAllDrives: true,
  });

  return folder.data.id;
};

module.exports = { createUserFolder };
