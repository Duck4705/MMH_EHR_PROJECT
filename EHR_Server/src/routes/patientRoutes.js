const express = require('express');
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/authMiddleware'); // Use destructured import

const router = express.Router();

// All patient routes require authentication
router.use(authenticate); // Use authenticate, not authMiddleware

// Patient CRUD operations
router.post('/', patientController.createPatient);        // Create patient with ABE
router.get('/', patientController.getPatients);           // Get all patients (filtered by role)
router.get('/:id', patientController.getPatientById);     // Get specific patient (with ABE decryption)
router.put('/:id', patientController.updatePatient);      // Update patient
router.delete('/:id', patientController.deletePatient);   // Delete patient

module.exports = router;