const crypto = require("crypto");

const generatePassword = () => {
  return crypto.randomBytes(6).toString("base64").slice(0, 10);
};

module.exports = generatePassword;
