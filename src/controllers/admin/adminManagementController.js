const User = require("../../models/User");
const Admin = require("../../models/Admin");

// ================================
// PROMOTE USER TO ADMIN
// ================================
const promoteUserToAdmin = async (req, res) => {
  try {
    const { userId, permissions = [] } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = "admin";
    await user.save();

    const adminExists = await Admin.findOne({ email: user.email });
    if (adminExists) {
      return res.json({ message: "User already admin" });
    }

    const admin = await Admin.create({
      fullName: user.fullName,
      email: user.email,
      password: user.password,
      mobileno: user.mobileno,
      role: "admin",
      permissions,
      isVerified: true,
      createdBy: req.admin._id,
    });

    res.json({
      success: true,
      message: "User promoted to admin",
      admin,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { promoteUserToAdmin };
