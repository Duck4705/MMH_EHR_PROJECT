const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Tất cả các endpoints liên quan đến bệnh nhân đều yêu cầu xác thực
router.post('/', authenticate, patientController.createPatient);
router.get('/', authenticate, patientController.getPatients);
router.get('/:id', authenticate, patientController.getPatientById);
router.put('/:id', authenticate, patientController.updatePatient);
router.delete('/:id', authenticate, patientController.deletePatient);

module.exports = router;