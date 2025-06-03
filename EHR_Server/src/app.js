const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const patientRoutes = require('./routes/patientRoutes');
const userRoutes = require('./routes/userRoutes');


dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/patients', patientRoutes);
app.use('/api/users', userRoutes);



const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));