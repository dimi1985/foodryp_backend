const Recipe = require('../models/recipe');
const Category = require('../models/category');
const User = require('../models/user');
const multer = require('multer');
const fs = require('path');
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
      console.log('Get saveRecipe in Progress.....:');
      const { recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty, username, useImage, userId, date, description, recipeImage, instructions, categoryId, categoryColor, categoryFont } = req.body;

      const existingRecipe = await Recipe.findOne({ recipeTitle });
      if (existingRecipe) {
          console.log('Recipe already exists');
          return res.status(400).json({ message: 'Recipe already exists' });
      }

      const newRecipe = new Recipe({ recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty, username, useImage, userId, date, description, recipeImage, instructions, categoryId, categoryColor, categoryFont });
      console.log('Recipe got : ', newRecipe);
      await newRecipe.save();
      console.log('Recipe saved successfully', newRecipe._id);
 
      // Update category recipes field
      await Category.findByIdAndUpdate(categoryId, { $push: { recipes: newRecipe._id } });
      console.log('Found categoryId:',categoryId);
      console.log('Saved recipesId:',newRecipe._id);

      // Update user recipes field
      await User.findByIdAndUpdate(userId, { $push: { recipes: newRecipe._id } });
      console.log('Found userId:',userId);
      console.log('Saved recipesId:',newRecipe._id);

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
  
        // If user doesn't exist, return error
        if (!recipe) {
          return res.status(404).json({ message: 'recipe not found' });
        }
  
        // Check recipe picture
        // If yes, delete the old image file
        if (recipe.recipeImage) {
          // Delete the old image file (if it exists)
          try {
            fs.unlinkSync(recipe.categoryImage);
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

  exports.getAllRecipes = async (req, res) => {
    try {
      // Fetch all categories
      const recipes = await Recipe.find();
      console.log('Recipe found in Progress.....:');
      // Check if any categories found
      if (!recipes.length) {
        return res.status(204).json({ message: 'No recipes found' });
      }
  
      // Return fetched categories
      console.log(recipes);
      res.status(200).json(recipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };


  
  