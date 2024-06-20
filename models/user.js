const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const fridgeItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
}, { _id: false }); // Disable _id if you don't want separate IDs for fridge items

// Define a schema for individual ratings
const userRatingSchema = new mongoose.Schema({
  recipe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1, // minimum rating value
    max: 5 // maximum rating value
  }
}, { _id: true }); // Include _id if you want to be able to uniquely identify ratings

const activitySchema = new mongoose.Schema({
  type: { type: String, enum: ['rating', 'comment', 'new_recipe'], required: true },
  date: { type: Date, default: Date.now },
  recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' },
  rating: { type: Number } // Only relevant if type is 'rating'
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: String,
  gender: String,
  profileImage: String, // Add profile image field
  memberSince: { type: Date, default: Date.now },
  role: String,
  recipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
  recommendedRecipes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
  }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followRequestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followRequestsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followRequestsCanceled: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mealId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meal' }],
  commentId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  fridgeItems: [fridgeItemSchema], // Embed fridge items array
  ratings: [userRatingSchema], // Add this line to include ratings in the user schema
  activities: [activitySchema],
  savedRecipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
  tokens: [{ token: String }],
  pinHash: String, // Store hashed PIN here
  themePreference: { type: String, enum: ['light', 'dark'], default: 'light' },
  languagePreference: { type: String, enum: ['en-US', 'el-GR'], default: 'en-US' },
});

// Method to compare hashed password with plain text password
userSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to hash a PIN
userSchema.methods.hashPin = async function (pin) {
  const saltRounds = 10; // Adjust according to your security needs
  return await bcrypt.hash(pin, saltRounds);
};

userSchema.methods.isValidPIN = async function (inputPin) {
  // Correcting to use 'this.pinHash' as that is the actual field name per your schema
  return bcrypt.compare(inputPin, this.pinHash);
};


module.exports = mongoose.model('User', userSchema);
