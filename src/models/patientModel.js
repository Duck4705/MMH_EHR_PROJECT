const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    ID_BenhNhan: { type: String, required: true, unique: true },
    HoTen: { type: String },
    GioiTinh: { type: String },
    NgaySinh: { type: Date },
    DiaChi: { type: String},
    ThongTinLienLac: { type: String},
    TienSuBenh: { type: String },
    Tuoi: { type: Number},
    CanNang: { type: Number },
    ChieuCao: { type: Number },
    NhomMau: { type: String },
    DonThuoc: { type: String },
    DiUng: { type: String },
    ChiTietBenh: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);