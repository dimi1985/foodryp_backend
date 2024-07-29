const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const {
  registerUser, loginUser, uploadProfilePicture, getUserProfile,
  getAllUsers, updateUserRole, deleteUser,
  changeCredentials, getPublicUserProfile, getUsersByPage, addFridgeItem, getFridgeItems, updateFridgeItem, deleteFridgeItem, sendFollowRequest, rejectFollowRequest, followUserBack, unfollowUser, acceptFollowRequest, savePin, getPin, validatePIN, resetPassword, updateThemePreference, updateLanguagePreference, getThemePreference, getLanguagePreference,
} = require('./controllers/userController');
const { saveCategory, getAllCategories, getFixedCategories, getCategoriesByPage, updateCategory, deleteCategory, uploadCategoryImage } = require('./controllers/categoryController');
const {
  saveRecipe, uploadRecipeImage, getAllRecipes,
  recommendRecipe, unRecommendRecipe, updateRecipe, deleteRecipe,
  getUserPublicRecipesByPage, getRecipesByCategory,
  getFixedRecipes, getAllRecipesByPage, getUserRecipesByPage, searchRecipesByName, getTopThreeRecipes, rateRecipe, getFollowingUsersRecipes, saveUserRecipes, getUserSavedRecipes, removeUserRecipes, getUserSavedRecipesDetails, getPremiumRecipes, isRecipePremium, invalidateCache
} = require('./controllers/recipeController');
const { saveWeeklyMenu, getWeeklyMenusByPage, getWeeklyMenusByPageAndUser, getWeeklyMenusFixedLength, updateWeeklyMenu, removeFromWeeklyMenu } = require('./controllers/mealController');
const { createComment, getComments, updateComment, deleteComment, getReportedComment, getAllComments, getCommentById } = require('./controllers/commentController');
const { createWikiFood, updateWikiFood, deleteWikiFood, searchWikiFoodByTitle, getWikiFoodsByPage } = require('./controllers/wikiFoodController');
const { createReport, deleteReport, getAllReports } = require('./controllers/reportController');
const { saveAgreement } = require('./controllers/userAgreementController');
const { getServerStatus, getDatabaseStatus, getBackupStatus } = require('./controllers/serverMonitor');
const { monitorMiddleware, restoreDatabase } = require('./middleware/monitorMiddleware');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(monitorMiddleware); // Add the middleware here

// Increase the maximum number of listeners
mongoose.connection.setMaxListeners(20);

// Track if initial backup has been done
let initialBackupDone = false;

