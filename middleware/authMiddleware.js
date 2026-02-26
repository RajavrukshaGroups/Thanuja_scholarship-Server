const jwt = require("jsonwebtoken");
const Login = require("../models/login");

const protect = async (req, res, next) => {
  try {
    let token;

    // 1️⃣ Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2️⃣ If no token
    if (!token) {
      return res.status(401).json({
        message: "Not authorized, token missing",
      });
    }

    // 3️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Find admin from DB
    const admin = await Login.findById(decoded.id).select("-password");

    if (!admin) {
      return res.status(401).json({
        message: "Not authorized, admin not found",
      });
    }

    // 5️⃣ Attach admin to request
    req.admin = admin;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
      });
    }

    return res.status(401).json({
      message: "Not authorized, invalid token",
    });
  }
};

module.exports = { protect };
