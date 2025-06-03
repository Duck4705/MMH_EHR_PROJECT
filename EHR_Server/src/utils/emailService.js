const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Đảm bảo biến môi trường được load
dotenv.config();

// In ra các biến môi trường email để debug
console.log('Thông tin cấu hình email:');
console.log('- GMAIL_USER:', process.env.GMAIL_USER || 'KHÔNG CÓ');
console.log('- GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '[ĐÃ CẤU HÌNH]' : 'KHÔNG CÓ');
console.log('- CLIENT_URL:', process.env.CLIENT_URL || 'KHÔNG CÓ');

// Function để tạo transporter mới mỗi lần gửi email
const createTransporter = () => {
    // Lấy lại thông tin đăng nhập từ biến môi trường
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    
    // Kiểm tra đã có thông tin đăng nhập chưa
    if (!user || !pass) {
        console.error('GMAIL_USER hoặc GMAIL_APP_PASSWORD không được cấu hình!');
        return null;
    }
    
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465, 
        secure: true, // true cho port 465
        auth: {
            user: user,
            pass: pass
        },
        debug: true, // thêm debug mode
        logger: true, // thêm logger
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * Gửi email đổi mật khẩu
 * @param {string} to - Email người nhận
 * @param {string} resetToken - Token dùng để đổi mật khẩu
 * @param {string} userId - ID của người dùng
 * @returns {Promise<boolean>} - Kết quả gửi email
 */
exports.sendPasswordResetEmail = async (to, resetToken, userId) => {
    try {
        // URL để đổi mật khẩu
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5000';
        const resetURL = `${clientUrl}/reset-password.html?token=${resetToken}&id=${userId}`;
        
        console.log(`Đang gửi email đổi mật khẩu đến ${to}`);
        console.log(`Reset URL: ${resetURL}`);

        // Tạo transporter mới cho mỗi lần gửi email
        const transporter = createTransporter();
        if (!transporter) {
            console.error('Không thể tạo transporter email: Thiếu thông tin xác thực');
            return false;
        }

        // Nội dung email
        const mailOptions = {
            from: `"Hệ thống quản lý bệnh nhân" <${process.env.GMAIL_USER}>`,
            to,
            subject: 'Yêu cầu đổi mật khẩu',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0066cc;">Yêu cầu đổi mật khẩu</h2>
                    <p>Chúng tôi nhận được yêu cầu đổi mật khẩu cho tài khoản của bạn.</p>
                    <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
                    <p>Để đặt lại mật khẩu, vui lòng nhấp vào liên kết dưới đây:</p>
                    <p>
                        <a href="${resetURL}" 
                           style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                           Đổi mật khẩu
                        </a>
                    </p>
                    <p>Liên kết này sẽ hết hạn sau 1 giờ.</p>
                    <p>Nếu bạn không thể nhấp vào nút trên, vui lòng sao chép và dán liên kết sau vào trình duyệt:</p>
                    <p>${resetURL}</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">Đây là email tự động, vui lòng không trả lời.</p>
                </div>
            `
        };

        // Gửi email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email đổi mật khẩu đã được gửi đến:', to);
        console.log('Message ID:', info.messageId);
        return true;
    } catch (error) {
        console.error('Lỗi khi gửi email đổi mật khẩu:', error);
        // Thông báo chi tiết hơn về lỗi
        if (error.code === 'EAUTH') {
            console.error(' Lỗi xác thực email: Vui lòng kiểm tra lại thông tin đăng nhập Gmail');
        }
        else if (error.code === 'ESOCKET') {
            console.error('Lỗi kết nối SMTP: Không thể kết nối đến server email');
        }
        console.error('Chi tiết lỗi:', error.message);
        return false;
    }
};