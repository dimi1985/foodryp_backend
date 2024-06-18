const Comment = require('../models/comment');
const User = require('../models/user');
const Recipe = require('../models/recipe');
const jwt = require('jsonwebtoken');



function customProfanityFilter(text) {
    // List of profane words or patterns
    const profanityWords = [
        // English Profanity
        "fuck",
        "shit",
        "asshole",
        "bastard",
        "bitch",
        "bullsh*t",
        "cock",
        "cunt",
        "dick",
        "faggot",
        "motherfucker",
        "nigga",
        "pussy",
        "slut",
        "twat",
        // Greek Profanity
        "γαμώ",
        "μαλάκας",
        "καριόλης",
        "χύσιμο",
        "μαλάκα",
        "γαμιόλης",
        "κωλοτούμπα",
        "μαλάκια",
        "σκατά",
        // Greeklish Profanity (Greek words written with Latin characters)
        "gamo",
        "mlks",
        "m@lAkAs",
        "m@l@k@s",
        "g@mo",
        "g@mw",
        "g@miesai",
        "porni",
        "poutana",
        "pornidio",
        "poridio tou kerata",
        "poytanas gie",
        "pout@nas",
        "poyt@n@s gie",
        "pousti",
        "psti",
        "gmsai",
        "gamiesai",
        "gamw",
        "gamw to spiti sou",
        "karagkiozi",
        "malakas",
        "kariolis",
        "xysimo",
        "malaka",
        "gamiolis",
        "kolotoumpa",
        "malakia",
        "skata",
        // Common Variations and Slang
        "wtf",
        "omg",
        "lmao",
        "lmfao",
        "rofl",
        "stfu",
        "yolo",
        "wtf",
        "nsfw",
    ];
    
    

    // Convert text to lowercase for case-insensitive matching
    const lowercaseText = text.toLowerCase();

    // Check if any profanity words exist in the text
    for (const profanityWord of profanityWords) {
        if (lowercaseText.includes(profanityWord.toLowerCase())) {
            return true; // Profanity detected
        }
    }

    return false; // No profanity detected
}




// Assuming you have a custom profanity filter function called `customProfanityFilter`

exports.createComment = async (req, res) => {
    try {
        // Token authentication
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const decodedToken = jwt.verify(token, 'THCR93e9pAQd');
        const userId = decodedToken.userId;

        // Validate request body
        const { text, recipeId, username, useImage, replies } = req.body;
        if (!text || !recipeId || !username) {
            return res.status(400).json({ message: 'Invalid request: Missing required fields' });
        }

        // Check for profanity using custom profanity filter
        if (customProfanityFilter(text)) {
            return res.status(400).json({ message: 'Comment contains inappropriate language', errorCode: 'PROFANITY_ERROR' });
        }

        // Create a new comment object
        const newComment = new Comment({
            text,
            userId,
            recipeId,
            username,
            useImage,
            replies
        });

        // Save the new comment
        const savedComment = await newComment.save();

        // Update user's commentId array
        await User.findByIdAndUpdate(userId, { $push: { commentId: savedComment._id } });

        // Update recipe's commentId array
        await Recipe.findByIdAndUpdate(recipeId, { $push: { commentId: savedComment._id } });

        res.status(201).json(savedComment);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};







exports.getComments = async (req, res) => {
    const recipeId = req.params.recipeId;
    try {
        const comments = await Comment.find({ recipeId })
            .populate('userId', 'username') // Assuming 'userId' is a reference to User model and 'username' is a field inside User
            .sort('-dateCreated');

        res.status(200).json(comments); // Return the array directly for simplicity
    } catch (error) {
        console.error('Error fetching comments: ', error);
        res.status(500).json({ error: error.message });
    }
};


exports.updateComment = async (req, res) => {
    try {
        // Token authentication logic
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const decodedToken = jwt.verify(token, 'THCR93e9pAQd');
        const userId = decodedToken.userId;

        // Request body destructuring
        const { id } = req.params;

        // Check if comment belongs to the user
        const comment = await Comment.findById(id);
        if (!comment || comment.userId !== userId) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Update the comment
        const updatedComment = await Comment.findByIdAndUpdate(
            id,
            { $set: req.body },
            { new: true }
        );
        res.status(200).json(updatedComment);
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(400).json({ message: 'Error updating comment', error });
    }
};


exports.deleteComment = async (req, res) => {
    try {
        // Extract role and recipeId from request body
        const { role, recipeId } = req.body;

        // Check if role is "admin" or "moderator"
        if (role !== "admin" && role !== "moderator") {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to delete comments' });
        }

        // Extract comment ID from request parameters
        const commentId = req.params.commentId;
        console.log('Comment ID:', commentId);

        // Find the comment in the database
        const comment = await Comment.findById(commentId);
        console.log('Comment:', comment);

        // Check if comment exists
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Find the user who posted the comment
        const user = await User.findById(comment.userId);

        // Remove commentId from the user's commentId array
        user.commentId.pull(commentId);
        await user.save();

        // Initialize variable to store recipe
        let recipe;

        // If recipeId is provided, find recipe by recipeId
        if (recipeId) {
            recipe = await Recipe.findById(recipeId);
        } else {
            // If recipeId is not provided, find recipe using commentId
            recipe = await Recipe.findOne({ commentId: commentId });
        }

        // Check if recipe exists
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        // Remove commentId from the recipe's commentId array
        recipe.commentId.pull(commentId);
        await recipe.save();

        // Delete the comment
        await Comment.findByIdAndDelete(commentId);
        console.log('Comment deleted successfully');

        // Respond with success message
        res.status(204).json({ message: "Comment deleted successfully" });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


exports.getReportedComment = async (req, res) => {
    try {
      const { commentId } = req.params;
      // Query the database to find the reported comment based on its ID
      const reportedComment = await Comment.findById(commentId);
      if (!reportedComment) {
        // If the reported comment is not found, return a 404 status
        return res.status(404).json({ message: 'Reported comment not found' });
      }
      // If the reported comment is found, return it in the response
      console.log(reportedComment);
      res.status(200).json({ reportedComment });
    } catch (error) {
      console.error('Error fetching reported comment:', error);
      // If an error occurs, return a 500 status
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  exports.getAllComments = async (req, res) => {
    try {
      // Query the database to find all comments
      const comments = await Comment.find();
      
      // If there are no comments, return a 404 status
      if (!comments || comments.length === 0) {
        return res.status(404).json({ message: 'No comments found' });
      }
  
      // If comments are found, return them in the response
      res.status(200).json({ comments });
    } catch (error) {
      console.error('Error fetching comments:', error);
      // If an error occurs, return a 500 status
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  exports.getCommentById = async (req, res) => {
    try {
      const { commentId } = req.params;
      // Find the comment in the database based on its ID
      const comment = await Comment.findById(commentId);
      if (!comment) {
        // If comment is not found, return a 404 status
        return res.status(404).json({ message: 'Comment not found' });
      }
      // If comment is found, return it in the response
      console.log(comment);
      res.status(200).json(comment);
    } catch (error) {
      console.error('Error fetching comment:', error);
      // If an error occurs, return a 500 status
      res.status(500).json({ message: 'Internal server error' });
    }
  };




