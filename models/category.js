const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  font: { type: String, required: true },
  color: { type: String, required: true },
  categoryImage: String,
  categorySelfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
  recipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }] 
});

module.exports = mongoose.model('Category', categorySchema);
