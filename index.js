require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { dbConnect } = require("./config/dbConnect");
const adminRoutes = require("./routes/adminRoutes/adminRoutes");

const app = express();

// Fallback port if not defined in .env
const port = process.env.PORT || 7000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "http://localhost:5174", // no need array if single origin
    credentials: true,
  }),
);

// Database Connection
dbConnect();

app.use("/admin", adminRoutes);

// Test Route
app.get("/", (req, res) => {
  res.status(200).send("Hello from Scholarship server");
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
