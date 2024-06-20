const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs-extra');
const path = require('path');

const serverIp = '127.0.0.1'; // Replace with your server's IP
let isListenerAdded = false;

const monitorMiddleware = (req, res, next) => {
  if (!isListenerAdded) {
    mongoose.connection.on('open', () => {
      mongoose.connection.db.listCollections().toArray((err, collections) => {
        if (err) {
          console.error('Error listing collections:', err);
          return;
        }

        collections.forEach((collection) => {
          mongoose.connection.db.collection(collection.name).watch().on('change', (change) => {
            if (change.operationType === 'drop') {
              const clientIp = req.ip;
              if (clientIp !== '127.0.0.1' && clientIp !== serverIp) {
                console.log(`Suspicious deletion attempt detected from IP: ${clientIp} on collection: ${collection.name}`);
                sendAlert(clientIp, collection.name);
                restoreDatabase();
              }
            }
          });
        });
      });
    });
    isListenerAdded = true;
  }
  next();
};

const sendAlert = (clientIp, collectionName) => {
  const message = `Unauthorized deletion attempt from IP: ${clientIp} on collection: ${collectionName}`;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const restoreDatabase = async () => {
  try {
    const backupDir = path.join(__dirname, '../backups/foodryp');
    console.log(`Restoring from backup directory: ${backupDir}`);
    const files = await fs.readdir(backupDir);

    for (const file of files) {
      const collectionName = path.basename(file, '.json');
      const filePath = path.join(backupDir, file);
      console.log(`Reading backup file: ${filePath}`);
      const data = await fs.readJson(filePath);

      const dbInstance = mongoose.connection.useDb('foodryp');
      const collection = dbInstance.collection(collectionName);
      await collection.deleteMany({}); // Clear the collection before restoring
      await collection.insertMany(data);
    }
    console.log(`Database has been restored from backup.`);
  } catch (err) {
    console.error("Error during database restoration:", err);
  }
};

module.exports = { monitorMiddleware, restoreDatabase };
