const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  font: { type: String, required: true },
  color: { type: String, required: true },

  categorySelfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
  recipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }], 
  dateCreated: {
    type: Date,
    default: Date.now, // Set default date to current time
  },
});

module.exports = mongoose.model('Category', categorySchema);
