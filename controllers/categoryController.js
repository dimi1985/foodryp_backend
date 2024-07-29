const Category = require('../models/category');
const Recipe = require('../models/recipe');
const path = require('path');
const multer = require('multer');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const s3 = require('./utils/s3Config');
let categoryName = '';



const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'foodryp',
    acl: 'public-read',
    key: function (req, file, cb) {
      const categoryNameWithUnderscores = categoryName.replace(/\s+/g, '_');
      const filename = `category_${categoryNameWithUnderscores}.jpg`;
      const folder = 'categoryPictures'; // Folder to store in S3
      const key = `${folder}/${filename}`; // Full path with filename
      cb(null, key); // Pass the full path with the filename to the callback
    }
  })
});



// Method to save category with all fields and upload image (merged)
exports.saveCategory = async (req, res) => {
  try {
    const { name, font, color, categoryImage, recipes, isForDiet, isForVegetarians, userRole } = req.body;
    categoryName = name;
    
    // Check if the userRole is 'admin'
    if (userRole === 'admin') {
      const existingCategory = await Category.findOne({ name });

      if (existingCategory) {
        return res.status(400).json({ message: 'Category already exists' });
      }

      const newCategory = new Category({ name, font, color, categoryImage, recipes, isForDiet, isForVegetarians });

      await newCategory.save();

      return res.status(201).json({ message: 'Category saved successfully', categoryId: newCategory._id });
    } else {
      return res.status(403).json({ message: 'Forbidden: User is not an admin' });
    }
  } catch (error) {
    console.error('Error saving category:', error); // Improved error logging
    return res.status(500).json({ message: 'Internal server error' });
  }
};




// Method to upload category image
// Method to upload category image
exports.uploadCategoryImage = async (req, res) => {
  const fileUpload = upload.single('categoryImage');

  fileUpload(req, res, async (err) => {
    if (err) {
      console.error('Error during file upload processing:', err);
      return res.status(400).json({ message: 'Error uploading file: ' + err.message });
    }

    if (!req.file) {
      console.warn('Upload attempt without a file');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const categoryId = req.body.categoryId;
    if (!categoryId) {
      console.warn('No categoryId provided');
      return res.status(400).json({ message: 'Category ID must be provided' });
    }

    try {
      const category = await Category.findById(categoryId);
      if (!category) {
        console.warn(`No category found with ID: ${categoryId}`);
        return res.status(404).json({ message: 'Category not found' });
      }

      if (category.categoryImage) {
        const oldImageUrl = category.categoryImage;
        console.log(`Attempting to delete old image at: ${oldImageUrl}`);

        try {
          await deleteS3Object(oldImageUrl);
          console.log(`Successfully deleted old image at: ${oldImageUrl}`);
        } catch (deleteErr) {
          console.error(`Failed to delete old image: ${deleteErr}`);
          // Continue updating the new image even if old image deletion fails
        }
      }

      // Replace the URL to use the proxy URL
      const imageUrl = req.file.location.replace('http://foodryp.com:9010/', 'https://storage.foodryp.com/');

      console.log(`Updating category with new image URL: ${imageUrl}`);
      await Category.updateOne({ _id: categoryId }, { $set: { categoryImage: imageUrl } });

      res.status(200).json({ message: 'Category image uploaded successfully', categoryImage: imageUrl });
    } catch (dbError) {
      console.error('Database error during category image update:', dbError);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
};


exports.updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const { name, font, color } = req.body;
    categoryName = name;
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

    // Delete the associated image from S3 if it exists
    if (category.categoryImage) {
      await deleteS3Object(category.categoryImage);
    }

    // Step 2: Extract the IDs of the recipes associated with the category
    const recipeIds = category.recipes;

    // Step 3: For each recipe ID, find the recipe document and set it to the default category
    for (const recipeId of recipeIds) {
      const recipe = await Recipe.findById(recipeId);
      if (recipe) {
        // Find the default category document
        const defaultCategory = await Category.findOne({ name: 'Uncategorized' });

        if (defaultCategory) {
          // Set the recipe's categoryId to the ID of the default category
          recipe.categoryId = defaultCategory._id;
          recipe.categoryColor = defaultCategory.color; // Correct property assignment
          recipe.categoryFont = defaultCategory.font; // Correct property assignment
          recipe.categoryName = defaultCategory.name; // Correct property assignment

          await recipe.save();
          // Push recipe ID into the default category's recipes array
          defaultCategory.recipes.push(recipe._id);
          await defaultCategory.save();
        }
      }
    }

    // Step 4: Delete the category document
    await Category.findByIdAndDelete(categoryId);

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Internal server service error' });
  }
};


async function deleteS3Object(imageUrl) {
  const bucketName = 'foodryp'; // Adjust bucket name as necessary
  // Correct the base URL and ensure it exactly matches how the keys are stored/retrieved.
  const baseUrl = 'http://foodryp.com:9010/'; // Make sure there's no double slash here
  const key = imageUrl.replace(baseUrl, ''); // Remove the base URL part to get the actual key

  const deleteParams = {
    Bucket: bucketName,
    Key: key // Use the key directly without decoding
  };

  return new Promise((resolve, reject) => {
    s3.deleteObject(deleteParams, (err, data) => {
      if (err) {
        console.error('Failed to delete S3 object:', err);
        reject(err);
        return;
      }
      console.log('Successfully deleted S3 object:', data);
      resolve(data);
    });
  });
}







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


