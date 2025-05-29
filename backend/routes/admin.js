const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize } = require('../middleware/authMiddleware.js');
const bcrypt = require('bcryptjs');


// Create user route (for admin to create operator/viewer)
router.post('/create-user', async (req, res) => {
    const {fullName, email, password, role } = req.body;

    if (!['operator', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10); 
      console.log(hashedPassword);
        const newUser = new User({
            fullName,
            email,
            password:hashedPassword,
            role,
            uniqueId: uuidv4()
        });

        await newUser.save();
        res.status(201).json({ message: `${role} created successfully`, user: newUser });
    } catch (err) {
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
  "/users/:id/active",
  authenticate,
  authorize(["admin","operator"]),
  async (req, res) => {
    try {
      const { uniqueId  } = req.params;
      const { active } = req.body;

      if (typeof active !== "boolean") {
        return res.status(400).json({ error: "Active must be a boolean value (true/false)" });
      }

      const updatedUser = await User.findByIdAndUpdate(
        {uniqueId },
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


module.exports = router;
