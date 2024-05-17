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
  dateCreated: {
    type: Date,
    default: Date.now,
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
  recomendedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  meal: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meal' }],
  commentId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  isForDiet: { type: Boolean, default: false },
  isForVegetarians: { type: Boolean, default: false },
  rating: { type: Number, default: 0 }, // Added for storing average rating
  ratingCount: { type: Number, default: 0 } // Added for storing count of ratings
});

recipeSchema.index({ recipeTitle: 'text', description: 'text' });

module.exports = mongoose.model('Recipe', recipeSchema);
