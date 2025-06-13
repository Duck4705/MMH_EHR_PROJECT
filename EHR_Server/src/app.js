const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

console.log('=== DEBUGGING ROUTE IMPORTS ===');

// Import routes with error handling
let patientRoutes, userRoutes, abeRoutes;

try {
    patientRoutes = require('./routes/patientRoutes');
    console.log('patientRoutes: loaded successfully');
} catch (error) {
    console.error('Error importing patientRoutes:', error.message);
    process.exit(1);
}

try {
    userRoutes = require('./routes/userRoutes');
    console.log('userRoutes: loaded successfully');
} catch (error) {
    console.error('Error importing userRoutes:', error.message);
    process.exit(1);
}

try {
    abeRoutes = require('./routes/abeRoutes');
    console.log('abeRoutes: loaded successfully');
} catch (error) {
    console.error('Error importing abeRoutes:', error.message);
    process.exit(1);
}

// Register routes
console.log('Registering routes...');
app.use('/api/patients', patientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/abe', abeRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'EHR Server is running', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));