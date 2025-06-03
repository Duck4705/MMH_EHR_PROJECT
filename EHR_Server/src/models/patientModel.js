const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    ID_BenhNhan: { type: String, required: true, unique: true },
    HoTen: { type: String },
    GioiTinh: { type: String },
    NgaySinh: { type: String }, // Sửa từ Date thành String để hỗ trợ dữ liệu mã hóa
    DiaChi: { type: String},
    ThongTinLienLac: { type: String},
    TienSuBenh: { type: String },
    Tuoi: { type: String}, // Sửa từ Number thành String để hỗ trợ dữ liệu mã hóa
    CanNang: { type: String }, // Sửa từ Number thành String để hỗ trợ dữ liệu mã hóa
    ChieuCao: { type: String }, // Sửa từ Number thành String để hỗ trợ dữ liệu mã hóa
    NhomMau: { type: String },
    DonThuoc: { type: String },
    DiUng: { type: String },
    ChiTietBenh: { type: String },
    KhoaAES: { type: String }, // Trường mã hóa AES
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);