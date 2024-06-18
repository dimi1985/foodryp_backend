const User = require('../models/user');
const Recipe = require('../models/recipe');
const Category = require('../models/category');
const path = require('path');
const multer = require('multer');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const s3 = require('./utils/s3Config');
let userName = '';

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'foodryp',
    acl: 'public-read',
    key: function (request, file, cb) {
      const filename = `user_${userName}.jpg`;
      const folder = 'profilePictures'; // Specify the folder name here
      const key = `${folder}/${filename}`; // Full path with filename
      cb(null, key); // Use the key for upload
    }
  })
});


exports.registerUser = async (req, res) => {
  try {
    const { 
      username, email, password, gender, profileImage, memberSince, role, recipes, mealId, recommendedRecipes,
      followers, following, followRequestsSent, followRequestsReceived, followRequestsCanceled, commentId, savedRecipes 
    } = req.body;
    userName =username;
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username, email, password: hashedPassword, gender, profileImage, memberSince: new Date(memberSince),
      role, recipes, mealId, recommendedRecipes, followers, following, followRequestsSent, followRequestsReceived, followRequestsCanceled, commentId, savedRecipes,
      tokens: []
    });

    // Generate token
    const token = jwt.sign({ userId: newUser._id }, 'THCR93e9pAQd', { expiresIn: '24h' });

    // Append token to user's tokens array
    newUser.tokens.push({ token });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', userId: newUser._id, token });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, 'THCR93e9pAQd', { expiresIn: '24h' });

    // Clean up expired tokens
    user.tokens = user.tokens.filter(t => {
      try {
        jwt.verify(t.token, 'THCR93e9pAQd');
        return true;
      } catch (e) {
        return false;
      }
    });

    // Limit the number of tokens
    if (user.tokens.length >= 5) {
      user.tokens.shift(); // Remove the oldest token
    }

    // Append the new token
    user.tokens.push({ token });
    await user.save();

    res.status(200).json({ message: 'Login successful', userId: user._id, token });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getUserProfile = async (req, res) => {
  try {
    // Check if the authorization header is present
    if (!req.headers.authorization) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Extract the token from the request headers
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1]; // Assuming the token is sent in the format: Bearer <token>
    
    // Log the received token for debugging
    console.log('Received token:', token);

    // Verify the token
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); 
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // Check if userId is provided and is not null or empty
    const userId = req.params.userId;
    if (!userId || userId.trim() === '') {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Retrieve user profile from the database based on user ID
    const userProfile = await User.findById(userId).select('-password');

    // Check if userProfile is found
    if (userProfile) {
      // Send user profile as JSON response
      return res.status(200).json(userProfile);
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    // Handle token verification errors specifically
    if (error.name === 'JsonWebTokenError') {
      console.error('JWT Error:', error.message);
      return res.status(401).json({ message: `Unauthorized: ${error.message}` });
    }

    // Log any other errors
    console.error('Error retrieving user profile:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};



exports.uploadProfilePicture = async (req, res) => {
  try {
    // Check if a valid token is provided in the request headers
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); // Replace 'your_secret_key' with your actual secret key
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    upload.single('profilePicture')(req, res, async (err) => {
      if (err) {
        console.error('Error uploading profile picture:', err);
        return res.status(400).json({ message: 'Error uploading file' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const userId = req.body.userId;

      // Verify that the provided userId matches the userId in the decoded token
      if (userId !== decodedToken.userId) {
        return res.status(403).json({ message: 'Forbidden: User ID does not match token' });
      }

      // Find the user in the database
      let user;
      try {
        user = await User.findById(userId);
      } catch (error) {
        console.error('Error finding user:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Delete the old profile picture from storage if it exists
      if (user.profileImage) {
        await deleteS3Object(user.profileImage);
      }

      // Update the user document with the new profile picture URL
      try {
        await User.updateOne(
          { _id: userId },
          { $set: { profileImage: req.file.location } } // Use the URL provided by MinIO
        );
      } catch (error) {
        console.error('Error updating user profile picture:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Update the recipe documents with the new profile picture URL
      try {
        await Recipe.updateMany(
          { userId: userId },
          { $set: { useImage: req.file.location } } // Use the URL provided by MinIO
        );
      } catch (error) {
        console.error('Error updating user recipes with new profile picture URL:', error);
        // This error is not critical, so we continue the request
      }

      console.log('Profile picture uploaded successfully');
      res.status(200).json({ message: 'Profile picture uploaded successfully' });
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

async function deleteS3Object(imageUrl) {
  const bucketName = 'foodryp'; // Adjust bucket name as necessary
  // Correct the base URL and ensure it exactly matches how the keys are stored/retrieved.
  const baseUrl = 'http://foodryp.com:9010/foodryp/'; // Make sure there's no double slash here
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
    // Check if a valid token is provided in the request headers
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); // Replace 'your_secret_key' with your actual secret key
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // Extract user ID from the decoded token
    const userId = decodedToken.userId;

    // Fetch user details from the database
    const user = await User.findById(userId);

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Delete the associated profile image (if exists)
    if (user.profilePicture) {
      try {
        // Delete the old profile image file
        fs.unlinkSync(user.profilePicture);
      } catch (deleteError) {
        console.error('Error deleting old profile image file:', deleteError);
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
          console.error('Error deleting recipe image:', deleteError);
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


exports.changeCredentials = async (req, res) => {
  try {
    // Check if a valid token is provided in the request headers
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      console.log('Unauthorized: No token provided');
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd');
    if (!decodedToken.userId) {
      console.log('Unauthorized: Invalid token');
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const userId = decodedToken.userId;

    const { oldPassword, newUsername, newEmail, newPassword } = req.body;

    console.log(`Received request to change credentials for userId: ${userId}`);

    // Fetch the user from the database
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User not found for userId: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`Found user: ${user.username}`);

    // Compare the provided old password with the stored hashed password
    if (oldPassword) {
      const passwordMatch = await bcrypt.compare(oldPassword, user.password);
      if (!passwordMatch) {
        console.log('Incorrect password');
        return res.status(400).json({ error: 'Incorrect password' });
      }
      console.log('Old password verified');
    }

    // Update user credentials based on provided fields
    if (newUsername) {
      console.log(`Updating username to: ${newUsername}`);
      user.username = newUsername;
    }
    if (newEmail) {
      console.log(`Updating email to: ${newEmail}`);
      user.email = newEmail;
    }
    if (newPassword) {
      // Hash the new password before storing it
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      console.log('New password hashed and updated');
    }

    // Save the updated user
    await user.save();

    console.log(`Credentials updated successfully for user: ${user.username}`);

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

exports.addFridgeItem = async (req, res) => {
  try {
    // Check if a valid token is provided in the request headers
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); // Replace 'your_secret_key' with your actual secret key
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const { userId, name, category } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const newItem = { name, category };
    user.fridgeItems.push(newItem);
    await user.save();

    res.status(200).json(user.fridgeItems);
  } catch (error) {
    console.error('Error adding fridge item:', error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getFridgeItems = async (req, res) => {
  try {
    // Check if the Authorization header is provided
    if (!req.headers.authorization) {
      return res.status(401).json({ message: 'Unauthorized: No authorization header provided' });
    }

    // Split the Authorization header to get the token
    const tokenParts = req.headers.authorization.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'Unauthorized: Malformed authorization header' });
    }

    const token = tokenParts[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); // Replace 'THCR93e9pAQd' with your actual secret key
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const userId = req.params.userId;

    // Validate userId
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    // Fetch user and populate fridgeItems
    const user = await User.findById(userId).populate('fridgeItems');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Assuming fridge items are stored directly under the user document
    res.status(200).json({
      success: true,
      fridgeItems: user.fridgeItems
    });
  } catch (error) {
    console.error('Error fetching fridge items:', error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.updateFridgeItem = async (req, res) => {
  const { userId, oldItemName, newItem } = req.body;

  try {
    // Check if a valid token is provided in the request headers
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); // Replace 'your_secret_key' with your actual secret key
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const itemIndex = user.fridgeItems.findIndex(item => item.name === oldItemName);
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Update the item
    user.fridgeItems[itemIndex].name = newItem.name;
    user.fridgeItems[itemIndex].category = newItem.category;

    await user.save();
    res.json({ success: true, message: 'Fridge item updated successfully', fridgeItems: user.fridgeItems });
  } catch (error) {
    console.error('Failed to update fridge item:', error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.deleteFridgeItem = async (req, res) => {
  try {
    // Check if a valid token is provided in the request headers
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); // Replace 'your_secret_key' with your actual secret key
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const { userId, itemName } = req.query; // Assuming you are sending userId and itemName as query parameters

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Filter out the item to delete
    const updatedFridgeItems = user.fridgeItems.filter(item => item.name !== itemName);

    // Update the user's fridgeItems
    user.fridgeItems = updatedFridgeItems;
    await user.save();

    res.status(200).json({ message: "Fridge item deleted successfully.", fridgeItems: user.fridgeItems });
  } catch (error) {
    console.error('Error deleting fridge item:', error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};




exports.sendFollowRequest = async (req, res) => {
  try {
    // Check if a valid token is provided in the request headers
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); // Replace 'your_secret_key' with your actual secret key
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const { userId, userToFollowId } = req.body;
    console.log(userId)
    console.log(userToFollowId)
    // Logic to send follow request
    const user = await User.findById(userId);
    const userToFollow = await User.findById(userToFollowId);

    if (!user || !userToFollow) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if the user is already following or has sent a follow request
    if (userToFollow.followers.includes(user._id) || userToFollow.followRequestsSent.includes(user._id)) {
      return res.status(400).json({ success: false, message: "Follow request already sent or user already followed" });
    }

    if (userToFollow.following.includes(user._id) || user.followers.includes(userToFollow._id)) {
      userToFollow.followers.push(user._id);
      user.following.push(userToFollow._id)
      await userToFollow.save();
      await user.save();
    } else {

      // Add userId to userToFollow's followRequestsReceived list
      userToFollow.followRequestsReceived.push(user._id);
      await userToFollow.save();

      // Add userToFollowId to user's followRequestsSent list
      user.followRequestsSent.push(userToFollow._id);
      await user.save();
    }

    res.status(200).json({ success: true, message: "Follow request sent" });
  } catch (error) {
    console.error('Error sending follow request:', error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.rejectFollowRequest = async (req, res) => {
  try {
    // Check if a valid token is provided in the request headers
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); // Replace 'your_secret_key' with your actual secret key
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const { userId, userToRejectId } = req.body;
    console.log(userId, userToRejectId);
    const user = await User.findById(userId);
    const usertoReject = await User.findById(userToRejectId);
    // Remove userToRejectId from user's following array
    await User.findByIdAndUpdate(userId, { $pull: { followRequestsReceived: userToRejectId } });

    // Remove userId from userToReject's list of received follow requests
    await User.findByIdAndUpdate(userToRejectId, { $pull: { followRequestsSent: userId } });

    // Add userToRejectId to user's following list
    usertoReject.following.push(userId);
    usertoReject.followRequestsCanceled.push(userId);

    user.followers.push(userToRejectId)
    await user.save();
    await usertoReject.save();

    res.status(200).json({ success: true, message: "Follow request rejected" });
  } catch (error) {
    console.error('Error rejecting follow request:', error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.followUserBack = async (req, res) => {
  try {
    // Check if a valid token is provided in the request headers
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); // Replace 'your_secret_key' with your actual secret key
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const { userId, userToFollowBackId } = req.body;
    console.log(userId, userToFollowBackId);
    const user = await User.findById(userId);
    const userToFollowBack = await User.findById(userToFollowBackId);


    // Remove userId from userToReject's list of received follow requests
    await User.findByIdAndUpdate(userToFollowBackId, { $pull: { followRequestsCanceled: userId } });

    // Add userToRejectId to user's following list
    userToFollowBack.followers.push(userId);
    user.following.push(userId);
    await user.save();
    await userToFollowBack.save();

    res.status(200).json({ success: true, message: "Follow request rejected" });
  } catch (error) {
    console.error('Error rejecting follow request:', error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    // Check if a valid token is provided in the request headers
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); // Replace 'your_secret_key' with your actual secret key
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const { userId, userToUnfollowId } = req.body;

    // Logic to unfollow user
    // Example:
    const currentUser = await User.findById(userId);
    const userToUnfollow = await User.findById(userToUnfollowId);
    if (!currentUser || !userToUnfollow) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Remove userToUnfollow's ID from currentUser's following array
    await User.findByIdAndUpdate(userToUnfollow, { $pull: { followers: userId } });

    // Remove currentUser's ID from userToUnfollow's followers array
    await User.findByIdAndUpdate(userId, { $pull: { following: userToUnfollowId } });

    res.status(200).json({ success: true, message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.acceptFollowRequest = async (req, res) => {
  try {
    // Check if a valid token is provided in the request headers
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify the token to ensure it's valid
    const decodedToken = jwt.verify(token, 'THCR93e9pAQd'); // Replace 'your_secret_key' with your actual secret key
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const { userId, targetUserId } = req.body;

    // Add targetUserId to user's followers
    await User.findByIdAndUpdate(userId, { $addToSet: { followers: targetUserId } });

    // Add userId to target user's following
    await User.findByIdAndUpdate(targetUserId, { $addToSet: { following: userId } });



    // Add targetUserId to user's followers
    await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: userId } });

    // Add userId to target user's following
    await User.findByIdAndUpdate(userId, { $addToSet: { following: targetUserId } });



    // Remove userId from target user's followRequestsSent
    await User.findByIdAndUpdate(targetUserId, { $pull: { followRequestsSent: userId } });

    // Remove targetUserId from user's followRequestsReceived
    await User.findByIdAndUpdate(userId, { $pull: { followRequestsReceived: targetUserId } });

    res.status(200).json({ message: 'Follow request accepted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting follow request', error });
  }
};

exports.savePin = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const decodedToken = jwt.verify(token, 'THCR93e9pAQd');
    if (!decodedToken.userId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const userId = decodedToken.userId;

    const { pin } = req.body;

    // Hash the PIN before storing it
    const hashedPin = await bcrypt.hash(pin, 10); // Adjust salt rounds as needed

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.pinHash = hashedPin;

    await user.save();

    res.status(200).json({ message: 'PIN saved successfully' });
  } catch (error) {
    console.error('Error saving PIN:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getPin = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      console.error('Unauthorized: No token provided');
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const decodedToken = jwt.verify(token, 'THCR93e9pAQd');
    if (!decodedToken.userId) {
      console.error('Unauthorized: Invalid token');
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const userId = decodedToken.userId;

    // Ensure that the requested userId matches the token's userId for security
    if (userId !== req.params.userId) {
      console.error(`Forbidden: Access to another user's PIN is not allowed. Requested userId: ${req.params.userId}, Token userId: ${userId}`);
      return res.status(403).json({ message: `Forbidden: Access to another user's PIN is not allowed` });
    }

    // Find the user and return the hashed PIN
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found for userId: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ pinHash: user.pinHash });
  } catch (error) {
    console.error('Error fetching PIN:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.validatePIN = async (req, res) => {
  try {
    const { username, pin } = req.body;
    console.log('Received username:', username, 'Received PIN:', pin);

    if (!username || !pin) {
      console.error('Invalid request: username or pin missing');
      return res.status(400).json({ error: 'Invalid request: username or pin missing' });
    }

    console.log(`Looking up user by username: ${username}`);
    const user = await User.findOne({ username }).exec(); // Ensure fresh data
    if (!user) {
      console.error(`User not found for username: ${username}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`User found: ${user.username}, Validating PIN...`);
    const isValid = await user.isValidPIN(pin);

    if (isValid) {
      console.log('PIN validated successfully for user:', username);
      return res.status(200).json({ message: 'PIN validated successfully' });
    } else {
      console.error('Invalid PIN for user:', username);
      return res.status(400).json({ error: 'Invalid PIN' });
    }
  } catch (error) {
    console.error('Error validating PIN:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};




exports.resetPassword = async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    // Basic validation - check if username and newPassword are provided
    if (!username || !newPassword) {
      return res.status(400).json({ message: 'Username and newPassword are required' });
    }

    // Find user by username
    let user = await User.findOne({ username });
    if (!user) {
      console.log(`User not found for username: ${username}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    console.log('New password hashed and updated');

    // Save the updated user with the new password
    user = await user.save();

    console.log(`Password reset successfully for user: ${user.username}`);

    // Respond with success message
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};










