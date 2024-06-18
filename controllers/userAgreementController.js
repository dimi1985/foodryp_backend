const UserAgreement = require('../models/userAgreement');

exports.saveAgreement = async (req, res) => {
    try {
      const { userId, agreementVersion, agreementText } = req.body;
  
      const agreement = new UserAgreement({
        userId,
        agreementVersion,
        agreementText
      });
  
      await agreement.save();
  
      res.status(201).json({ status: 'success' });
    } catch (error) {
      res.status(500).json({ status: 'failed', message: error.message });
    }
  };