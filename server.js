// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { registerUser, loginUser, uploadProfilePicture, getUserProfile,
   getAllUsers, updateUserRole,deleteUser,getFollowingUsers,
    followUser,unfollowUser} = require('./controllers/userController');
const { saveCategory, uploadCategoryImage, getAllCategories } = require('./controllers/categoryController');
const { saveRecipe, uploadRecipeImage, getAllRecipes,getUserRecipes,likeRecipe,dislikeRecipe, updateRecipe } = require('./controllers/recipeController');
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

app.post('/api/register', registerUser);
app.post('/api/login', loginUser);
app.get('/api/userProfile/:userId', getUserProfile);
app.post('/api/uploadProfilePic', uploadProfilePicture); 
app.get('/api/allUsers', getAllUsers); 
app.put('/api/userRole/:userId', updateUserRole);
app.delete('/api/deleteUser/:userId', deleteUser);
app.get('/api/getFollowingUsers/:userId', getFollowingUsers);
app.post('/api/followUser', followUser);
app.post('/api/unfollowUser', unfollowUser);  

app.post('/api/saveCategory/', saveCategory);
app.post('/api/uploadCategoryImage', uploadCategoryImage); 
app.get('/api/categories/', getAllCategories);



app.post('/api/saveRecipe/', saveRecipe);
app.post('/api/uploadRecipeImage', uploadRecipeImage); 
app.get('/api/recipes/', getAllRecipes);
app.get('/api/getUserRecipes/', getUserRecipes);
app.post('/api/recipe/likeRecipe', likeRecipe);
app.post('/api/recipe/dislikeRecipe', dislikeRecipe);
app.put('/api/updateRecipe/:recipeId', updateRecipe);


// Start the server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
