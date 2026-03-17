const { google } = require("googleapis");
const stream = require("stream");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

const uploadFileToDrive = async (file, fileName, folderId) => {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(file.buffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: file.mimetype,
      body: bufferStream,
    },
    fields: "id, webViewLink",
  });

  return {
    fileId: response.data.id,
    fileUrl: response.data.webViewLink,
  };
};

module.exports = { uploadFileToDrive };
