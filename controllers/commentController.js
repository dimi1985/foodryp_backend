const Comment = require('../models/comment');

exports.createComment = async (req, res) => {

    const { text, userId, recipeId, username, useImage, replies } = req.body;


    try {
        const newComment = new Comment({
            text,
            userId,
            recipeId,
            username,
            useImage,
            replies
        });


        const savedComment = await newComment.save();

        res.status(201).json(savedComment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


exports.getComments = async (req, res) => {
    const recipeId = req.params.recipeId;


    try {
        const comments = await Comment.find({ recipeId })
            .populate('userId', 'username') // Assuming 'userId' is a reference to User model and 'username' is a field inside User
            .populate('replies') // This will populate all fields in the replies if they refer to other comments
            .sort('-dateCreated');

        res.status(200).json(comments); // Return the array directly for simplicity
    } catch (error) {
        console.error('Error fetching comments: ', error);
        res.status(500).json({ error: error.message });
    }
};


exports.updateComment = async (req, res) => {
    const commentId = req.params.id;
    try {
        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
            { $set: req.body },
            { new: true }
        );
        res.status(200).json(updatedComment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        await comment.findByIdAndDelete(comment);
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
