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
    const { username, email, password, gender, profileImage, memberSince, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword, gender, profileImage,memberSince: new Date(req.body.memberSince), role, });
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
  const userId = req.params.userId;

  try {
    // Check if userId is provided
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Retrieve user profile from the database based on user ID
    const userProfile = await User.findById(userId).select('-password');

    // Check if userProfile is found
    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send user profile as JSON response
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

      // Check if file upload was successful
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Extract user ID from request body
      const userId = req.body.userId;

      // Find user by ID
      let user = await User.findById(userId);

      // If user doesn't exist, return error
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user already has a profile picture
      // If yes, delete the old image file
      if (user.profilePicture) {
        // Delete the old image file (if it exists)
        try {
          fs.unlinkSync(user.profilePicture);
        } catch (deleteError) {
          console.error('Error deleting old image file:', deleteError);
          // Handle error deleting old image file
        }
      }

      // Update the user document with the new profile picture URL
      await User.updateOne(
        { _id: userId }, // Filter criteria: find user by ID
        { $set: { profileImage: req.file.path } } // Update: set the new profile picture URL
      );

      res.status(200).json({ message: 'Profile picture uploaded successfully' });
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

//Admin Methods!

exports.getAllUsers = async (req, res) => {
  try {

    console.log('Get All Users in Progress.....:');
    // Retrieve all users from the database
    const users = await User.find({}).select('-password');
    console.log('Users Found: ', users);
    // Check if any users are found
    if (users.length === 0) {
      console.log('No Users Found: ', users.length);
      return res.status(404).json({ message: 'No users found' });
    }

    // Send users array as JSON response
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.updateUserRole = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { role } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.status(200).json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

