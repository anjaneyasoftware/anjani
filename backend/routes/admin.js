const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize } = require('../middleware/authMiddleware.js');
const bcrypt = require('bcryptjs');


// Create user route (for admin to create operator/viewer)
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // adjust path if needed

router.post('/create-users', async (req, res) => {
  const users = req.body.users;

  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'No users provided' });
  }

  try {
    const newUsers = [];

    for (const user of users) {
      const { fullName, email, password, role } = user;

      if (!['operator', 'viewer'].includes(role)) {
        return res.status(400).json({ error: `Invalid role for user: ${email}` });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      newUsers.push({
        fullName,
        email,
        password: hashedPassword,
        role,
        uniqueId: uuidv4(),
      });
    }

    const insertedUsers = await User.insertMany(newUsers);
    res.status(201).json({ message: 'Users created successfully', users: insertedUsers });
  } catch (err) {
    console.error("Batch user creation failed:", err);
    res.status(500).json({ error: err.message });
  }
});




// Get all users for display
// Get all users (protected, only accessible by admin or operator)
router.get('/users', authenticate, authorize(['admin', 'operator']), async (req, res) => {
  try {
    const users = await User.find({}, '-password '); // Select only needed fields
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});





router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});



router.patch(
  "/users/:uniqueId/active",
  authenticate,
  authorize(["admin", "operator"]),
  async (req, res) => {
    try {
      const { uniqueId } = req.params;
      const { active } = req.body;

      if (typeof active !== "boolean") {
        return res.status(400).json({ error: "Active must be a boolean value (true/false)" });
      }

      const updatedUser = await User.findOneAndUpdate(
        { uniqueId },
        { active },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        message: `User ${active ? "activated" : "deactivated"} successfully`,
        user: updatedUser,
      });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.patch(
  "/users/:uniqueId/isScreenShare",
  authenticate,
  authorize(["admin", "operator"]),
  async (req, res) => {
    try {
      const { uniqueId } = req.params;
      const { isScreenShare } = req.body;

      if (typeof isScreenShare !== "boolean") {
        return res.status(400).json({ error: "Active must be a boolean value (true/false)" });
      }

      const updatedUser = await User.findOneAndUpdate(
        { uniqueId },
        { isScreenShare },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        message: `User ${isScreenShare ? "shared" : "unshared"} successfully`,
        user: updatedUser,
      });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  }
);




module.exports = router;
