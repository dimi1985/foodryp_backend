// models/Wikifood.js

const mongoose = require('mongoose');

// Define the schema
const wikifoodSchema = new mongoose.Schema({
   
  title: {
    type: String,
    required: true,
  },

  text: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
}, {
    dateCreated: {
        type: Date,
        default: Date.now, // Set default date to current time
      },
});

wikifoodSchema.index({ title: 'text'});

// Create the model
const Wikifood = mongoose.model('Wikifood', wikifoodSchema);

module.exports = Wikifood;
