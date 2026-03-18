const express = require('express');
const {
  getPharmacies,
  sendPrescription,
  getDoctorPrescriptions,
  getPendingPrescriptions,
  getPrescriptionHistory,
  approvePrescription,
  denyPrescription,
  deliverPrescription,
  getPrescriptionStatus,
} = require('../controllers/prescriptionController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Doctor endpoints (requires JWT)
router.get('/pharmacies', verifyToken, getPharmacies);

// Send prescription - support both old and new paths
router.post('/doctor/send', verifyToken, sendPrescription);
router.post('/send', verifyToken, sendPrescription);

// Get doctor prescriptions
router.get('/doctor/prescriptions', verifyToken, getDoctorPrescriptions);
router.get('/my-prescriptions', verifyToken, getDoctorPrescriptions);

// Get single prescription status
router.get('/prescription/:prescription_id/status', verifyToken, getPrescriptionStatus);
router.get('/doctor/:doctor_id/prescription/:prescription_id/status', verifyToken, getPrescriptionStatus);

// Pharmacy endpoints (requires JWT)
router.get('/pending', verifyToken, getPendingPrescriptions);
router.get('/pharmacy/:pharmacy_id/pending', verifyToken, getPendingPrescriptions);

// Get prescription history (approved, rejected, delivered)
router.get('/history', verifyToken, getPrescriptionHistory);
router.get('/pharmacy/:pharmacy_id/history', verifyToken, getPrescriptionHistory);

// Approve, deny, deliver prescriptions
router.patch('/prescription/:prescription_id/approve', verifyToken, approvePrescription);
router.patch('/pharmacy/:pharmacy_id/prescription/:prescription_id/approve', verifyToken, approvePrescription);

router.patch('/prescription/:prescription_id/deny', verifyToken, denyPrescription);
router.patch('/pharmacy/:pharmacy_id/prescription/:prescription_id/deny', verifyToken, denyPrescription);

router.patch('/prescription/:prescription_id/deliver', verifyToken, deliverPrescription);
router.patch('/pharmacy/:pharmacy_id/prescription/:prescription_id/deliver', verifyToken, deliverPrescription);

module.exports = router;
