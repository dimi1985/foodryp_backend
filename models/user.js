const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, required: true, unique: true }, // Ensure email uniqueness
  password: String,
  gender: String,
  profileImage: String, // Add profile image field
  memberSince: { type: Date, default: Date.now }, // Add memberSince field with default value as current date
  role: { type: String, enum: ['admin', 'user'], default: 'user' }, // Add role field with default value 'user'
});

// Method to compare hashed password with plain text password
userSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
