const crypto = require("crypto");
const generateUserId = () => {
  return "EDU" + crypto.randomUUID().split("-")[0].toUpperCase();
};
module.exports = generateUserId;
