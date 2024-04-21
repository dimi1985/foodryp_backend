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
    type: [],
    required: true,
  },
  instructions: {
    type: [],
    required: true,
  },
  prepDuration: {
    type: String,
  },
  cookDuration: {
    type: String,
  },
  servingNumber: {
    type: String,

    required: true,
  },
  difficulty: {
    type: String,

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
    ref: 'User',
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
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  categoryColor: {
    type: String,
    required: true,
  },
  categoryFont: {
    type: String,
    required: true,
  },
  categoryName: {
    type: String,
    required: true,
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  meal: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meal' }],
});

module.exports = mongoose.model('Recipe', recipeSchema);
