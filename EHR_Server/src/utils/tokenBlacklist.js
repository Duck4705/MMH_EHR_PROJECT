/**
 * Module quản lý danh sách token đã bị thu hồi (blacklist)
 * Trong môi trường sản xuất nên sử dụng Redis hoặc DB để lưu thông tin token
 */

// Lưu trữ token đã bị thu hồi và thời gian hết hạn
const tokenBlacklist = new Map();

/**
 * Thêm token vào blacklist
 * @param {string} token - JWT token cần vô hiệu hóa
 * @param {number} expiryTime - Thời gian hết hạn của token tính bằng mili giây
 */
const addToBlacklist = (token, expiryTime = 3 * 60 * 60 * 1000) => { // Mặc định 3 giờ
    tokenBlacklist.set(token, Date.now() + expiryTime);
    
    // Tự động xóa token khỏi blacklist sau khi hết hạn để tránh rò rỉ bộ nhớ
    setTimeout(() => {
        tokenBlacklist.delete(token);
    }, expiryTime);
};

/**
 * Kiểm tra xem token có trong blacklist hay không
 * @param {string} token - JWT token cần kiểm tra
 * @returns {boolean} - true nếu token trong blacklist (đã bị vô hiệu hóa), ngược lại false
 */
const isBlacklisted = (token) => {
    return tokenBlacklist.has(token);
};

/**
 * Xóa các token hết hạn khỏi blacklist
 * Chức năng này có thể được gọi định kỳ để dọn dẹp bộ nhớ
 */
const cleanupBlacklist = () => {
    const now = Date.now();
    for (const [token, expiryTime] of tokenBlacklist.entries()) {
        if (now >= expiryTime) {
            tokenBlacklist.delete(token);
        }
    }
};

module.exports = {
    addToBlacklist,
    isBlacklisted,
    cleanupBlacklist
};
