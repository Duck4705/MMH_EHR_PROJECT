const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    password: { 
        type: String, 
        required: true 
    },
    fullName: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        
    },
    isActive: {
        type: Boolean,
        default: true
    },
    resetPasswordToken: {
        type: String,
        required: false
    },
    resetPasswordExpires: {
        type: Date,
        required: false
    },
    createdBy: {
        type: String,
        required: false,
        description: "ID hoặc thông tin của bên thứ 3 tạo tài khoản này"
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('User', userSchema);
