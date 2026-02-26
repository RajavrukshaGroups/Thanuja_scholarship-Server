require("dotenv").config();
const mongoose = require("mongoose");
const dbConnect = () => {
  //   const cluster_url =
  //     "mongodb+srv://enquiry:mHpnVFW1fNgdla8h@cluster0.osdmv.mongodb.net/";
  //   const cluster_url = "mongodb://localhost:27017/RRPL_Admin";
  //   const cluster_url = "mongodb://localhost:27017/test-deploy";
  //   const cluster_url =
  //     "mongodb+srv://enquiry_db_user:Yp6vkOiPNDg3UHhY@cluster0.scdzdrm.mongodb.net/";
  const cluster_url = process.env.MONGO_URL;

  mongoose
    .connect(cluster_url)
    .then(() => console.log("Database connected"))
    .catch((err) => console.log(err));
};
module.exports = { dbConnect };
