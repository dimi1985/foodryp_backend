const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },  // Reference to the associated recipe
  username: { type: String },
  useImage: { type: String },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],  // Reference to other comments
  dateCreated: { type: Date, default: Date.now },
  dateUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
