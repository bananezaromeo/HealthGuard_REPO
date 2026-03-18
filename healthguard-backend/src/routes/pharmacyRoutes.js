const express = require('express');
const {
  getPharmacyProfile,
  getPrescriptions,
  approvePrescription,
  denyPrescription,
  deliverPrescription,
  updatePharmacyProfile,
} = require('../controllers/pharmacyController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Pharmacy profile
router.get('/profile', verifyToken, getPharmacyProfile);
router.put('/profile', verifyToken, updatePharmacyProfile);

// Prescription management
router.get('/prescriptions', verifyToken, getPrescriptions);
router.post('/prescription/:prescriptionId/approve', verifyToken, approvePrescription);
router.post('/prescription/:prescriptionId/deny', verifyToken, denyPrescription);
router.post('/prescription/:prescriptionId/deliver', verifyToken, deliverPrescription);

module.exports = router;
