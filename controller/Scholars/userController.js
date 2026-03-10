const User = require("../../models/user");

exports.createUser = async (req, res) => {
  try {
    const { fullName, email, phone, educationLevel, degreeLevel } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        fullName,
        email,
        phone,
        educationLevel,
        degreeLevel,
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  res.json(user);
};
