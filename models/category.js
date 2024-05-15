const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  font: { type: String, required: true },
  color: { type: String, required: true },
  categoryImage: { type: String, default: '' },
  recipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
  dateCreated: { type: Date, default: Date.now },
  isForDiet: { type: Boolean, default: false }, // New field for diet
  isForVegetarians: { type: Boolean, default: false } // New field for vegetarians
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
