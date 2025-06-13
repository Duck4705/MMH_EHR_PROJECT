const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    ID_BenhNhan: {
        type: String,
        required: true,
        trim: true
    },
    HoTen: {
        type: String,
        required: true,
        trim: true
    },
    NgaySinh: String, // Encrypted
    DiaChi: String, // Encrypted
    ThongTinLienLac: String, // Encrypted
    TienSuBenh: String, // Encrypted
    Tuoi: String, // Encrypted
    CanNang: String, // Encrypted
    ChieuCao: String, // Encrypted
    NhomMau: String, // Encrypted
    DonThuoc: String, // Encrypted
    DiUng: String, // Encrypted
    ChiTietBenh: String, // Encrypted
    GioiTinh: String, // Encrypted
    encrypted_aes_key: {
        type: String,
        required: true
    },
    access_policy: {
        type: String,
        required: true
    },
    created_by: {
        type: String,
        default: 'system'
    },
    department: {
        type: String,
        default: 'GENERAL'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

// Add indexes for better performance
patientSchema.index({ ID_BenhNhan: 1 }, { unique: true });
patientSchema.index({ HoTen: 1 });
patientSchema.index({ created_at: -1 });

module.exports = mongoose.model('Patient', patientSchema);