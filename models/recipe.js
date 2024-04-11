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

});

module.exports = mongoose.model('Recipe', recipeSchema);
