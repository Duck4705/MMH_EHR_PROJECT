const Patient = require('../models/patientModel');
const crypto = require('crypto');
const axios = require('axios');

class PatientController {
    
    async createPatient(req, res) {
        try {
            // EMERGENCY DEBUG - Log everything
            console.log('🚨 EMERGENCY DEBUG - Full request body:');
            console.log(JSON.stringify(req.body, null, 2));
            
            console.log('🚨 EMERGENCY DEBUG - Field analysis:');
            console.log('   req.body.encrypted_aes_key:', req.body.encrypted_aes_key);
            console.log('   req.body["encrypted_aes_key"]:', req.body["encrypted_aes_key"]);
            console.log('   Type of encrypted_aes_key:', typeof req.body.encrypted_aes_key);
            console.log('   All keys in req.body:', Object.keys(req.body));
            
            // Check if the field exists with different casing
            const allKeys = Object.keys(req.body);
            const aesKeyFields = allKeys.filter(key => key.toLowerCase().includes('aes') || key.toLowerCase().includes('key'));
            console.log('   AES/Key related fields found:', aesKeyFields);
            
            // Try to find the encrypted_aes_key field with different names
            const possibleKeyFields = [
                'encrypted_aes_key',
                'EncryptedAESKey', 
                'encryptedAESKey',
                'encrypted_key',
                'aes_key'
            ];
            
            let foundKeyField = null;
            let foundKeyValue = null;
            
            for (const fieldName of possibleKeyFields) {
                if (req.body[fieldName]) {
                    foundKeyField = fieldName;
                    foundKeyValue = req.body[fieldName];
                    console.log(`   ✅ Found key field: ${fieldName} = ${foundKeyValue}`);
                    break;
                }
            }
            
            if (!foundKeyField) {
                console.log('   ❌ No encrypted key field found in any expected format');
                return res.status(400).json({
                    message: 'No encrypted AES key field found',
                    received_fields: Object.keys(req.body),
                    expected_fields: possibleKeyFields,
                    debug_body: req.body
                });
            }
            
            // Use the found key field
            const encrypted_aes_key = foundKeyValue;
            
            // Continue with the rest of your existing createPatient logic...
            const {
                ID_BenhNhan,
                HoTen,
                NgaySinh,
                DiaChi,
                ThongTinLienLac,
                TienSuBenh,
                Tuoi,
                CanNang,
                ChieuCao,
                NhomMau,
                DonThuoc,
                DiUng,
                ChiTietBenh,
                GioiTinh,
                access_policy
            } = req.body;

            console.log('🔑 Using encrypted_aes_key:', encrypted_aes_key);
            console.log('📋 Access policy:', access_policy);
            
            // Validate required fields
            if (!ID_BenhNhan || !HoTen) {
                return res.status(400).json({ 
                    message: 'ID bệnh nhân và họ tên là bắt buộc'
                });
            }

            if (!access_policy) {
                return res.status(400).json({ 
                    message: 'Chính sách truy cập là bắt buộc' 
                });
            }

            if (!encrypted_aes_key) {
                return res.status(400).json({ 
                    message: 'Encrypted AES key là bắt buộc',
                    debug_info: {
                        received_fields: Object.keys(req.body),
                        found_key_field: foundKeyField,
                        found_key_value: foundKeyValue,
                        full_body: req.body
                    }
                });
            }

            // Check if patient already exists
            const existingPatient = await Patient.findOne({ ID_BenhNhan });
            if (existingPatient) {
                return res.status(409).json({ 
                    message: `Bệnh nhân với ID ${ID_BenhNhan} đã tồn tại` 
                });
            }

            // Create patient data
            const patientData = {
                ID_BenhNhan,
                HoTen,
                NgaySinh: NgaySinh || '',
                DiaChi: DiaChi || '',
                ThongTinLienLac: ThongTinLienLac || '',
                TienSuBenh: TienSuBenh || '',
                Tuoi: Tuoi || '',
                CanNang: CanNang || '',
                ChieuCao: ChieuCao || '',
                NhomMau: NhomMau || '',
                DonThuoc: DonThuoc || '',
                DiUng: DiUng || '',
                ChiTietBenh: ChiTietBenh || '',
                GioiTinh: GioiTinh || '',
                encrypted_aes_key: encrypted_aes_key, // Use the found value
                access_policy: access_policy,
                created_by: req.user?.id || req.user?.user_id || 'unknown',
                department: req.user?.department || 'GENERAL'
            };
            
            console.log('💾 Creating patient with encrypted_aes_key:', patientData.encrypted_aes_key);
            
            const patient = new Patient(patientData);
            await patient.save();
            
            console.log('✅ Patient created successfully with ID:', patient.ID_BenhNhan);
            
            res.status(201).json({
                message: 'Tạo bệnh nhân thành công',
                ID_BenhNhan: patient.ID_BenhNhan,
                success: true
            });
            
        } catch (error) {
            console.error('❌ Error creating patient:', error);
            console.error('❌ Error stack:', error.stack);
            
            // Enhanced error details
            if (error.name === 'ValidationError') {
                console.error('❌ Validation errors:', error.errors);
                return res.status(400).json({ 
                    message: 'Dữ liệu không hợp lệ',
                    validation_errors: error.errors,
                    missing_fields: Object.keys(error.errors)
                });
            }
            
            res.status(500).json({ 
                message: 'Đã xảy ra lỗi khi tạo bệnh nhân',
                error: error.message,
                error_type: error.name
            });
        }
    }
    
