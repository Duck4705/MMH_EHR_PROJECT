const express = require('express');
const abeController = require('../controllers/abeController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

console.log('🔗 Loading ABE routes...');

// User management
router.post('/register-user', authenticateToken, abeController.registerUser);
router.post('/register-current-user', authenticateToken, abeController.registerCurrentUser);

// AES key encryption/decryption  
router.post('/encrypt-aes-key', authenticateToken, abeController.encryptAESKey);
router.post('/decrypt-aes-key', authenticateToken, abeController.decryptAESKey);

// Policy management
router.post('/register-policy', authenticateToken, abeController.registerPolicy);
router.post('/check-access', authenticateToken, abeController.checkAccess);

// JWT secret management - FIXED: Use authenticateToken instead of authMiddleware
router.get('/get-jwt-secret', authenticateToken, abeController.getJWTSecret);

console.log('✅ ABE routes loaded successfully');
module.exports = router;