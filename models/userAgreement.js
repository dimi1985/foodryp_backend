const mongoose = require('mongoose');

const userAgreementSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  agreementTimestamp: { type: Date, default: Date.now },
  agreementVersion: { type: String, required: true },
  agreementText: { type: String, required: true } // Store the actual agreement text
});

const UserAgreement = mongoose.model('UserAgreement', userAgreementSchema);

module.exports = UserAgreement;
