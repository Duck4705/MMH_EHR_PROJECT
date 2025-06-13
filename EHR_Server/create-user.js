require('dotenv').config();
const mongoose = require('mongoose');
const { sha3_256 } = require('js-sha3');
const User = require('./src/models/userModel');
const readline = require('readline');

// MongoDB connection with retry logic
const connectWithRetry = async () => {
    try {
        const options = {
            writeConcern: {
                w: 'majority',
                j: true
            }
        };
        
        await mongoose.connect(process.env.MONGO_URI, options);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

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

// Show role and department options
const showOptions = () => {
    console.log('\n=== TẠO TÀI KHOẢN HỆ THỐNG EHR ===');
    console.log('📋 Các ROLE có sẵn:');
    console.log('   - ADMIN (Quản trị viên - có quyền truy cập tất cả)');
    console.log('   - DOCTOR (Bác sĩ)');
    console.log('   - NURSE (Y tá)');
    console.log('\n🏥 Các DEPARTMENT có sẵn:');
    console.log('   - GENERAL (Khoa tổng hợp)');
    console.log('   - CARDIOLOGY (Khoa tim mạch)');
    console.log('   - EMERGENCY (Khoa cấp cứu)');
    console.log('   - PEDIATRICS (Khoa nhi)');
    console.log('   - SURGERY (Khoa phẫu thuật)');
    console.log('\n💡 Lưu ý: ADMIN có thể thuộc bất kỳ department nào và vẫn có full access\n');
};

// Validate role
const validateRole = (role) => {
    const validRoles = ['ADMIN', 'DOCTOR', 'NURSE'];
    const upperRole = role.toUpperCase();
    if (validRoles.includes(upperRole)) {
        return upperRole;
    }
    return null;
};

// Validate department
const validateDepartment = (department) => {
    const validDepartments = ['GENERAL', 'CARDIOLOGY', 'EMERGENCY', 'PEDIATRICS', 'SURGERY'];
    const upperDept = department.toUpperCase();
    if (validDepartments.includes(upperDept)) {
        return upperDept;
    }
    return null;
};

// Tạo tài khoản user
const createUser = async () => {
    try {
        // Connect to MongoDB first
        await connectWithRetry();
        
        // Show available options
        showOptions();

        const username = await promptInput("👤 Nhập username: ");
        const password = await promptInput("🔐 Nhập password: ");
        const fullname = await promptInput("📝 Nhập fullname: ");
        const email = username + "@gmail.com";
        
        // Get and validate role
        let role;
        while (!role) {
            const roleInput = await promptInput("🎯 Nhập role (ADMIN/DOCTOR/NURSE): ");
            role = validateRole(roleInput);
            if (!role) {
                console.log("❌ Role không hợp lệ! Vui lòng nhập: ADMIN, DOCTOR, hoặc NURSE");
            }
        }
        
        // Get and validate department
        let department;
        while (!department) {
            const deptInput = await promptInput("🏥 Nhập department (GENERAL/CARDIOLOGY/EMERGENCY/PEDIATRICS/SURGERY): ");
            department = validateDepartment(deptInput);
            if (!department) {
                console.log("❌ Department không hợp lệ! Vui lòng nhập một trong các tùy chọn được liệt kê");
            }
        }

        // Check existing user
        const userExists = await User.findOne({ username: username });
        if (userExists) {
            console.log('❌ Tài khoản đã tồn tại.');
            return;
        }

        // Create and save new user
        const newUser = new User({
            username,
            password: sha3_256(password),
            fullName: fullname,
            role,
            department,  // ADDED: Department field
            email,
            isActive: true,
            createdBy: 'system'
        });

        await newUser.save();
        
        console.log('\n✅ Đã tạo tài khoản thành công!');
        console.log('📋 Thông tin tài khoản:');
        console.log(`   👤 Username: ${username}`);
        console.log(`   🔐 Password: ${password}`);
        console.log(`   📝 Full Name: ${fullname}`);
        console.log(`   🎯 Role: ${role}`);
        console.log(`   🏥 Department: ${department}`);
        console.log(`   📧 Email: ${email}`);
        
        // Show ABE attributes that will be assigned
        console.log('\n🔑 ABE Attributes sẽ được gán:');
        console.log(`   - ROLE:${role}`);
        console.log(`   - DEPT:${department}`);
        
        // Show access examples
        console.log('\n💡 Ví dụ về quyền truy cập:');
        if (role === 'ADMIN') {
            console.log('   ✅ Có thể truy cập TẤT CẢ dữ liệu bệnh nhân');
        } else {
            console.log(`   ✅ Có thể truy cập dữ liệu với policy: "ROLE:${role}"`);
            console.log(`   ✅ Có thể truy cập dữ liệu với policy: "ROLE:${role} and DEPT:${department}"`);
            console.log(`   ❌ KHÔNG thể truy cập dữ liệu với policy chỉ dành cho ADMIN`);
        }
        
        console.log('\n⚠️  Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu!');

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        mongoose.connection.close();
        rl.close();
        process.exit(0);
    }
};

// Run the user creation process
createUser();
