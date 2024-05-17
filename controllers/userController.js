const User = require('../models/user');
const Recipe = require('../models/recipe');
const Category = require('../models/category');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const fs = require('fs');

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
      console.log(file);
      const folder = 'profilePictures'; // Specify the folder name here
      const key = `${folder}/${file.originalname}`; // Concatenate folder name with the file name
      cb(null, key); // Use the key for upload
    }
  })
});


exports.registerUser = async (req, res) => {
  try {
    const { username, email, password, gender, profileImage, memberSince, role, recipes, mealId, recommendedRecipes,
      followers, following, followRequestsSent, followRequestsReceived, followRequestsCanceled,commentId, } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username, email, password: hashedPassword, gender, profileImage, memberSince: new Date(req.body.memberSince),
      role, recipes, mealId, recommendedRecipes, followers, following, followRequestsSent, followRequestsReceived, followRequestsCanceled,commentId
    });
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
    if (!userId && userId != null) {
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
    return null;
  }
};


exports.uploadProfilePicture = async (req, res) => {
  try {
    upload.single('profilePicture')(req, res, async (err) => {
      if (err) {
        console.error('Error uploading profile picture:', err);
        return res.status(400).json({ message: 'Error uploading file' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const userId = req.body.userId;
      let user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
     
      if (user.profileImage) {
        console.log('Retrieved user profile picture:', user.profileImage);
        const key = user.profileImage.replace('http://localhost:9000/server/', '');
        const encodedKey = decodeURIComponent(key);
        console.log("Found file with key:", encodedKey);
      
        const deleteParams = {
          Bucket: 'server',
          Key: encodedKey
        };

        console.log("deleteParams:", deleteParams);
      
        s3.deleteObject(deleteParams, function (deleteErr, data) {
          if (deleteErr) {
            console.error('Error deleting old image file:', deleteErr);
          } else {
            console.log('File deleted successfully', data);
          }
        });
      }

      // Update the user document with the new profile picture URL
      await User.updateOne(
        { _id: userId },
        { $set: { profileImage: req.file.location } } // Use the URL provided by MinIO
      );

      // Update the recipe documents with the new profile picture URL
      await Recipe.updateMany(
        { userId: userId },
        { $set: { useImage: req.file.location } } // Use the URL provided by MinIO
      );
      console.log('Profile picture uploaded successfully');  
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

exports.addFridgeItem = async (req, res) => {
  try {

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


