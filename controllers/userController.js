const User = require('../models/user');
const Recipe = require('../models/recipe');
const Category = require('../models/category');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
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
    const { username, email, password, gender, profileImage, memberSince, role, recipes, following, followedBy, likedRecipes,mealId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword, gender, profileImage, memberSince: new Date(req.body.memberSince), role, recipes, following, followedBy, likedRecipes,mealId });
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

       // Update the recipe documents with the new profile picture URL
await Recipe.updateMany(
  { userId: userId }, // Filter criteria: find recipes by userId
  { $set: { useImage: req.file.path } } // Update: set the new profile picture URL
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


    // Retrieve all users from the database
    const users = await User.find({}).select('-password');

    // Check if any users are found
    if (users.length === 0) {

      return res.status(404).json({ message: 'No users found' });
    }

    // Send users array as JSON response
    res.status(200).json(users);
  } catch (error) {

    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUsersByPage = async (req, res) => {
  try {
    // Parse query parameters for pagination
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if not provided

    // Calculate skip value to paginate users
    const skip = (page - 1) * pageSize;

    // Retrieve users from the database with pagination
    const users = await User.find({})
      .select('-password') // Exclude password field
      .skip(skip)
      .limit(pageSize);

    // Check if any users are found
    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    // Send users array as JSON response
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
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

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);


    // 2. Delete the associated profile image (if exists)
    if (user && user.profilePicture) {
      try {
        // Delete the old profile image file
        fs.unlinkSync(user.profilePicture);
      } catch (deleteError) {

        // Handle error deleting old profile image file
      }
    }

    // 3. Delete the user's recipes and associated images
    const recipesToDelete = await Recipe.find({ userId });
    for (const recipe of recipesToDelete) {
      // Delete the recipe image
      if (recipe.recipeImage) {
        try {
          fs.unlinkSync(recipe.recipeImage);
        } catch (deleteError) {

          // Handle error deleting recipe image
        }
      }
    }
    await Recipe.deleteMany({ userId });

    // 4. Clear the recipe IDs from the categories
    await Category.updateMany({}, { $pull: { recipes: { $in: user.recipes } } });

    // 5. Delete the user document
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getFollowingUsers = async (req, res) => {
  try {

    const userId = req.params.userId;

    // Find the user by ID and populate the followedUsers field (assuming it's an array of user IDs)
    const user = await User.findById(userId).populate('following');

    // Extract the followed users from the user object
    const following = user.following;
   
    res.status(200).json(following);
  } catch (error) {
    console.error('Error fetching followed users:', error);
    res.status(500).json({ error: 'Failed to load followed users' });
  }
}

exports.followUser = async (req, res) => {
  try {
    const { userId, userToFollow } = req.body; // Destructure userId and userToFollow

    // Find the user to follow
    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the current user is already following the user
    const isFollowing = user.following.includes(userToFollow);

    if (isFollowing) {
      return res.status(400).json({ error: 'User is already followed' });
    } else {
      // If not following, add to following list
      user.following.push(userToFollow);

      // Update the followed user's followedBy list
      const followedUser = await User.findById(userToFollow);
      followedUser.followedBy.push(userId);

      // Save changes to both users
      await user.save();
      await followedUser.save();

      res.status(200).json({ message: 'User followed successfully' });
    }
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
}

exports.unfollowUser = async (req, res) => {
  try {
    const { userId, userToUnfollow } = req.body;

    // Find the user to unfollow
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the current user is following the user
    const followingIndex = user.following.indexOf(userToUnfollow);
    if (followingIndex === -1) {
      return res.status(400).json({ error: 'User is not followed' });
    } else {
      // If following, remove from following list
      user.following.splice(followingIndex, 1);

      // Update the followed user's followedBy list
      let followedUser = await User.findById(userToUnfollow);
      if (!followedUser) {
        return res.status(404).json({ error: 'Followed user not found' });
      }

      const followedByIndex = followedUser.followedBy.indexOf(userId);
      if (followedByIndex !== -1) {
        followedUser.followedBy.splice(followedByIndex, 1);
      }

      // Save changes to both users
      await user.save();
      await followedUser.save();

      res.status(200).json({ message: 'User unfollowed successfully' });
    }
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
};


exports.changeCredentials = async (req, res) => {
  const userId = req.params.userId;

  const { oldPassword, newUsername, newEmail, newPassword } = req.body;

  try {
    // Fetch the user from the database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Compare the provided old password with the stored hashed password
    if (oldPassword) {
      const passwordMatch = await bcrypt.compare(oldPassword, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ error: 'Incorrect password' });
      }
    }

    // Update user credentials based on provided fields
    if (newUsername) user.username = newUsername;
    if (newEmail) user.email = newEmail;
    if (newPassword) {
      // Hash the new password before storing it
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }

    // Save the updated user
    await user.save();

    res.status(200).json({ message: 'Credentials updated successfully' });
  } catch (error) {
    console.error('Error changing credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getPublicUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
  
    // Find the user by username
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the user profile
   
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
