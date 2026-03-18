const express = require('express');
const {
  getAssignedPatients,
  getPatientDetails,
  getPatientMedicalHistory,
  getDoctorProfile,
  getDoctorAssignedPatients,
  getPatientAlertHistory,
  getDoctorPrescriptions,
  getPatientAlerts,
  updateDoctorProfile,
  sendPrescription,
  searchPharmacy,
} = require('../controllers/doctorController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Old routes (keep for backward compatibility)
router.get('/:doctor_id/patients', getAssignedPatients);
router.get('/:doctor_id/patient/:patient_id', getPatientDetails);
router.get('/:doctor_id/patient/:patient_id/history', getPatientMedicalHistory);

// New doctor profile and prescription routes
router.get('/profile', verifyToken, getDoctorProfile);
router.put('/profile', verifyToken, updateDoctorProfile);

// Get assigned patients for the doctor
router.get('/patients', verifyToken, getDoctorAssignedPatients);

// Get alert history for a specific patient
router.get('/patient/:patientId/alerts', verifyToken, getPatientAlertHistory);

// Prescription management
router.get('/prescriptions', verifyToken, getDoctorPrescriptions);
router.post('/prescription/send', verifyToken, sendPrescription);

// Patient alerts from wearable (placeholder)
router.get('/patient-alerts', verifyToken, getPatientAlerts);

// Pharmacy search
router.get('/pharmacy/search', verifyToken, searchPharmacy);

module.exports = router;