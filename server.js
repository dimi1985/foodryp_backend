// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { registerUser, loginUser, uploadProfilePicture, getUserProfile,
   getAllUsers, updateUserRole,deleteUser,getFollowingUsers,
    followUser,unfollowUser,changeCredentials,getPublicUserProfile,getUsersByPage} = require('./controllers/userController');
const { saveCategory, uploadCategoryImage, getAllCategories,getFixedCategories,getCategoriesByPage } = require('./controllers/categoryController');
const { saveRecipe, uploadRecipeImage, getAllRecipes,
  likeRecipe,dislikeRecipe, updateRecipe,deleteRecipe,
  getUserPublicRecipesByPage,getRecipesByCategory,getFixedRecipes,getAllRecipesByPage ,getUserRecipesByPage} = require('./controllers/recipeController');

  const {saveWeeklyMenu,getWeeklyMenusByPage,getWeeklyMenusByPageAndUser} = require('./controllers/mealController');
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
mongoose.connect('mongodb://localhost:27017/foodryp');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

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
app.put('/api/changeCredentials/:userId', changeCredentials);
app.get('/api/getPublicUserProfile/:username', getPublicUserProfile);


app.post('/api/saveCategory/', saveCategory);
app.post('/api/uploadCategoryImage', uploadCategoryImage); 
app.get('/api/categories/', getAllCategories);
app.get('/api/categories/getFixedCategories', getFixedCategories);
app.get('/api/getCategoriesByPage/', getCategoriesByPage);



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


app.post('/api/saveWeeklyMenu', saveWeeklyMenu);
app.get('/api/getWeeklyMenusByPage/', getWeeklyMenusByPage);
app.get('/api/getWeeklyMenusByPageAndUser', getWeeklyMenusByPageAndUser);

// Start the server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
