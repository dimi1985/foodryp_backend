// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');

const { registerUser, loginUser, uploadProfilePicture, getUserProfile,
  getAllUsers, updateUserRole, deleteUser,
  changeCredentials, getPublicUserProfile, getUsersByPage, addFridgeItem, getFridgeItems, updateFridgeItem, deleteFridgeItem,sendFollowRequest,rejectFollowRequest,followUserBack,unfollowUser,acceptFollowRequest,savePin,getPin,validatePIN,resetPassword } = require('./controllers/userController');
const { saveCategory, getAllCategories, getFixedCategories, getCategoriesByPage, updateCategory, deleteCategory,uploadCategoryImage } = require('./controllers/categoryController');
const { saveRecipe, uploadRecipeImage, getAllRecipes,
  recommendRecipe, unRecommendRecipe, updateRecipe, deleteRecipe,
  getUserPublicRecipesByPage, getRecipesByCategory
  , getFixedRecipes, getAllRecipesByPage, getUserRecipesByPage, searchRecipesByName,getTopThreeRecipes, rateRecipe,getFollowingUsersRecipes,saveUserRecipes,getUserSavedRecipes,removeUserRecipes,getUserSavedRecipesDetails } = require('./controllers/recipeController');

const { saveWeeklyMenu, getWeeklyMenusByPage, getWeeklyMenusByPageAndUser, getWeeklyMenusFixedLength, updateWeeklyMenu,removeFromWeeklyMenu } = require('./controllers/mealController');
const { createComment,getComments, updateComment, deleteComment,getReportedComment, getAllComments, getCommentById } = require('./controllers/commentController');

const { createWikiFood, updateWikiFood, deleteWikiFood, searchWikiFoodByTitle, getWikiFoodsByPage } = require('./controllers/wikiFoodController');

const { createReport, deleteReport,getAllReports} = require('./controllers/reportController');



const app = express();


const port = 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(cors());

app.use('/profilePictures', express.static('profilePictures'));

app.use('/categoryPictures', express.static('categoryPictures'));

app.use('/recipePictures', express.static('recipePictures'));

// Increase payload size limit (e.g., 50MB)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/foodryp')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

const db = mongoose.connection;
//User Section
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

//Category Section
app.post('/api/saveCategory/', saveCategory);
app.post('/api/updateCategory/:categoryId', updateCategory);
app.get('/api/categories/', getAllCategories);
app.post('/api/uploadCategoryImage', uploadCategoryImage);
app.get('/api/categories/getFixedCategories', getFixedCategories);
app.get('/api/getCategoriesByPage/', getCategoriesByPage);
app.delete('/api/deleteCategory/:categoryId', deleteCategory);

//Recipe Section

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
//WeeklyMenu Section

app.post('/api/saveWeeklyMenu', saveWeeklyMenu);
app.get('/api/getWeeklyMenusByPage/', getWeeklyMenusByPage);
app.get('/api/getWeeklyMenusByPageAndUser/:userId', getWeeklyMenusByPageAndUser);
app.get('/api/getWeeklyMenusFixedLength', getWeeklyMenusFixedLength);
app.put('/api/updateWeeklyMenu', updateWeeklyMenu);
app.delete('/api/removeFromWeeklyMenu/:weeklyMenuId', removeFromWeeklyMenu);



//Comment Section
app.post('/api/createComment', createComment);
app.get('/api/getAllComments', getAllComments);
app.get('/api/getComments/:recipeId', getComments);
app.put('/api/updateComment/:commentId', updateComment);
app.delete('/api/deleteComment/:commentId', deleteComment);
app.get('/api/getReportedComment/:commentId', getReportedComment);
app.get('/api/getCommentById/:commentId', getCommentById);


//WikiFood Section
app.post('/api/createWikiFood', createWikiFood);
app.put('/api/updateWikiFood/:id', updateWikiFood);
app.delete('/api/deleteWikiFood/:id', deleteWikiFood);
app.get('/api/searchWikiFoodByTitle', searchWikiFoodByTitle);
app.get('/api/getWikiFoodsByPage', getWikiFoodsByPage);

//report Section
app.post('/api/createReport', createReport);
app.delete('/api/deleteReport/:reportId', deleteReport);
app.get('/api/getAllReports', getAllReports);
// app.put('/api/updateWikiFood/:id', updateWikiFood);
// app.get('/api/searchWikiFoodByTitle', searchWikiFoodByTitle);


// Start the server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
