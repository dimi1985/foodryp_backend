const Recipe = require('../models/recipe');
const Category = require('../models/category');
const User = require('../models/user');
const multer = require('multer');

const fs = require('fs');
const path = require('path');

// Configure multer to handle category image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'recipePictures'); // Adjust directory path if needed
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const recipeId = req.body.recipeId; // Assuming you have categoryId in the request body
        cb(null, `${recipeId}${ext}`);
    }
});






const upload = multer({ storage: storage });

// Method to save category with all fields and upload image (merged)
exports.saveRecipe = async (req, res) => {
  try {
    
      const { recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty, username, useImage, 
        userId, date, description, recipeImage, instructions, 
        categoryId, categoryColor, categoryFont,categoryName,likedBy } = req.body;

      const existingRecipe = await Recipe.findOne({ recipeTitle });
      if (existingRecipe) {
         
          return res.status(400).json({ message: 'Recipe already exists' });
      }

      const newRecipe = new Recipe({ recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty,
         username, useImage, userId, date, description, recipeImage,
          instructions, categoryId, categoryColor, categoryFont,categoryName, likedBy });
      
      await newRecipe.save();
     
 
      // Update category recipes field
      await Category.findByIdAndUpdate(categoryId, { $push: { recipes: newRecipe._id } });
     
      // Update user recipes field
      await User.findByIdAndUpdate(userId, { $push: { recipes: newRecipe._id } });
      

      res.status(201).json({ message: 'Recipe saved successfully', recipeId: newRecipe._id });
  } catch (error) {
      console.error('Error saving recipe:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};



exports.uploadRecipeImage = async (req, res) => {
    try {
      // Apply multer middleware for file upload
      await upload.single('recipeImage')(req, res, async (err) => {
        if (err) {
          console.error('Error uploading recipe  picture:', err);
          return res.status(400).json({ message: 'Error uploading file' });
        }
  
        // Check if file upload was successful
        if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
        }
  
        // Extract recipe ID from request body
        const recipeId = req.body.recipeId;
  
        // Find recipe by ID
        let recipe = await Recipe.findById(recipeId);
        console.log('recipeId uploadRecipeImage',recipeId);
  
        // If user doesn't exist, return error
        if (!recipe) {
          return res.status(404).json({ message: 'recipe not found' });
        }
  
        // Check recipe picture
        // If yes, delete the old image file
        if (recipe.recipeImage) {
          // Delete the old image file (if it exists)
          try {
            fs.unlinkSync(recipe.recipeImage);
          } catch (deleteError) {
            console.error('Error deleting old image file:', deleteError);
            // Handle error deleting old image file
          }
        }
  
        // Update the user document with the new profile picture URL
        await Recipe.updateOne(
          { _id: recipeId }, // Filter criteria: find user by ID
          { $set: { recipeImage: req.file.path } } // Update: set the new profile picture URL
        );
  
        res.status(200).json({ message: 'Recipe Image uploaded successfully' });
      });
    } catch (error) {
      console.error('Error uploading recipe Image:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  exports.updateRecipe = async (req, res) => {
    try {

      const recipeId = req.params.recipeId;


      const {recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty, username, useImage, 
        userId, date, description, recipeImage, instructions, 
        categoryId, categoryColor, categoryFont, categoryName, likedBy } = req.body;
  
        
      // Update the recipe fields
      const updateFields = {
        recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty, username, useImage, 
        userId, date, description, recipeImage, instructions, 
        categoryId, categoryColor, categoryFont, categoryName, likedBy
      };

      console.log('Recied Request to update the recipe ');
      console.log('recipeId ', recipeId);
      // Check if the recipe exists and update it
      const result = await Recipe.updateOne({ _id: recipeId }, { $set: updateFields });
      console.log('result Request :', result);
  
      if (result.nModified === 0) {
        return res.status(404).json({ message: 'Recipe not found' });
      }
  
      res.status(200).json({ message: 'Recipe updated successfully' });
    } catch (error) {
      console.error('Error updating recipe:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  exports.getAllRecipes = async (req, res) => {
    try {
      // Fetch all categories
      const recipes = await Recipe.find();
      
      // Check if any categories found
      if (!recipes.length) {
        return res.status(204).json({ message: 'No recipes found' });
      }
      res.status(200).json(recipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  exports.getUserRecipes = async (req, res) => {
    try {
      const userId = req.params.userId; 
    
      // Find the user by userId
      const user = await User.findById(userId).populate('recipes');
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Extract the recipes from the user object
      const recipes = user.recipes;
     
      res.status(200).json(recipes);
    } catch (error) {
      console.error('Error fetching user recipes:', error);
      res.status(500).json({ error: 'Failed to fetch user recipes' });
    }
  };

  exports.likeRecipe = async (req, res) => {
    try {
      const { recipeId } = req.body;
      const { userId } = req.body;
      
      await User.findByIdAndUpdate(userId, { $push: { likedRecipes: recipeId } });
      await Recipe.findByIdAndUpdate(recipeId, { $push: { likedBy: userId } });
  
      res.status(200).json({ message: 'Recipe liked successfully' });
    } catch (error) {
      console.error('Error liking recipe:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  
  exports.dislikeRecipe = async (req, res) => {
    try {
      const { recipeId } = req.body;
      const { userId } = req.body;
    
      await User.findByIdAndUpdate(userId, { $pull: { likedRecipes: recipeId } });
      await Recipe.findByIdAndUpdate(recipeId, { $pull: { likedBy: userId } });
  
      res.status(200).json({ message: 'Recipe disliked successfully' });
    } catch (error) {
      console.error('Error disliking recipe:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  
  exports.deleteRecipe = async (req, res) => {
    console.log('Received Delete')
    try {
        const { recipeId } = req.params;
        const { userId } = req.body;

        // Find the recipe to get the image path
        const recipe = await Recipe.findById(recipeId);
    
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }
    
        // Remove recipe ID from users' likedRecipes array
        await User.updateMany({ likedRecipes: recipeId }, { $pull: { likedRecipes: recipeId } });
    
        // Remove recipe ID from user's recipes array
        await User.findByIdAndUpdate(userId, { $pull: { recipes: recipeId } });
    
        // Remove recipe ID from the category
        await Category.updateMany({ recipes: recipeId }, { $pull: { recipes: recipeId } });
    
        // Delete the recipe image file
        if (recipe.recipeImage) {
            fs.unlinkSync(recipe.recipeImage);
        }
    
        // Delete the recipe document
        await Recipe.findByIdAndDelete(recipeId);
    
        res.status(200).json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getUserPublicRecipes = async (req, res) => {
  try {
    // Find the user by username
    const { username } = req.params;
    console.log('username: ', username);
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find recipes belonging to the user
    const recipes = await Recipe.find({ userId: user._id });
    console.log('recipes: ', recipes);
    res.status(200).json(recipes);
  } catch (error) {
    console.error('Error fetching user recipes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
  
exports.getRecipesByCategory = async (req, res) => {
  try {
    const { categoryName } = req.params;
    console.log('categoryName: ', categoryName);

    // Find recipes by category name
    const recipes = await Recipe.find({ categoryName: categoryName });
    console.log('recipes: ', recipes);

    res.status(200).json(recipes);
  } catch (error) {
    console.error('Error fetching recipes by category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

  