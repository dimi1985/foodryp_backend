const Category = require('../models/category');
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
        const { name, font, color, categoryImage } = req.body;

        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ message: 'Category already exists' });
        }



        const newCategory = new Category({ name, font, color, categoryImage });
        await newCategory.save();
        console.log('Category saved successfully',  newCategory._id);
        res.status(201).json({ message: 'Category saved successfully', categoryId: newCategory._id });

    } catch (error) {

        res.status(500).json({ message: 'Internal server error' });
    }
};


exports.uploadCategoryImage = async (req, res) => {
    try {
      // Apply multer middleware for file upload
      await upload.single('categoryImage')(req, res, async (err) => {
        if (err) {
          console.error('Error uploading category  picture:', err);
          return res.status(400).json({ message: 'Error uploading file' });
        }
  
        // Check if file upload was successful
        if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
        }
  
        // Extract user ID from request body
        const categoryId = req.body.categoryId;
  
        // Find user by ID
        let category = await Category.findById(categoryId);
  
        // If user doesn't exist, return error
        if (!category) {
          return res.status(404).json({ message: 'category not found' });
        }
  
        // Check if user already has a profile picture
        // If yes, delete the old image file
        if (category.categoryImage) {
          // Delete the old image file (if it exists)
          try {
            fs.unlinkSync(category.categoryImage);
          } catch (deleteError) {
            console.error('Error deleting old image file:', deleteError);
            // Handle error deleting old image file
          }
        }
  
        // Update the user document with the new profile picture URL
        await Category.updateOne(
          { _id: categoryId }, // Filter criteria: find user by ID
          { $set: { categoryImage: req.file.path } } // Update: set the new profile picture URL
        );
  
        res.status(200).json({ message: 'Category Image uploaded successfully' });
      });
    } catch (error) {
      console.error('Error uploading category Image:', error);
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
  
      // Return fetched categories
      console.log(categories);
      res.status(200).json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };


  
  