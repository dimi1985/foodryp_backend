const Meal = require('../models/meal');
const Recipe = require('../models/recipe');
const User = require('../models/user');

// Function to save a new weekly menu
exports.saveWeeklyMenu = async (req, res) => {
    try {
        const { title, dayOfWeek, userId, username, userProfileImage } = req.body;

        // Create a new meal object
        const meal = new Meal({
            title,
            dayOfWeek,
            userId,
            username,
            userProfileImage,
        });

        // Save the meal to the database
        const savedMeal = await meal.save();

        // Iterate over each dayOfWeek
        for (const dayRecipeId of dayOfWeek) {
            // Find the recipe for the current dayOfWeek
            const recipe = await Recipe.findById(dayRecipeId);
            if (!recipe) {
                console.error(`Recipe with ID ${dayRecipeId} not found`);
                continue; // Skip to the next iteration if recipe is not found
            }

            // Update the recipe with the meal ID
            recipe.meal = savedMeal._id;

            // Save the updated recipe
            await recipe.save();
        }

        // Save the meal ID to the user's mealId field
        await User.findByIdAndUpdate(userId, { mealId: savedMeal._id });

        // Respond with the saved meal data
        res.status(201).json(savedMeal);
    } catch (error) {
        console.error('Error saving weekly menu:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



exports.getWeeklyMenusByPage = async (req, res) => {
    try {
        // Extract pagination parameters from query string
        const { page = 1, pageSize = 10 } = req.query;

        // Convert page and pageSize to integers
        const pageNumber = parseInt(page);
        const limit = parseInt(pageSize);

        // Query for meals with pagination and populate the dayOfWeek field with recipes
        const meals = await Meal.find()
            .populate({
                path: 'dayOfWeek',
                model: 'Recipe' // Populate dayOfWeek with Recipe model
            })
            .skip((pageNumber - 1) * limit)
            .limit(limit)
            .exec();

        // Respond with the list of meals
        res.status(200).json(meals);
    } catch (error) {
        console.error('Error fetching weekly menus:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getWeeklyMenusByPageAndUser = async (req, res) => {
    try {
        const { page = 1, pageSize = 10, userId } = req.query;

        // Convert page and pageSize to integers
        const pageNumber = parseInt(page);
        const limit = parseInt(pageSize);

        // Query for meals with pagination based on user ID and populate the 'dayOfWeek' field with recipes
        const meals = await Meal.find({ userId: userId })
            .populate('dayOfWeek') // Populate the 'dayOfWeek' field with recipes
            .skip((pageNumber - 1) * limit)
            .limit(limit)
            .exec();

        // Respond with the list of meals
        res.status(200).json(meals);
    } catch (error) {
        console.error('Error fetching weekly menus:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
