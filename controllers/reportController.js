// reportController.js

const Report = require('../models/reportModel');

exports.createReport = async (req, res) => {
    try {
      const { commentId, reason, reporterId } = req.body;

  
      const report = new Report({ commentId, reason, reporterId });
      await report.save();
  
      console.log('Report saved successfully');
      
      res.status(201).json({ message: 'Report created successfully' });
    } catch (error) {
      console.error('Error creating report:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  

  exports.deleteReport = async (req, res) => {
    try {
        // Extract report ID from request parameters
        const reportId = req.params.reportId; // Correctly extract reportId

        // Find the report in the database and delete it
        await Report.findByIdAndDelete(reportId);

        // Respond with success message
        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


exports.getAllReports = async (req, res) => {
    try {
        // Fetch all reports from the database
        const reports = await Report.find();
        
        // Respond with the fetched reports
        res.status(200).json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

