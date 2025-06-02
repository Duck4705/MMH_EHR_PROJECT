const User = require('../models/userModel');
const { sha3_256 } = require('js-sha3');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/emailService');

// Xác thực người dùng và tạo token
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Kiểm tra nếu username và password được cung cấp
        if (!username || !password) {
            return res.status(400).json({ 
                message: 'Vui lòng cung cấp tên đăng nhập và mật khẩu' 
            });
        }

        // Tìm người dùng theo tên đăng nhập
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
        }

        // Kiểm tra nếu tài khoản bị khóa
        if (!user.isActive) {
            return res.status(401).json({ message: 'Tài khoản này đã bị vô hiệu hóa' });
        }

        // Băm mật khẩu đầu vào và so sánh với mật khẩu đã băm trong DB
        const hashedPassword = sha3_256(password);
        
        if (user.password !== hashedPassword) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
        }

        // Tạo JWT token với thông tin người dùng
        const token = jwt.sign(
            { 
                id: user._id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '3h' }
        );

        res.status(200).json({
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi server', error: error.message });
    }
};


// Yêu cầu đổi mật khẩu (gửi email)
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Kiểm tra xem email có được cung cấp không
        if (!email) {
            return res.status(400).json({ message: 'Vui lòng cung cấp địa chỉ email' });
        }

        // Tìm người dùng theo email
        const user = await User.findOne({ email });
        if (!user) {
            // Không cho biết email không tồn tại vì lý do bảo mật
            return res.status(200).json({ 
                message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đổi mật khẩu' 
            });
        }

        // Tạo token reset mật khẩu ngẫu nhiên
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Thời gian hết hạn: 1 giờ
        const resetExpiration = new Date();
        resetExpiration.setHours(resetExpiration.getHours() + 1);

        // Lưu token và thời gian hết hạn vào database
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetExpiration;
        await user.save();

        // Gửi email với link reset password
        const emailSent = await sendPasswordResetEmail(user.email, resetToken, user._id);

        if (!emailSent) {
            // Nếu không thể gửi email, xóa token và thông báo lỗi
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ message: 'Không thể gửi email đổi mật khẩu' });
        }

        res.status(200).json({ 
            message: 'Email hướng dẫn đổi mật khẩu đã được gửi đến địa chỉ email của bạn' 
        });
    } catch (error) {
        console.error('Lỗi quên mật khẩu:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi xử lý yêu cầu' });
    }
};

// Kiểm tra token reset password có hợp lệ không
exports.checkResetToken = async (req, res) => {
    try {
        const { token, id } = req.query;
        
        // Kiểm tra nếu có cả token và id
        if (!token || !id) {
            return res.status(400).json({ message: 'Token hoặc ID không hợp lệ' });
        }
        
        // Tìm người dùng với token và id này
        const user = await User.findOne({
            _id: id,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() } // Kiểm tra token chưa hết hạn
        });
        
        if (!user) {
            return res.status(400).json({ message: 'Token đổi mật khẩu không hợp lệ hoặc đã hết hạn' });
        }
        
        res.status(200).json({ message: 'Token hợp lệ', valid: true });
    } catch (error) {
        console.error('Lỗi kiểm tra token:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi kiểm tra token' });
    }
};

// Đặt lại mật khẩu với token
exports.resetPassword = async (req, res) => {
    try {
        const { token, id, newPassword } = req.body;
        
        // Kiểm tra dữ liệu đầu vào
        if (!token || !id || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
        }
        
        // Tìm người dùng với token và id này
        const user = await User.findOne({
            _id: id,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() } // Kiểm tra token chưa hết hạn
        });
        
        if (!user) {
            return res.status(400).json({ message: 'Token đổi mật khẩu không hợp lệ hoặc đã hết hạn' });
        }
        
        // Kiểm tra độ dài mật khẩu mới
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }
        
        // Cập nhật mật khẩu mới
        user.password = sha3_256(newPassword);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        
        res.status(200).json({ message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới.' });
    } catch (error) {
        console.error('Lỗi khi đặt lại mật khẩu:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi đặt lại mật khẩu' });
    }
};

// Lấy thông tin người dùng hiện tại
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thông tin người dùng' });
    }
};

// Lấy danh sách tất cả người dùng - chỉ admin
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách người dùng:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy danh sách người dùng' });
    }
};

// Tạo người dùng mới - chỉ admin
exports.createUser = async (req, res) => {
    try {
        const { username, password, fullName, email, role } = req.body;

        // Kiểm tra người dùng đã tồn tại
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
        }

        // Kiểm tra email đã tồn tại
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({ message: 'Email đã tồn tại' });
        }

        // Tạo người dùng mới
        const hashedPassword = sha3_256(password);
        const user = new User({
            username,
            password: hashedPassword,
            fullName,
            email,
            role: role || 'user',
            isActive: true,
            createdBy: req.user.id
        });

        await user.save();
        res.status(201).json({ 
            message: 'Tạo người dùng thành công',
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Lỗi khi tạo người dùng:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo người dùng' });
    }
};

// Lấy thông tin người dùng theo ID - chỉ admin
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thông tin người dùng' });
    }
};

// Cập nhật thông tin người dùng - chỉ admin
exports.updateUser = async (req, res) => {
    try {
        const { fullName, email, role, isActive } = req.body;
        const userId = req.params.id;

        // Kiểm tra người dùng tồn tại
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        // Nếu cập nhật email, kiểm tra email đã tồn tại
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email, _id: { $ne: userId } });
            if (emailExists) {
                return res.status(400).json({ message: 'Email đã được sử dụng bởi người dùng khác' });
            }
        }

        // Cập nhật thông tin
        user.fullName = fullName || user.fullName;
        user.email = email || user.email;
        user.role = role || user.role;
        user.isActive = isActive !== undefined ? isActive : user.isActive;

        await user.save();
        res.status(200).json({ 
            message: 'Cập nhật thông tin người dùng thành công',
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin người dùng:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật thông tin người dùng' });
    }
};

// Xóa người dùng - chỉ admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        await User.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Xóa người dùng thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa người dùng:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa người dùng' });
    }
};
