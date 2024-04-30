const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  title: { type: String, required: true },
  dayOfWeek: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  userProfileImage: String,
  dateCreated: {
    type: Date,
    default: Date.now, 
  },
});

module.exports = mongoose.model('Meal', mealSchema);
