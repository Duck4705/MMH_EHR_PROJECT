const mongoose = require('mongoose');
const connectDB = async () => {
    try {
        // Remove deprecated options and only use supported ones
        const options = {
            writeConcern: {
                w: 'majority',
                j: true
            }
        };
        
        await mongoose.connect(process.env.MONGO_URI, options);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;