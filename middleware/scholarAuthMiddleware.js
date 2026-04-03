// const jwt = require("jsonwebtoken");

// const scholarAuth = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//       return res.status(401).json({
//         message: "No token provided",
//       });
//     }

//     const token = authHeader.split(" ")[1];

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     if (decoded.role !== "scholar") {
//       return res.status(403).json({
//         message: "Unauthorized access",
//       });
//     }

//     req.user = decoded;

//     next();
//   } catch (error) {
//     res.status(401).json({
//       message: "Invalid token",
//     });
//   }
// };

// module.exports = scholarAuth;

const jwt = require("jsonwebtoken");
const User = require("../models/user");

const scholarAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "scholar") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // 🔥 UPDATED HERE
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "Your account is inactive. Please contact support.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid token",
    });
  }
};

module.exports = scholarAuth;
