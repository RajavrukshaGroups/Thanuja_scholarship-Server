const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  // ✅ FILE SIZE LIMIT
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },

  // ✅ FILE TYPE VALIDATION
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, PNG files are allowed"), false);
    }
  },
});

module.exports = upload;
