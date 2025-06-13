const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        //enum: ['admin', 'doctor', 'nurse', 'user'],
        default: 'user'
    },
    department: {
        type: String,
        //enum: ['CARDIOLOGY', 'NEUROLOGY', 'EMERGENCY', 'GENERAL', null],
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update updatedAt before saving
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for performance - Add unique constraints here instead
userSchema.index({ username: 1 }, { unique: true });  // Make username unique
userSchema.index({ email: 1 }, { unique: true });     // Make email unique
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
