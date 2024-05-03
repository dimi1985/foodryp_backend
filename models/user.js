const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const fridgeItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true }, 
}, { _id: false }); // Disable _id if you don't want separate IDs for fridge items



const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: String,
  gender: String,
  profileImage: String, // Add profile image field
  memberSince: { type: Date, default: Date.now },
  role: String,
  recipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
  likedRecipes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
  }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followRequestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followRequestsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followRequestsCanceled: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mealId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meal' }],
  fridgeItems: [fridgeItemSchema], // Embed fridge items array
});

// Method to compare hashed password with plain text password
userSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
