const Meal = require('../models/meal');

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
            .populate('dayOfWeek')
            .skip((pageNumber - 1) * limit)
            .limit(limit)
            .exec();

        // Respond with the list of meals
        console.log(meals);
        res.status(200).json(meals);
    } catch (error) {
        console.error('Error fetching weekly menus:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