// Track last backup timestamp
let lastBackupTimestamp = null;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/foodryp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  socketTimeoutMS: 45000 // Close sockets after 45 seconds of inactivity
}).then(() => {
  console.log('Connected to MongoDB');
  checkAndRestoreDatabase().then(() => {
    if (!initialBackupDone) {
      initialBackupIfNotEmpty('foodryp').then(() => {
        initialBackupDone = true;
      });
    }
  });
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

const db = mongoose.connection;

db.on('error', (error) => {
  console.error('Connection error:', error);
});

db.once('open', () => {
  console.log('Connected to MongoDB');
});

async function backupDatabases() {
  try {
    const currentTime = new Date();
    // Check if a backup was done within the last hour
    if (lastBackupTimestamp && (currentTime - lastBackupTimestamp) < 3600000) {
      console.log("Backup recently done, skipping this cycle.");
      return;
    }

    const databases = ['foodryp'];

    for (const dbName of databases) {
      const dbInstance = mongoose.connection.useDb(dbName);
      const collections = await dbInstance.db.listCollections().toArray();

      const backupDir = path.join(__dirname, 'backups', dbName);
      console.log(`Backing up to directory: ${backupDir}`);
      await fs.ensureDir(backupDir);

      for (const collection of collections) {
        const docs = await dbInstance.collection(collection.name).find({}).toArray();
        if (docs.length > 0) {
          const filePath = path.join(backupDir, `${collection.name}.json`);
          console.log(`Writing backup file: ${filePath}`);
          await fs.writeJson(filePath, docs);
        }
      }
    }
    console.log("Backup completed successfully.");
    lastBackupTimestamp = currentTime; // Update the last backup timestamp
  } catch (err) {
    console.error("Error during backup:", err);
  }
}

async function isDatabaseEmpty(dbName) {
  const dbInstance = mongoose.connection.useDb(dbName);
  const collections = await dbInstance.db.listCollections().toArray();

  for (const collection of collections) {
    const count = await dbInstance.collection(collection.name).countDocuments();
    if (count > 0) {
      return false;
    }
  }
  return true;
}

async function recreateDatabaseIfEmpty(dbName) {
  if (await isDatabaseEmpty(dbName)) {
    const backupDir = path.join(__dirname, 'backups', dbName);
    console.log(`Restoring from backup directory: ${backupDir}`);
    const files = await fs.readdir(backupDir);

    for (const file of files) {
      const collectionName = path.basename(file, '.json');
      const filePath = path.join(backupDir, file);
      console.log(`Reading backup file: ${filePath}`);
      const data = await fs.readJson(filePath);

      if (data.length > 0) {
        const dbInstance = mongoose.connection.useDb(dbName);
        const collection = dbInstance.collection(collectionName);
        await collection.insertMany(data);
      }
    }
    console.log(`Database ${dbName} has been recreated from backup.`);
  } else {
    console.log(`Database ${dbName} is not empty.`);
  }
}

async function checkAndRestoreDatabase() {
  const dbName = 'foodryp';
  await recreateDatabaseIfEmpty(dbName);
}

async function initialBackupIfNotEmpty(dbName) {
  if (!(await isDatabaseEmpty(dbName))) {
    console.log(`Database ${dbName} is not empty, creating initial backup.`);
    await backupDatabases();
  } else {
    console.log(`Database ${dbName} is empty, skipping initial backup.`);
  }
}

// Schedule the backup to run every hour
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled database backup.');
  backupDatabases();
});

// User Section
app.get('/api/allUsers', getAllUsers);
app.get('/api/getUsersByPage', getUsersByPage);
app.post('/api/register', registerUser);
app.post('/api/login', loginUser);
app.get('/api/userProfile/:userId', getUserProfile);
app.post('/api/uploadProfilePic', uploadProfilePicture);
app.put('/api/userRole/:userId', updateUserRole);
app.delete('/api/deleteUser/:userId', deleteUser);
app.put('/api/changeCredentials/:userId', changeCredentials);
app.get('/api/getPublicUserProfile/:username', getPublicUserProfile);
app.post('/api/addFridgeItem', addFridgeItem);
app.get('/api/getFridgeItems/:userId', getFridgeItems);
app.delete('/api/deleteFridgeItem/', deleteFridgeItem);
app.put('/api/updateFridgeItem/', updateFridgeItem);
app.post('/api/savePin', savePin);
app.get('/api/getPin/:userId', getPin);
app.post('/api/validatePIN/', validatePIN);
app.put('/api/resetPassword', resetPassword);

app.post('/api/sendFollowRequest', sendFollowRequest);
app.post('/api/rejectFollowRequest', rejectFollowRequest);
app.post('/api/followUserBack', followUserBack);
app.post('/api/unfollowUser/', unfollowUser);
app.post('/api/acceptFollowRequest/', acceptFollowRequest);
app.put('/api/theme', updateThemePreference);
app.put('/api/language', updateLanguagePreference);
app.get('/api/themePreference/:userId', getThemePreference);
app.get('/api/languagePreference/:userId', getLanguagePreference);

// Category Section
app.post('/api/saveCategory/', saveCategory);
app.post('/api/updateCategory/:categoryId', updateCategory);
app.get('/api/categories/', getAllCategories);
app.post('/api/uploadCategoryImage', uploadCategoryImage);
app.get('/api/categories/getFixedCategories', getFixedCategories);
app.get('/api/getCategoriesByPage/', getCategoriesByPage);
app.delete('/api/deleteCategory/:categoryId', deleteCategory);

