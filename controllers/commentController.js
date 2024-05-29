const Comment = require('../models/comment');
const User = require('../models/user');
const Recipe = require('../models/recipe');
const jwt = require('jsonwebtoken');


exports.createComment = async (req, res) => {
    try {
        // Token authentication logic
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const decodedToken = jwt.verify(token, 'THCR93e9pAQd');
        const userId = decodedToken.userId;

        // Request body destructuring
        const { text, recipeId, username, useImage, replies } = req.body;

        // Create a new comment object
        const newComment = new Comment({
            text,
            userId,
            recipeId,
            username,
            useImage,
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
        res.status(400).json({ message: 'Error creating comment', error });
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
        // Token authentication logic
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const decodedToken = jwt.verify(token, 'THCR93e9pAQd');
        const userId = decodedToken.userId;

        const commentId = req.params.id;
        const comment = await Comment.findById(commentId);

        // Check if comment exists and belongs to the user
        if (!comment || comment.userId !== userId) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Delete the comment
        await Comment.findByIdAndDelete(commentId);
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
