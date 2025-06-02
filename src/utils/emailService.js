const nodemailer = require('nodemailer');

// Tạo transporter để gửi email
const transporter = nodemailer.createTransport({
    host: process.env.GMAIL_HOST,
    port: process.env.GMAIL_PORT,
    secure: process.env.GMAIL_ENCRYPTION === 'SSL', // true for 465, false for other ports
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    },
    tls: {
        // Không xác thực chứng chỉ TLS
        rejectUnauthorized: false
    }
});

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
        const resetURL = `${process.env.CLIENT_URL}/reset-password.html?token=${resetToken}&id=${userId}`;

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
        await transporter.sendMail(mailOptions);
        console.log('Email đổi mật khẩu đã được gửi đến:', to);
        return true;
    } catch (error) {
        console.error('Lỗi khi gửi email đổi mật khẩu:', error);
        return false;
    }
};