const Patient = require('../models/patientModel');

// Tạo bệnh nhân mới
exports.createPatient = async (req, res) => {
    try {
        console.log('Dữ liệu bệnh nhân mới nhận được:', req.body);
        console.log('Có trường KhoaAES:', req.body.KhoaAES !== undefined);
        
        const newPatient = new Patient(req.body);
        await newPatient.save();
        
        console.log('Bệnh nhân sau khi lưu:', newPatient);
        res.status(201).json(newPatient);
    } catch (error) {
        console.error('Lỗi khi tạo bệnh nhân:', error);
        res.status(400).json({ message: error.message });
    }
};

// Lấy danh sách bệnh nhân
exports.getPatients = async (req, res) => {
    try {
        const patients = await Patient.find();
        res.status(200).json(patients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy thông tin bệnh nhân theo ID
exports.getPatientById = async (req, res) => {
    try {
        let patient;
        
        // Kiểm tra xem id có phải là MongoDB ObjectID hợp lệ không
        if (/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            // Nếu là ObjectID hợp lệ, thử tìm theo _id
            patient = await Patient.findById(req.params.id);
        }
        
        // Nếu không tìm thấy bằng _id hoặc không phải là ObjectID hợp lệ
        if (!patient) {
            // Tìm theo ID_BenhNhan
            patient = await Patient.findOne({ ID_BenhNhan: req.params.id });
        }
        
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        
        console.log('Chi tiết bệnh nhân được tìm thấy:', patient);
        console.log('Bệnh nhân có trường KhoaAES:', patient.KhoaAES !== undefined);
        
        res.status(200).json(patient);
    } catch (error) {
        console.error('Lỗi khi tìm bệnh nhân:', error);
        res.status(500).json({ message: error.message });
    }
};

// Cập nhật thông tin bệnh nhân
exports.updatePatient = async (req, res) => {
    try {
        console.log('Dữ liệu cập nhật bệnh nhân:', req.body);
        console.log('Có trường KhoaAES:', req.body.KhoaAES !== undefined);
        
        let updatedPatient;
        
        // Kiểm tra xem id có phải là MongoDB ObjectID hợp lệ không
        if (/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            // Nếu là ObjectID hợp lệ, cập nhật theo _id
            updatedPatient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
        }
        
        // Nếu không tìm thấy bằng _id hoặc id không phải là ObjectID hợp lệ
        if (!updatedPatient) {
            // Cập nhật theo ID_BenhNhan
            updatedPatient = await Patient.findOneAndUpdate(
                { ID_BenhNhan: req.params.id },
                req.body,
                { new: true }
            );
        }
        
        if (!updatedPatient) return res.status(404).json({ message: 'Patient not found' });
        console.log('Bệnh nhân sau khi cập nhật:', updatedPatient);
        res.status(200).json(updatedPatient);
    } catch (error) {
        console.error('Lỗi khi cập nhật bệnh nhân:', error);
        res.status(400).json({ message: error.message });
    }
};

// Xóa bệnh nhân
exports.deletePatient = async (req, res) => {
    try {
        let deletedPatient;
        
        // Kiểm tra xem id có phải là MongoDB ObjectID hợp lệ không
        if (/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            // Nếu là ObjectID hợp lệ, xóa theo _id
            deletedPatient = await Patient.findByIdAndDelete(req.params.id);
        }
        
        // Nếu không tìm thấy bằng _id hoặc id không phải là ObjectID hợp lệ
        if (!deletedPatient) {
            // Tìm và xóa theo ID_BenhNhan
            deletedPatient = await Patient.findOneAndDelete({ ID_BenhNhan: req.params.id });
        }
        
        if (!deletedPatient) return res.status(404).json({ message: 'Patient not found' });
        res.status(200).json({ message: 'Patient deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};