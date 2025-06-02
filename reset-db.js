const mongoose = require('mongoose');
require('dotenv').config();

// Kết nối với MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Kết nối MongoDB thành công.');
    
    // Xóa collection Patient nếu có
    try {
      await mongoose.connection.db.collection('patients').drop();
      console.log('Đã xóa collection patients cũ.');
    } catch (error) {
      console.log('Collection patients không tồn tại hoặc đã xảy ra lỗi:', error.message);
    }
    
    console.log('Đã xóa dữ liệu cũ. Bạn có thể khởi động lại ứng dụng để sử dụng schema mới.');
    
    // Đóng kết nối
    mongoose.connection.close();
    console.log('Đã đóng kết nối MongoDB.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  });
