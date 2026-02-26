require("dotenv").config();

module.exports = [
  {
    email: process.env.LOGIN_EMAIL,
    password: process.env.PASSWORD,
  },
];
