const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/authMiddleware'); // Import middleware

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Check if the email is valid
  const user = await User.findOne({ email });
  if (!user) {
    console.log('User not found');
    return res.status(404).json({ error: "User not found" });
  }

  // Check if the password matches
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    console.log('Invalid password');
    return res.status(400).json({ error: "Invalid password" });
  }

  // Create JWT token
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('Login successful');
  res.json({ token, role: user.role , userId: user.uniqueId || user._id });
});

// routes/auth.js (OPTIONAL)
router.post('/logout', (req, res) => {
  // On client, just clear the token. Server doesn't store it unless you implement a blacklist.
  res.json({ message: "Logged out successfully" });
});


// Get all users (protected, only accessible by admin)
router.get('/users', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
