const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  mfaSecret: {
    type: String,
  },
  role: {
    type: String,
    required: true,
    default: 'User',
    enum: ['Admin', 'Manager', 'User', 'Guest', 'admin', 'super-admin', 'editor', 'viewer'],
  },
  lastActive: {
    type: Date,
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;