const Meal = require('../models/meal');
const Recipe = require('../models/recipe');
const User = require('../models/user');

// Function to save a new weekly menu
exports.saveWeeklyMenu = async (req, res) => {
    try {
        const { title, dayOfWeek, userId, username, userProfileImage, dateCreated, isForDiet,isMultipleDays } = req.body;

        // Create a new meal object
        const meal = new Meal({
            title,
            userId,
            username,
            userProfileImage,
            dateCreated,
            isForDiet,
            isMultipleDays
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


exports.updateWeeklyMenu = async (req, res) => {
    try {
        const { mealId, title, oldRecipes, newRecipes, userId, username, userProfileImage, dateCreated, isForDiet,isMultipleDays } = req.body;


        // Find the meal by ID
        const meal = await Meal.findById(mealId);

        if (!meal) {
            return res.status(404).json({ message: 'Meal not found' });
        }

        // Update dayOfWeek with newRecipes
        meal.dayOfWeek = newRecipes;

        // Update the meal with the new data
        meal.title = title;
        meal.username = username;
        meal.userProfileImage = userProfileImage;
        meal.dateCreated = dateCreated;
        meal.isForDiet = isForDiet
        meal.isMultipleDays = isMultipleDays

        // Save the updated meal
        const updatedMeal = await meal.save();

        // Iterate over each new recipe ID
        for (const newRecipeId of newRecipes) {
            // Find the recipe for the current new recipe ID
            const recipe = await Recipe.findById(newRecipeId);
            if (!recipe) {
                console.error(`Recipe with ID ${newRecipeId} not found`);
                continue; // Skip to the next iteration if recipe is not found
            }

            // Update the recipe with the meal ID
            if (!recipe.meal.includes(updatedMeal._id)) {
                recipe.meal.push(updatedMeal._id);
            }

            // Save the updated recipe
            await recipe.save();


        }

        // Iterate over each old recipe ID and remove the meal ID from the recipe
        for (const oldRecipeId of oldRecipes) {
            // Find the recipe for the current old recipe ID
            const recipe = await Recipe.findById(oldRecipeId);
            if (!recipe) {
                console.error(`Recipe with ID ${oldRecipeId} not found`);
                continue; // Skip to the next iteration if recipe is not found
            }

            // Remove the meal ID from the recipe
            recipe.meal = recipe.meal.filter(mealId => mealId.toString() !== updatedMeal._id.toString());

            // Save the updated recipe
            await recipe.save();
        }

        // Update the meal ID in the user's mealId field
        await User.findByIdAndUpdate(userId, { mealId: updatedMeal._id });

        // Respond with the updated meal data
        res.status(200).json(updatedMeal);
    } catch (error) {
        console.error('Error updating weekly menu:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};




exports.removeFromWeeklyMenu = async (req, res) => {
    try {
        const { weeklyMenuId } = req.params;
        const { userId, recipeIds } = req.body;

        // Find the meal to ensure it exists
        const weeklyMenu = await Meal.findById(weeklyMenuId);

        if (!weeklyMenu) {
            return res.status(404).json({ message: 'Weekly menu not found' });
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


