require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { dbConnect } = require("./config/dbConnect");
const adminRoutes = require("./routes/adminRoutes/adminRoutes");
const scholarRoutes = require("./routes/scholarRoutes/scholarRoutes");

const app = express();

// Fallback port
const port = process.env.PORT || 10000;

/* ===============================
   ALLOWED ORIGINS
================================ */

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : [];

/* ===============================
   MIDDLEWARE
================================ */
app.use("/scholar/payment/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (mobile apps, postman etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

/* ===============================
   DATABASE
================================ */

dbConnect();

/* ===============================
   ROUTES
================================ */

app.use("/admin", adminRoutes);
app.use("/scholar", scholarRoutes);

/* ===============================
   TEST ROUTE
================================ */

app.get("/", (req, res) => {
  res.status(200).send("Hello from Scholarship server");
});

/* ===============================
   SERVER START
================================ */

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
