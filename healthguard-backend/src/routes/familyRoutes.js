const express = require('express');
const { 
  getAssignedPatient, 
  getPatientMedicalHistory,
  getFamilyMemberProfile,
  updateFamilyMemberProfile,
} = require('../controllers/familyController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Family member views their own profile
router.get('/profile', verifyToken, getFamilyMemberProfile);

// Family member updates their profile
router.put('/profile', verifyToken, updateFamilyMemberProfile);

// Family member views their assigned patient
router.get('/patient', verifyToken, getAssignedPatient);

// Family member views patient's medical history
router.get('/patient/history', verifyToken, getPatientMedicalHistory);

module.exports = router;
