const Meal = require('../models/meal');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Recipe = require('../models/recipe');
const User = require('../models/user');
const jwt = require('jsonwebtoken');

// Function to save a new weekly menu
exports.saveWeeklyMenu = async (req, res) => {

    try {
        const { title, dayOfWeek, userId, username, userProfileImage, dateCreated, isForDiet, isMultipleDays } = req.body;

       

        // Check if a valid token is provided in the request headers
        const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
     
        if (!token) {
            console.log('Unauthorized: No token provided');
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        // Verify the token to ensure it's valid and matches the requested user's ID
        let decodedToken;
        try {
            decodedToken = jwt.verify(token, 'THCR93e9pAQd');
        } catch (error) {
            console.log('Unauthorized: Invalid token');
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }

        if (!decodedToken.userId || decodedToken.userId !== userId) {
            console.log('Unauthorized: Invalid token');
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }

        // Create a new meal object
        const meal = new Meal({
            title,
            userId,
            username,
            userProfileImage,
            dateCreated,
            isForDiet,
            isMultipleDays,
            dayOfWeek: [] // Initialize dayOfWeek as an empty array
        });


        // Iterate over each dayOfWeek
        for (const dayRecipeId of dayOfWeek) {
            // Find the recipe for the current dayOfWeek
            const recipe = await Recipe.findById(dayRecipeId);
            if (!recipe) {
                console.error(`Recipe with ID ${dayRecipeId} not found`);
                continue; // Skip to the next iteration if recipe is not found
            }

            // Add the recipe ID to the dayOfWeek array of the meal
            meal.dayOfWeek.push(dayRecipeId);

            // Update the recipe with the meal ID
            recipe.meal.push(meal._id);

         

            // Save the updated recipe
            await recipe.save();
        }

      

        // Save the meal to the database
        const savedMeal = await meal.save();
     

        // Save the meal ID to the user's mealId field
        await User.findByIdAndUpdate(userId, { $push: { mealId: savedMeal._id } });
    

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

exports.getWeeklyMenusFixedLength = async (req, res) => {
    try {
        const { length } = req.query;

        // Convert length to an integer
        const desiredLength = parseInt(length);

        // Query for weekly menus with the desired length and populate the dayOfWeek field with recipes
        const weeklyMenus = await Meal.find()
            .limit(desiredLength)
            .populate({
                path: 'dayOfWeek',
                model: 'Recipe'
            })
            .exec();

        // Respond with the list of weekly menus
        res.status(200).json(weeklyMenus);
    } catch (error) {
        console.error('Error fetching fixed-length weekly menus:', error);
        res.status(500).json({ message: 'Internal server error' });
    }

};




exports.getWeeklyMenusByPageAndUser = async (req, res) => {
    try {
        // Token authentication logic
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = jwt.verify(token, 'THCR93e9pAQd');
        const userId = decodedToken.userId;

        const { page, pageSize } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(pageSize);

        // Fetch meals for the user with pagination and populate the dayOfWeek field with recipes
        const meals = await Meal.find({ userId })
            .skip(skip)
            .limit(parseInt(pageSize))
            .populate({
                path: 'dayOfWeek',
                model: 'Recipe'
            })
            .exec();

        res.status(200).json(meals);
    } catch (error) {
        console.error('Error fetching weekly menus:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


exports.updateWeeklyMenu = async (req, res) => {
    try {
        
        // Token authentication logic
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const decodedToken = jwt.verify(token, 'THCR93e9pAQd');
        const userId = new ObjectId(decodedToken.userId);

        // Request body destructuring
        const { mealId, title, oldRecipes, newRecipes, username, userProfileImage, dateCreated, isForDiet, isMultipleDays } = req.body;
       
        
        // Find the meal by ID
        const meal = await Meal.findById(mealId);

        // Ensure the meal exists and belongs to the user
        if (!meal || !meal.userId.equals(userId)) {
         
            return res.status(404).json({ message: 'Meal not found or unauthorized' });
        }

        // Update the meal with new data
        meal.title = title || meal.title;
        meal.oldRecipes = oldRecipes || meal.oldRecipes;
        meal.newRecipes = newRecipes || meal.newRecipes;
        meal.dayOfWeek = newRecipes.map(id => new ObjectId(id)); // Update dayOfWeek with new recipes
        meal.username = username || meal.username;
        meal.userProfileImage = userProfileImage || meal.userProfileImage;
        meal.dateCreated = dateCreated || meal.dateCreated;
        meal.isForDiet = isForDiet !== undefined ? isForDiet : meal.isForDiet;
        meal.isMultipleDays = isMultipleDays !== undefined ? isMultipleDays : meal.isMultipleDays;

        // Save the updated meal
        const updatedMeal = await meal.save();
       

        // Respond with the updated meal data
        res.status(200).json(updatedMeal);
    } catch (error) {
        console.error('Error updating weekly menu:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};





exports.removeFromWeeklyMenu = async (req, res) => {
    try {
        // Token authentication logic
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const decodedToken = jwt.verify(token, 'THCR93e9pAQd');
        const userId = decodedToken.userId;

        // Request parameters and body destructuring
        const { weeklyMenuId } = req.params;
        const { recipeIds } = req.body;

        // Find the meal to ensure it exists
        const weeklyMenu = await Meal.findById(weeklyMenuId);

        if (!weeklyMenu) {
            return res.status(404).json({ message: 'Weekly menu not found' });
        }

        // Check if the user has permission to remove the meal
        if (weeklyMenu.userId !== userId) {
            return res.status(403).json({ message: 'Forbidden: You are not authorized to remove this weekly menu' });
        }

        // Iterate over each recipe ID and remove the meal ID from the recipe
        for (const recipeId of recipeIds) {
            await Recipe.findByIdAndUpdate(recipeId, { $pull: { meal: weeklyMenuId } });
        }

        // Remove meal ID from user's weeklyMenu array
        await User.findByIdAndUpdate(userId, { $pull: { mealId: weeklyMenuId } });

        // Delete the meal document
        await Meal.findByIdAndDelete(weeklyMenuId);

        res.status(200).json({ message: 'Weekly menu removed successfully' });
    } catch (error) {
        console.error('Error removing weekly menu:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

