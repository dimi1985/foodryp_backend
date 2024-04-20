const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  title: { type: String, required: true },
  dayOfWeek: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user who created the meal
  username: { type: String, required: true }, // Username of the user who created the meal
  userProfileImage: String, // Profile image of the user who created the meal
});

module.exports = mongoose.model('Meal', mealSchema);
