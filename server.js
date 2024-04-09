// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { registerUser, loginUser, uploadProfilePicture, getUserProfile, getAllUsers, updateUserRole } = require('./controllers/userController'); // Corrected function name

// Create an instance of Express app
const app = express();
const port = 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(cors());




app.use('/profilePictures', express.static('profilePictures'));

// Increase payload size limit (e.g., 50MB)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/foodryp');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.post('/api/register', registerUser);
app.post('/api/login', loginUser);
app.get('/api/userProfile/:userId', getUserProfile);
app.post('/api/uploadProfilePic', uploadProfilePicture); 
app.get('/api/allUsers', getAllUsers); 
app.put('/api/userRole/:userId', updateUserRole);




// Start the server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
