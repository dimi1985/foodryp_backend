const Recipe = require('../models/recipe');
const Category = require('../models/category');
const User = require('../models/user');
const multer = require('multer');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const path = require('path');

// Configure multer to handle category image uploads
const s3 = new aws.S3({
  endpoint: 'http://localhost:9000', // Simplified endpoint setting
  accessKeyId: 'qHs9NZ1FbCZQNmfllG8L',
  secretAccessKey: 'coKQudDRlykMqQxIQrTWEC0aQwxOD8dojxZQAYDs',
  s3ForcePathStyle: true, // needed with MinIO
  signatureVersion: 'v4'
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'server',
    acl: 'public-read',
    key: function (request, file, cb) {

      const folder = 'recipePictures'; // Specify the folder name here
      const key = `${folder}/${file.originalname}`; // Concatenate folder name with the file name
      cb(null, key); // Use the key for upload
    }
  })
});

// Method to save category with all fields and upload image (merged)
exports.saveRecipe = async (req, res) => {
  try {

    const { recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty, username, useImage,
      userId, dateCreated, description, recipeImage, instructions,
      categoryId, categoryColor, categoryFont, categoryName, recomendedBy, meal ,commentId, isForDiet, isForVegetarians,rating,ratingCount,} = req.body;

    const existingRecipe = await Recipe.findOne({ recipeTitle });
    if (existingRecipe) {

      return res.status(400).json({ message: 'Recipe already exists' });
    }

    const newRecipe = new Recipe({
      recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty,
      username, useImage, userId, dateCreated, description, recipeImage,
      instructions, categoryId, categoryColor, categoryFont, categoryName, recomendedBy, meal,commentId,isForDiet, isForVegetarians,rating,ratingCount,
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
    // Handling file upload with multer-s3
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

      // Delete the old image if it exists in the bucket
      if (recipe.recipeImage) {

        const key = recipe.recipeImage.replace('http://localhost:9000/server/', '');
        const encodedKey = decodeURIComponent(key);

      
        const deleteParams = {
          Bucket: 'server',
          Key: encodedKey
        };

   
      
        s3.deleteObject(deleteParams, function (deleteErr, data) {
          if (deleteErr) {
            console.error('Error deleting old image file:', deleteErr);
          } else {

          }
        });
      }

      // Update the recipe document with the new image URL
      await Recipe.updateOne(
        { _id: recipeId },
        { $set: { recipeImage: req.file.location } } // Use the URL provided by MinIO
      );

      res.status(200).json({ message: 'Recipe Image uploaded successfully', recipeImage: req.file.location });
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
      categoryId, categoryColor, categoryFont, categoryName, recomendedBy, meal, commentId,isForDiet, isForVegetarians,rating,ratingCount, } = req.body;

    // First, find the current recipe to check the existing category ID
    const existingRecipe = await Recipe.findById(recipeId);
    if (!existingRecipe) {

      return res.status(404).json({ message: 'Recipe not found' });
    }
  

    // Update the recipe fields
    const updateFields = {
      recipeTitle, ingredients, prepDuration, cookDuration, servingNumber, difficulty, username, useImage,
      userId, dateCreated, description, recipeImage, instructions,
      categoryId, categoryColor, categoryFont, categoryName, recomendedBy, meal, commentId,isForDiet, isForVegetarians,rating,ratingCount,
    };

    // Check if the recipe exists and update it
    const result = await Recipe.updateOne({ _id: recipeId }, { $set: updateFields });

    // Check if the category has changed
    if (existingRecipe.categoryId.toString() !== categoryId) {
      // Remove recipe from the old category
      const oldCategory = await Category.findById(existingRecipe.categoryId);
      if (oldCategory) {
        await Category.findByIdAndUpdate(existingRecipe.categoryId, { $pull: { recipes: recipeId } });
      } else {

      }

      // Add recipe to the new category
      const newCategory = await Category.findById(categoryId);
      if (newCategory) {
        await Category.findByIdAndUpdate(categoryId, { $push: { recipes: recipeId } });
      } else {
  
      }
    } else {
      // If category has not changed, just ensure it's in the category list
      const category = await Category.findById(categoryId);
      if (category) {
        await Category.findByIdAndUpdate(categoryId, { $addToSet: { recipes: recipeId } });
      } else {
      
      }
    }

    // Remove recipe ID from the default 'Uncategorized' category, if it has been categorized now
    if (categoryId !== 'Uncategorized') {
      const defaultCategory = await Category.findOne({ name: 'Uncategorized' });
      if (defaultCategory) {
        await Category.updateOne(
          { _id: defaultCategory._id },
          { $pull: { recipes: recipeId } }
        );
      } else {

      }
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
    const recipes = await Recipe.find().sort({ dateCreated: -1 }).limit(parseInt(length, 10));

    if (!recipes.length) {
      return res.status(204).json({ message: 'No recipes found' });
    }

    res.status(200).json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};






exports.recommendRecipe = async (req, res) => {
  try {
    const { recipeId } = req.body;
    const { userId } = req.body;

    await User.findByIdAndUpdate(userId, { $push: { recommendedRecipes: recipeId } });
    await Recipe.findByIdAndUpdate(recipeId, { $push: { recomendedBy: userId } });

    res.status(200).json({ message: 'Recipe recomended successfully' });
  } catch (error) {
    console.error('Error liking recipe:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.unRecommendRecipe = async (req, res) => {
  try {
    const { recipeId } = req.body;
    const { userId } = req.body;

    await User.findByIdAndUpdate(userId, { $pull: { recommendedRecipes: recipeId } });
    await Recipe.findByIdAndUpdate(recipeId, { $pull: { recomendedBy: userId } });

    res.status(200).json({ message: 'Recipe unRecommended successfully' });
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
    await User.updateMany({ recommendedRecipes: recipeId }, { $pull: { recommendedRecipes: recipeId } });

    // Remove recipe ID from user's recipes array
    await User.findByIdAndUpdate(userId, { $pull: { recipes: recipeId } });

    // Remove recipe ID from the category
    await Category.updateMany({ recipes: recipeId }, { $pull: { recipes: recipeId } });

    // Delete the recipe image file from the bucket
    if (recipe.recipeImage) {
      const key = recipe.recipeImage.replace('http://localhost:9000/server/', '');
      const encodedKey = decodeURIComponent(key);
      
      const deleteParams = {
        Bucket: 'server',
        Key: encodedKey
      };

      s3.deleteObject(deleteParams, function (deleteErr, data) {
        if (deleteErr) {
          console.error('Error deleting image file from bucket:', deleteErr);
        } else {
          console.log('Image file deleted successfully from bucket', data);
        }
      });
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
    const skipCount = (page - 1) * parseInt(pageSize, 10);

    // Fetch recipes with pagination and sort by dateCreated in descending order
    const recipes = await Recipe.find()
      .sort({ dateCreated: -1 })
      .skip(skipCount)
      .limit(parseInt(pageSize, 10));

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
    const total = await Recipe.countDocuments({ recipeTitle: { $regex: regex } });
    const options = {
      skip: (page - 1) * pageSize,  // Correctly calculate skip
      limit: total  // Ensure limit is set from the query parameters or default
    };

    const recipes = await Recipe.find({ recipeTitle: { $regex: regex } }, null, options);
  
    res.json({recipes});
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
    // Fetch the top three recipes sorted by 'rating' in descending order
    // and then by 'ratingCount' to favor recipes with more ratings
    const recipes = await Recipe.find().sort({ rating: -1, ratingCount: -1 }).limit(3);

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

// Example function to add or update a user's rating of a recipe
exports.rateRecipe = async (req, res) => {
  const { userId, recipeId, rating } = req.body;
  
  console.log('Received from Flutter:', userId, recipeId, rating);

  try {
    // Check if the user has already rated this recipe
    const user = await User.findOne({ _id: userId });
    const userHasRated = user && user.ratings.some(r => r.recipe.toString() === recipeId.toString());

    console.log('User has rated:', userHasRated);

    if (!userHasRated) {
      // User has not rated, add new rating to the user's document
      await User.findByIdAndUpdate(userId, {
        '$push': { ratings: { recipe: recipeId, rating: rating } }
      });
      console.log('Added new rating to user.');
    } else {
      // User has already rated, update the existing rating
      await User.updateOne({ _id: userId, 'ratings.recipe': recipeId }, {
        '$set': { 'ratings.$.rating': rating }
      });
      console.log('Updated existing user rating.');
    }

    // Retrieve the recipe to update or calculate its rating
    const recipe = await Recipe.findById(recipeId);
    if (recipe) {
      console.log(`Current recipe rating: ${recipe.rating}, count: ${recipe.ratingCount}`);

      // Calculate new average rating
      let newTotal = recipe.rating * recipe.ratingCount + rating;
      let newCount = userHasRated ? recipe.ratingCount : recipe.ratingCount + 1;
      let newRating = newTotal / newCount;

      console.log(`New total: ${newTotal}, new count: ${newCount}, new rating: ${newRating}`);

      // Update the recipe document with new rating and potentially new count
      await Recipe.findByIdAndUpdate(recipeId, {
        $set: { rating: newRating, ratingCount: newCount }
      });

      console.log('Updated recipe rating and count successfully.');
    }

    res.status(200).json({ message: 'Rating updated successfully' });
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};





