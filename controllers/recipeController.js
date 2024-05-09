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
      userId, dateCreated, description, recipeImage, instructions,
      categoryId, categoryColor, categoryFont, categoryName, likedBy, meal } = req.body;

    const existingRecipe = await Recipe.findOne({ recipeTitle });
    if (existingRecipe) {

      return res.status(400).json({ message: 'Recipe already exists' });
    }

    const newRecipe = new Recipe({
      recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty,
      username, useImage, userId, dateCreated, description, recipeImage,
      instructions, categoryId, categoryColor, categoryFont, categoryName, likedBy, meal
    });

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
    // Handling file upload
    const fileUpload = upload.single('recipeImage');
    fileUpload(req, res, async (err) => {
      if (err) {
        console.error('Error uploading recipe picture:', err);
        return res.status(400).json({ message: 'Error uploading file' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const recipeId = req.body.recipeId;
      const recipe = await Recipe.findById(recipeId);

      if (!recipe) {

        return res.status(404).json({ message: 'Recipe not found' });
      }

      // Deleting the old image if it exists
      // if (recipe.recipeImage) {
      //   try {
      //     fs.unlinkSync(recipe.recipeImage);
      //   } catch (deleteError) {
      //     console.error('Error deleting old image file:', deleteError);
      //   }
      // }

      // Updating the recipe with the new image
      recipe.recipeImage = req.file.path;
      await recipe.save();

      res.status(200).json({ message: 'Recipe Image uploaded successfully', recipeImage: req.file.path });
    });
  } catch (error) {
    console.error('Error handling the recipe image upload:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateRecipe = async (req, res) => {
  try {
    const recipeId = req.params.recipeId;

    const { recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty, username, useImage,
      userId, dateCreated, description, recipeImage, instructions,
      categoryId, categoryColor, categoryFont, categoryName, likedBy, meal } = req.body;

    // First, find the current recipe to check the existing category ID
    const existingRecipe = await Recipe.findById(recipeId);
    if (!existingRecipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // Update the recipe fields
    const updateFields = {
      recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty, username, useImage,
      userId, dateCreated, description, recipeImage, instructions,
      categoryId, categoryColor, categoryFont, categoryName, likedBy, meal
    };

    // Check if the recipe exists and update it
    const result = await Recipe.updateOne({ _id: recipeId }, { $set: updateFields });

    // Check if the category has changed
    if (existingRecipe.categoryId.toString() !== categoryId) {
      // Remove recipe from the old category
      await Category.findByIdAndUpdate(existingRecipe.categoryId, { $pull: { recipes: recipeId } });

      // Add recipe to the new category
      await Category.findByIdAndUpdate(categoryId, { $push: { recipes: recipeId } });
    } else {
      // If category has not changed, just ensure it's in the category list
      await Category.findByIdAndUpdate(categoryId, { $addToSet: { recipes: recipeId } });
    }

    // Remove recipe ID from the default 'Uncategorized' category, if it has been categorized now
    if (categoryId !== 'Uncategorized') {
      const defaultCategory = await Category.findOne({ name: 'Uncategorized' });
      await Category.updateOne(
        { _id: defaultCategory._id },
        { $pull: { recipes: recipeId } }
      );
    }

    if (result.nModified === 0) {
      return res.status(404).json({ message: 'No changes made to the recipe' });
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

exports.getFixedRecipes = async (req, res) => {
  try {
    const { length } = req.query;
    const recipes = await Recipe.find().limit(parseInt(length, 10));

    if (!recipes.length) {
      return res.status(204).json({ message: 'No recipes found' });
    }

    res.status(200).json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ message: 'Internal server error' });
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


exports.getUserRecipesByPage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, pageSize = 10 } = req.query; // Default page = 1, pageSize = 10


    // Calculate skip count based on pagination parameters
    const skipCount = (page - 1) * pageSize;

    // Fetch user recipes with pagination
    const recipes = await Recipe.find({ userId: userId })
      .skip(skipCount)
      .limit(parseInt(pageSize));

    res.status(200).json(recipes);
  } catch (error) {
    console.error('Error fetching user recipes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



exports.getUserPublicRecipesByPage = async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, pageSize = 10 } = req.query;

    // Calculate skip count based on pagination parameters
    const skipCount = (page - 1) * pageSize;

    // Fetch public user recipes with pagination
    const recipes = await Recipe.find({ username: username })
      .skip(skipCount)
      .limit(parseInt(pageSize));

    res.status(200).json(recipes);
  } catch (error) {
    console.error('Error fetching public user recipes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getRecipesByCategory = async (req, res) => {
  try {


    const { categoryName } = req.params;
    const { page = 1, pageSize = 10 } = req.query; // Default page = 1, pageSize = 10

    // Calculate skip count based on pagination parameters
    const skipCount = (page - 1) * pageSize;

    // Fetch recipes by category name with pagination
    const recipes = await Recipe.find({ categoryName: categoryName })
      .skip(skipCount)
      .limit(parseInt(pageSize));

    

    res.status(200).json(recipes);
  } catch (error) {
    console.error('Error fetching recipes by category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAllRecipesByPage = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;

    // Calculate skip count based on pagination parameters
    const skipCount = (page - 1) * pageSize;

    // Fetch recipes with pagination
    const recipes = await Recipe.find()
      .skip(skipCount)
      .limit(parseInt(pageSize));

    // If there are no recipes, return an empty array instead of throwing an error
    if (recipes.length === 0) {


      return res.status(200).json([]);
    }

    res.status(200).json(recipes);
  } catch (error) {
    console.error('Error fetching recipes by page:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};





exports.searchRecipesByName = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 1) || 1;  // Correct radix to 10
    const pageSize = parseInt(req.query.pageSize, 10) || 10;  // Ensure pageSize is parsed correctly
    const query = req.query.query || '';

    const regex = new RegExp(query, 'i');
    const options = {
      skip: (page - 1) * pageSize,  // Correctly calculate skip
      limit: pageSize  // Ensure limit is set from the query parameters or default
    };

    const recipes = await Recipe.find({ recipeTitle: { $regex: regex } }, null, options);
    const total = await Recipe.countDocuments({ recipeTitle: { $regex: regex } });


    res.json({
      success: true,
      query,
      regex: regex.toString(),
      options,
      recipes,
      total
    });
  } catch (error) {
    console.error('Search recipes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recipes',
      error
    });
  }
};

exports.getTopThreeRecipes = async (req, res) => {
  try {
    // Fetch the top three recipes sorted by 'likes' in descending order
    const recipes = await Recipe.find().sort({likes: -1}).limit(3);

    // Check if any recipes found
    if (!recipes.length) {
      return res.status(204).json({ message: 'No recipes found' }); // No Content
    }

    res.status(200).json(recipes);
  } catch (error) {
    console.error('Error fetching top three recipes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




