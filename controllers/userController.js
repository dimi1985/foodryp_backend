const User = require('../models/user');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const console = require('console');
const fs = require('fs'); 

// Configure multer to handle file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'profilePictures');
  },
  filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const userId = req.body.userId; 
      cb(null, `${userId}${ext}`);
  }
});


const upload = multer({ storage: storage });

exports.registerUser = async (req, res) => {
  try {
    const { username, email, password, gender } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword, gender });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', userId: newUser._id });
    console.error('Send  registerUser userId:', newUser._id);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.isValidPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({ message: 'Login successful', userId: user._id });
    console.error('Send loginUser  userId:', user._id);
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    // Retrieve user profile from the database based on userId
    const userId = req.params.userId;
    console.error('Send  getUserProfile userId:', userId);
    const userProfile = await User.findById(userId).select('-password');
    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.uploadProfilePicture = async (req, res) => {
  try {
    
    // Apply multer middleware for file upload
    await upload.single('profilePicture')(req, res, async (err) => {
      if (err) {
        console.error('Error uploading profile picture:', err);
        return res.status(400).json({ message: 'Error uploading file' });
      }

      // Upload successful, handle the file (but not saving it to DB)
      const userId = req.body.userId;
      console.log('Received userId:', userId);
      console.log('Request Body:', req.body);
      console.log('req.file:', req.file);

      // You can use the `req.file` object here for further processing:
      // - Access file information like filename, size, etc.
      // - Use a stream to process the image data directly.
      // - Save the file to a temporary location if needed (clean up later).

      res.status(200).json({ message: 'Profile picture uploaded successfully' });
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


