const mongoose = require('mongoose');

// Define the User schema
const userSchema = new mongoose.Schema({
    
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'operator', 'viewer'],  // Role can only be one of these
    },
    uniqueId: {
        type: String,
        required: true,
        unique: true,  // Ensures the unique ID is unique for every user
    },
    active: {
      type: Boolean,
      default: false, // or false if you want inactive by default
    },
    isScreenShare: {
      type: Boolean,
      default: false, // or false if you want inactive by default
    },
},
{
    timestamps: true,  // Automatically adds createdAt and updatedAt fields
});

// Create the User model
const User = mongoose.model('User', userSchema);

module.exports = User;
