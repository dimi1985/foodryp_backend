const Category = require('../models/category');
const Recipe = require('../models/recipe');
const multer = require('multer');
const fs = require('path');
const path = require('path');

// Configure multer to handle category image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'categoryPictures'); // Adjust directory path if needed
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const categoryId = req.body.categoryId; // Assuming you have categoryId in the request body
    cb(null, `${categoryId}${ext}`);
  }
});

const upload = multer({ storage: storage });

// Method to save category with all fields and upload image (merged)
exports.saveCategory = async (req, res) => {
  try {
    const { name, font, color, recipes } = req.body;

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const newCategory = new Category({ name, font, color, recipes });

    await newCategory.save();

    res.status(201).json({ message: 'Category saved successfully', categoryId: newCategory._id });

  } catch (error) {
 
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const { name, font, color } = req.body;

    // Update the category fields
    const categoryUpdateResult = await Category.updateOne({ _id: categoryId }, { $set: { name, font, color } });

    if (categoryUpdateResult.nModified === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Update all recipes that are linked to this category
    const recipesUpdateResult = await Recipe.updateMany(
      { categoryId: categoryId },
      {
        $set: {
          categoryName: name,
          categoryFont: font,
          categoryColor: color
        }
      }
    );

    // Check if recipes were updated (optional, could remove if not needed)
    if (recipesUpdateResult.nModified === 0) {
      console.log('No recipes were updated');  // Log for information, may not be an error
    }

    res.status(200).json({ message: 'Category and associated recipes updated successfully' });
  } catch (error) {
    console.error('Error updating Category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    // Step 1: Find the category document by its ID
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Step 2: Extract the IDs of the recipes associated with the category
    const recipeIds = category.recipes;

    // Step 3: For each recipe ID, find the recipe document and set it to the default category
    for (const recipeId of recipeIds) {
      const recipe = await Recipe.findById(recipeId);
      if (recipe) {
        // Find the default category document
        const defaultCategory = await Category.findOne({ name: 'Uncategorized' });

        // Check if the default category exists and has all required fields
        if (defaultCategory && defaultCategory.color && defaultCategory.font && defaultCategory.name) {
          // Set the recipe's categoryId to the ID of the default category
          recipe.categoryId = defaultCategory._id;
          // Set the recipe's categoryColor, categoryFont, and categoryName
          recipe.categoryColor = defaultCategory.color;
          recipe.categoryFont = defaultCategory.font;
          recipe.categoryName = defaultCategory.name;
         
          await recipe.save();
          // Push recipe ID into the default category's recipes array
          defaultCategory.recipes.push(recipe._id);
         
          await defaultCategory.save();
        } else {
  
        }
      }
    }

    // Step 4: Delete the category document
    await Category.findByIdAndDelete(categoryId);

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
 
    res.status(500).json({ message: 'Internal server error' });
  }
};








exports.getAllCategories = async (req, res) => {
  try {
    // Fetch all categories
    const categories = await Category.find();

    // Check if any categories found
    if (!categories.length) {
      return res.status(204).json({ message: 'No categories found' });
    }



    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getFixedCategories = async (req, res) => {
  try {
    // Extract the desired length from the query parameters
    const length = parseInt(req.query.length);

    // Fetch categories with the specified length
    const categories = await Category.find().limit(length);

    // Check if any categories found
    if (!categories.length) {
      return res.status(204).json({ message: 'No categories found' });
    }

    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getCategoriesByPage = async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const pageNumber = parseInt(page) || 1;
    const limit = parseInt(pageSize) || 10;
    const skip = (pageNumber - 1) * limit;

    // Fetch categories with pagination
    const categories = await Category.find().skip(skip).limit(limit);

    if (!categories.length) {
      return res.status(204).json({ message: 'No categories found' });
    }

    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


