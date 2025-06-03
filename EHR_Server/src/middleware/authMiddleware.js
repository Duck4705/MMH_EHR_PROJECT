const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { isBlacklisted } = require('../utils/tokenBlacklist');

// Middleware xác thực token
exports.authenticate = async (req, res, next) => {
    try {
        // Kiểm tra header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Không tìm thấy token xác thực' });
        }

        // Lấy token từ header
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Không tìm thấy token xác thực' });
        }

        // Kiểm tra xem token có trong blacklist không
        if (isBlacklisted(token)) {
            return res.status(401).json({ message: 'Token đã bị vô hiệu hóa hoặc đã đăng xuất' });
        }

        // Xác thực token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Kiểm tra nếu người dùng tồn tại
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        // Kiểm tra nếu người dùng đã bị vô hiệu hóa
        if (!user.isActive) {
            return res.status(401).json({ message: 'Tài khoản này đã bị vô hiệu hóa' });
        }

        // Lưu thông tin người dùng vào req để sử dụng trong các middleware và controller kế tiếp
        req.user = {
            id: user._id,
            username: user.username,
            role: user.role
        };
        
        // Lưu token vào req để các controller có thể sử dụng (ví dụ: khi đăng xuất)
        req.token = token;

        next();
    } catch (error) {
        console.error('Lỗi xác thực:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token đã hết hạn' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token không hợp lệ' });
        }
        res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình xác thực' });
    }
};

// Middleware kiểm tra quyền
exports.authorize = (roles = []) => {
    return (req, res, next) => {
        // Chuyển đổi tham số roles thành mảng nếu chỉ là một chuỗi
        if (typeof roles === 'string') {
            roles = [roles];
        }

        // Kiểm tra nếu mảng roles chứa role của người dùng hiện tại
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: 'Bạn không có quyền thực hiện hành động này' 
            });
        }

        // Người dùng có quyền, cho phép tiếp tục
        next();
    };
};
