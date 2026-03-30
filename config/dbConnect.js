require("dotenv").config();
const mongoose = require("mongoose");
const dbConnect = () => {
  const cluster_url = process.env.MONGO_URL;

  mongoose
    .connect(cluster_url)
    .then(() => console.log("Database connected"))
    .catch((err) => console.log(err));
};
module.exports = { dbConnect };
