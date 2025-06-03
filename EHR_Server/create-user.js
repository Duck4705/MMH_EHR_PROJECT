require('dotenv').config();
const mongoose = require('mongoose');
const { sha3_256 } = require('js-sha3');

// Tạo hàm kết nối đến database với cơ chế chờ
const connectWithRetry = async (maxRetries = 5, retryInterval = 5000) => {
    let connected = false;
    let retries = 0;
    
    while (!connected && retries < maxRetries) {
        try {
            console.log(`Đang kết nối tới MongoDB (lần thử ${retries + 1}/${maxRetries})...`);
            await mongoose.connect(process.env.MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useCreateIndex: true,
                useFindAndModify: false,
                writeConcern: {
                    w: 'majority',
                    j: true
                }
            });
            connected = true;
            console.log('Kết nối MongoDB thành công!');
        } catch (error) {
            retries++;
            console.error(`Kết nối thất bại: ${error.message}`);
            if (retries < maxRetries) {
                console.log(`Thử lại sau ${retryInterval/1000} giây...`);
                await new Promise(resolve => setTimeout(resolve, retryInterval));
            }
        }
    }
    
    if (!connected) {
        console.error(`Không thể kết nối đến MongoDB sau ${maxRetries} lần thử. Hãy kiểm tra lại chuỗi kết nối.`);
        process.exit(1);
    }
    
    return connected;
};

// Import User model
const User = require('./src/models/userModel');

// Import readline module
const readline = require('readline');

// Tạo interface cho việc đọc input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Hàm Promise để xử lý input
const promptInput = (question) => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
};

// Tạo tài khoản admin
const createAdmin = async () => {
    const username = await promptInput("Nhập username: ");
    const password = await promptInput("Nhập password: ");
    const fullname = await promptInput("Nhập fullname: ");
    const email = username + "@gmail.com";
    const role = await promptInput("Nhập role: ");
    try {
        // Kiểm tra xem đã có tài khoản admin chưa
        const adminExists = await User.findOne({ username: username });
        
        if (adminExists) {
            console.log('Tài khoản đã tồn tại.');
            return;
        }
        
        // Tạo mật khẩu mặc định và băm
        const defaultPassword = password;
        const hashedPassword = sha3_256(defaultPassword);
        
        // Tạo tài khoản admin
        const admin = new User({
            username: username,
            password: hashedPassword,
            fullName: fullname,
            role: role,
            email: email,
            isActive: true,
            createdBy: 'system'
        });
        
        await admin.save();
        console.log('Đã tạo tài khoản admin thành công!');
        console.log('Tên đăng nhập: ' + username);
        console.log('Mật khẩu: ' + password);
        console.log('Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu!');
        
    } catch (error) {
        console.error('Lỗi khi tạo tài khoản admin:', error);
    } finally {
        // Đóng kết nối
        setTimeout(() => {
            mongoose.connection.close();
            console.log('Kết nối database đã đóng.');
            process.exit(0);
        }, 1000);
    }
};

// Hàm chính để kết nối và tạo admin
const main = async () => {
    try {
        // Chờ kết nối thành công
        await connectWithRetry();
        
        // Sau khi kết nối thành công, chạy hàm tạo admin
        await createAdmin();
    } catch (error) {
        console.error('Lỗi không xác định:', error);
        process.exit(1);
    }
};

// Chạy hàm chính
main();
