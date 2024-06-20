const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');

exports.getServerStatus = async (req, res) => {
  try {
    const uptime = os.uptime();
    const loadAverage = os.loadavg();
    const memoryUsage = process.memoryUsage();
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();

    res.status(200).json({
      uptime,
      loadAverage,
      memoryUsage,
      freeMemory,
      totalMemory,
    });
  } catch (error) {
    console.error('Error fetching server status:', error);
    res.status(500).json({ error: 'Failed to get server status' });
  }
};

exports.getDatabaseStatus = async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    res.status(200).json({
      dbStatus,
      dbStatusText: dbStatus === 1 ? 'connected' : 'disconnected',
    });
  } catch (error) {
    console.error('Error fetching database status:', error);
    res.status(500).json({ error: 'Failed to get database status' });
  }
};

exports.getBackupStatus = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../backups/foodryp');
    console.log(`Looking for backups in directory: ${backupDir}`);
    const backupFiles = await fs.readdir(backupDir);
    const backupDetails = await Promise.all(
      backupFiles.map(async (file) => {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        return {
          file,
          size: stats.size,
          lastModified: stats.mtime,
        };
      })
    );

    res.status(200).json(backupDetails);
  } catch (error) {
    console.error('Error fetching backup status:', error);
    res.status(500).json({ error: 'Failed to get backup status' });
  }
};
