const Comment = require('../models/comment');
const User = require('../models/user');
const Recipe = require('../models/recipe');
const jwt = require('jsonwebtoken');



function customProfanityFilter(text) {
    // List of profane words or patterns
    const profanityWords = ["fuck",
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
        'fuckeer',
        'fuckeer'
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
            return res.status(400).json({ message: 'Comment contains inappropriate language' });
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

        // Find the recipe associated with the comment
        const recipe = await Recipe.findById(recipeId);

        // Remove commentId from the recipe's commentId array
        recipe.commentId.pull(commentId);
        await recipe.save();

        // Delete the comment
        await Comment.findByIdAndDelete(commentId);
        console.log('Comment deleted successfully');

        // Respond with success message
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};