    async getPatients(req, res) {
        try {
            // Return all patients with encrypted data
            // Client will decrypt what they can access
            const patients = await Patient.find({}).sort({ created_at: -1 });
            
            res.json({
                message: 'Lấy danh sách bệnh nhân thành công',
                count: patients.length,
                patients: patients
            });
            
        } catch (error) {
            console.error('Error getting patients:', error);
            res.status(500).json({ 
                message: 'Lỗi khi lấy danh sách bệnh nhân',
                error: 'Failed to retrieve patients' 
            });
        }
    }
    
    async getPatientById(req, res) {
        try {
            const patient_id = req.params.id;
            
            // Return patient with encrypted data
            // Client will decrypt if they have access
            const patient = await Patient.findOne({ ID_BenhNhan: patient_id });
            
            if (!patient) {
                return res.status(404).json({ 
                    message: 'Không tìm thấy bệnh nhân với ID này' 
                });
            }
            
            res.json({
                message: 'Lấy thông tin bệnh nhân thành công',
                patient: patient
            });
            
        } catch (error) {
            console.error('Error getting patient:', error);
            res.status(500).json({ 
                message: 'Lỗi khi lấy thông tin bệnh nhân',
                error: 'Failed to retrieve patient' 
            });
        }
    }

    async updatePatient(req, res) {
        try {
            const patient_id = req.params.id;
            const updates = req.body;
            
            // Remove fields that shouldn't be updated directly
            delete updates._id;
            delete updates.created_at;
            delete updates.created_by;
            
            // Add updated timestamp
            updates.updated_at = new Date();
            
            const patient = await Patient.findOneAndUpdate(
                { ID_BenhNhan: patient_id },
                updates,
                { new: true, runValidators: true }
            );
            
            if (!patient) {
                return res.status(404).json({ 
                    message: 'Không tìm thấy bệnh nhân với ID này' 
                });
            }
            
            res.json({
                message: 'Cập nhật thông tin bệnh nhân thành công',
                patient: patient
            });
            
        } catch (error) {
            console.error('Error updating patient:', error);
            res.status(500).json({ 
                message: 'Lỗi khi cập nhật thông tin bệnh nhân',
                error: 'Failed to update patient' 
            });
        }
    }

    async deletePatient(req, res) {
        try {
            const patient_id = req.params.id;
            
            const patient = await Patient.findOneAndDelete({ ID_BenhNhan: patient_id });
            
            if (!patient) {
                return res.status(404).json({ 
                    message: 'Không tìm thấy bệnh nhân với ID này' 
                });
            }
            
            res.json({
                message: 'Xóa bệnh nhân thành công',
                deleted_patient: {
                    ID_BenhNhan: patient.ID_BenhNhan,
                    HoTen: patient.HoTen
                }
            });
            
        } catch (error) {
            console.error('Error deleting patient:', error);
            res.status(500).json({ 
                message: 'Lỗi khi xóa bệnh nhân',
                error: 'Failed to delete patient' 
            });
        }
    }
    
    // Keep your existing helper methods if needed elsewhere
    encryptPatientData(patient_data, aes_key) {
        const sensitive_fields = [
            'NgaySinh', 'DiaChi', 'ThongTinLienLac', 'TienSuBenh',
            'Tuoi', 'CanNang', 'ChieuCao', 'NhomMau', 'DonThuoc',
            'DiUng', 'ChiTietBenh', 'GioiTinh'
        ];
        
        const encrypted_data = { ...patient_data };
        
        sensitive_fields.forEach(field => {
            if (patient_data[field]) {
                encrypted_data[field] = this.aesEncrypt(patient_data[field], aes_key);
            }
        });
        
        return encrypted_data;
    }
    
    aesEncrypt(text, key) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', key);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }
}

// Keep your existing export pattern - it's correct!
module.exports = new PatientController();