// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { registerUser, loginUser, uploadProfilePicture, getUserProfile,
   getAllUsers, updateUserRole,deleteUser,getFollowingUsers,searchUsersByFollowedByRequest,
    followUser,unfollowUser,followBack,changeCredentials,getPublicUserProfile,getUsersByPage, addFridgeItem,getFridgeItems,updateFridgeItem ,deleteFridgeItem} = require('./controllers/userController');
const { saveCategory, uploadCategoryImage, getAllCategories,getFixedCategories,getCategoriesByPage,updateCategory,deleteCategory } = require('./controllers/categoryController');
const { saveRecipe, uploadRecipeImage, getAllRecipes,
  likeRecipe,dislikeRecipe, updateRecipe,deleteRecipe,
  getUserPublicRecipesByPage,getRecipesByCategory
  ,getFixedRecipes,getAllRecipesByPage ,getUserRecipesByPage,searchRecipesByName} = require('./controllers/recipeController');

  const {saveWeeklyMenu,getWeeklyMenusByPage,getWeeklyMenusByPageAndUser,getWeeklyMenusFixedLength,updateWeeklyMenu} = require('./controllers/mealController');
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

app.get('/api/allUsers', getAllUsers);
app.get('/api/getUsersByPage', getUsersByPage); 
app.post('/api/register', registerUser);
app.post('/api/login', loginUser);
app.get('/api/userProfile/:userId', getUserProfile);
app.post('/api/uploadProfilePic', uploadProfilePicture); 
app.put('/api/userRole/:userId', updateUserRole);
app.delete('/api/deleteUser/:userId', deleteUser);
app.get('/api/getFollowingUsers/:userId', getFollowingUsers);
app.post('/api/followUser', followUser);
app.post('/api/unfollowUser', unfollowUser);
app.post('/api/searchUsersByFollowedByRequest', searchUsersByFollowedByRequest);
app.post('/api/followBack', followBack);    
app.put('/api/changeCredentials/:userId', changeCredentials);
app.get('/api/getPublicUserProfile/:username', getPublicUserProfile);
app.post('/api/addFridgeItem', addFridgeItem);  
app.get('/api/getFridgeItems/:userId', getFridgeItems);
app.delete('/api/deleteFridgeItem/', deleteFridgeItem);
app.put('/api/updateFridgeItem/', updateFridgeItem);


app.post('/api/saveCategory/', saveCategory);
app.post('/api/updateCategory/:categoryId', updateCategory);
app.get('/api/categories/', getAllCategories);
app.get('/api/categories/getFixedCategories', getFixedCategories);
app.get('/api/getCategoriesByPage/', getCategoriesByPage);
app.delete('/api/deleteCategory/:categoryId', deleteCategory);



app.post('/api/saveRecipe/', saveRecipe);
app.post('/api/uploadRecipeImage', uploadRecipeImage); 
app.get('/api/recipes/', getAllRecipes);
app.post('/api/recipe/likeRecipe', likeRecipe);
app.post('/api/recipe/dislikeRecipe', dislikeRecipe);
app.put('/api/updateRecipe/:recipeId', updateRecipe);
app.delete('/api/deleteRecipe/:recipeId', deleteRecipe);
app.get('/api/getRecipesByCategory/:categoryName', getRecipesByCategory); 
app.get('/api/recipes/getFixedRecipes', getFixedRecipes);
app.get('/api/getAllRecipesByPage', getAllRecipesByPage);
app.get('/api/getUserRecipesByPage/:userId', getUserRecipesByPage);
app.get('/api/getUserPublicRecipes/:username', getUserPublicRecipesByPage);
app.get('/api/searchRecipesByName', searchRecipesByName);


app.post('/api/saveWeeklyMenu', saveWeeklyMenu);
app.get('/api/getWeeklyMenusByPage/', getWeeklyMenusByPage);
app.get('/api/getWeeklyMenusByPageAndUser', getWeeklyMenusByPageAndUser);
app.get('/api/getWeeklyMenusFixedLength', getWeeklyMenusFixedLength);
app.put('/api/updateWeeklyMenu', updateWeeklyMenu);

// Start the server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
