const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Routes công khai - không cần xác thực
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.get('/reset-password/check-token', userController.checkResetToken);
router.post('/reset-password', userController.resetPassword);

// Routes riêng tư - cần xác thực
// Đăng xuất
router.post('/logout', authenticate, userController.logout);
// Lấy thông tin người dùng hiện tại
router.get('/me', authenticate, userController.getCurrentUser);

// Routes chỉ dành cho admin
// Quản lý người dùng - chỉ admin mới có quyền
router.get('/', authenticate, authorize(['admin']), userController.getAllUsers);
router.post('/', authenticate, authorize(['admin']), userController.createUser);
router.get('/:id', authenticate, authorize(['admin']), userController.getUserById);
router.put('/:id', authenticate, authorize(['admin']), userController.updateUser);
router.delete('/:id', authenticate, authorize(['admin']), userController.deleteUser);

module.exports = router;
