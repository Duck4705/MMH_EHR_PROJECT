const mongoose = require('mongoose');
const connectDB = async () => {
    try {
        // Cấu hình writeConcern để thay thế w, wtimeout, j, và fsync
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false,
            writeConcern: {
                w: 'majority',
                j: true
            }
        };
        
        // Tắt cảnh báo về ensureIndex bằng cách đặt autoIndex
        mongoose.set('autoIndex', true);
        
        await mongoose.connect(process.env.MONGO_URI, options);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};
module.exports = connectDB;