// Recipe Section
app.post('/api/saveRecipe/', saveRecipe);
app.post('/api/uploadRecipeImage', uploadRecipeImage);
app.get('/api/recipes/', getAllRecipes);
app.post('/api/recipe/recommendRecipe', recommendRecipe);
app.post('/api/recipe/unRecommendRecipe', unRecommendRecipe);
app.put('/api/updateRecipe/:recipeId', updateRecipe);
app.delete('/api/deleteRecipe/:recipeId', deleteRecipe);
app.get('/api/getRecipesByCategory/:categoryName', getRecipesByCategory);
app.get('/api/recipes/getFixedRecipes', getFixedRecipes);
app.get('/api/getAllRecipesByPage', getAllRecipesByPage);
app.get('/api/getUserRecipesByPage/:userId', getUserRecipesByPage);
app.get('/api/getUserPublicRecipes/:username', getUserPublicRecipesByPage);
app.get('/api/searchRecipesByName', searchRecipesByName);
app.get('/api/getTopThreeRecipes', getTopThreeRecipes);
app.post('/api/rateRecipe', rateRecipe);
app.get('/api/getFollowingUsersRecipes/:userId', getFollowingUsersRecipes);
app.post('/api/saveUserRecipes/:userId', saveUserRecipes);
app.get('/api/getUserSavedRecipes/:userId', getUserSavedRecipes);
app.get('/api/getUserSavedRecipesDetails/:userId', getUserSavedRecipesDetails);
app.delete('/api/removeUserRecipes/:userId', removeUserRecipes);
app.get('/api/premium_recipes/:userId', getPremiumRecipes);
app.get('/api/recipes/isPremium/:recipeId', isRecipePremium);
app.post('/api/invalidate-cache', invalidateCache);

// WeeklyMenu Section
app.post('/api/saveWeeklyMenu', saveWeeklyMenu);
app.get('/api/getWeeklyMenusByPage/', getWeeklyMenusByPage);
app.get('/api/getWeeklyMenusByPageAndUser/:userId', getWeeklyMenusByPageAndUser);
app.get('/api/getWeeklyMenusFixedLength', getWeeklyMenusFixedLength);
app.put('/api/updateWeeklyMenu', updateWeeklyMenu);
app.delete('/api/removeFromWeeklyMenu/:weeklyMenuId', removeFromWeeklyMenu);

// Comment Section
app.post('/api/createComment', createComment);
app.get('/api/getAllComments', getAllComments);
app.get('/api/getComments/:recipeId', getComments);
app.put('/api/updateComment/:commentId', updateComment);
app.delete('/api/deleteComment/:commentId', deleteComment);
app.get('/api/getReportedComment/:commentId', getReportedComment);
app.get('/api/getCommentById/:commentId', getCommentById);

// WikiFood Section
app.post('/api/createWikiFood', createWikiFood);
app.put('/api/updateWikiFood/:id', updateWikiFood);
app.delete('/api/deleteWikiFood/:id', deleteWikiFood);
app.get('/api/searchWikiFoodByTitle', searchWikiFoodByTitle);
app.get('/api/getWikiFoodsByPage', getWikiFoodsByPage);

// Report Section
app.post('/api/createReport', createReport);
app.delete('/api/deleteReport/:reportId', deleteReport);
app.get('/api/getAllReports', getAllReports);

// User Agreement Section
app.post('/api/saveAgreement', saveAgreement);

// Server Monitor Section
app.get('/api/serverStatus', getServerStatus);
app.get('/api/databaseStatus', getDatabaseStatus);
app.get('/api/backupStatus', getBackupStatus);

// Start the server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

server.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
  console.log(`WebSocket is listening at ${server}`);
});
