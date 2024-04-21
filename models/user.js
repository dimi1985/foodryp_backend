const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: String,
  gender: String,
  profileImage: String, // Add profile image field
  memberSince: { type: Date, default: Date.now },
  role: String,
  recipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likedRecipes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
  }],
  mealId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meal' }],
});

// Method to compare hashed password with plain text password
userSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
