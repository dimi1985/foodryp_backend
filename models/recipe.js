const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  recipeTitle: {
    type: String,
    required: true,
  },

  recipeImage: {
    type: String,
  },
  ingredients: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Ingredient', // Reference the Ingredient model
    required: true,
  },
  duration: {
    type: Number,
    min: 0, // Optional validation for minimum duration
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'], // Enforce difficulty options
    required: true,
  },
  username: {
    type: String,
  },
  useImage: {
    type: String,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference the User model (optional)
    required: true,
  },
  date: {
    type: Date,
    default: Date.now, // Set default date to current time
  },
  description: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Recipe', recipeSchema);
