const User = require('../models/user');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');

// Configure multer to handle file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'profile_pictures');
  },
  filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const userId = req.body.userId; 
      cb(null, `${userId}${ext}`);
  }
});


const upload = multer({ storage: storage });

// Profile picture upload endpoint function
exports.uploadProfilePicture = upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.body.userId;
    console.error('userId:', userId);
    const userProfile = await User.findByIdAndUpdate(userId, { profilePicture: req.file.path }, { new: true });

    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile picture uploaded successfully', profilePicture: req.file.path });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

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


exports.uploadProfilePicture = upload.single('profilePicture'), async (req, res) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // File uploaded successfully, save the file path to the user document
    const userId = req.user._id; // Assuming you have authenticated the user and added user object to the request
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Save the file path to user document
    userProfile.profilePicture = req.file.path;
    await userProfile.save();

    res.status(200).json({ message: 'Profile picture uploaded successfully', profilePicture: req.file.path });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

