const Category = require('../models/category');
const Recipe = require('../models/recipe');
const path = require('path');
const multer = require('multer');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');

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

      const folder = 'categoryPictures'; // Specify the folder name here
      const key = `${folder}/${file.originalname}`; // Concatenate folder name with the file name
      cb(null, key); // Use the key for upload
    }
  })
});

// Method to save category with all fields and upload image (merged)
exports.saveCategory = async (req, res) => {
  try {
    const { name, font, color, categoryImage, recipes, isForDiet, isForVegetarians } = req.body;


    const existingCategory = await Category.findOne({ name });


    if (existingCategory) {

      return res.status(400).json({ message: 'Category already exists' });
    }

    const newCategory = new Category({ name, font, color, categoryImage, recipes, isForDiet, isForVegetarians });


    await newCategory.save();


    res.status(201).json({ message: 'Category saved successfully', categoryId: newCategory._id });
  } catch (error) {
    console.error('Error saving category:', error); // Improved error logging
    res.status(500).json({ message: 'Internal server error' });
  }
};



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

      console.log(`Updating category with new image URL: ${req.file.location}`);
      await Category.updateOne({ _id: categoryId }, { $set: { categoryImage: req.file.location } });

      res.status(200).json({ message: 'Category image uploaded successfully', categoryImage: req.file.location });
    } catch (dbError) {
      console.error('Database error during category image update:', dbError);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
};

async function deleteS3Object(imageUrl) {
  const bucketName = 'server'; // Adjust bucket name as necessary
  const key = imageUrl.replace('http://localhost:9000/server/', '');
  const encodedKey = decodeURIComponent(key);

  const deleteParams = {
    Bucket: bucketName,
    Key: encodedKey
  };

  return new Promise((resolve, reject) => {
    s3.deleteObject(deleteParams, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

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


