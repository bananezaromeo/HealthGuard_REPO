const express = require('express');
const { 
  assignDoctor, 
  getAssignedDoctor, 
  getPatientProfile, 
  assignFamilyMember, 
  getAssignedFamilyMembers,
  getUnassignedFamilyMembers,
  getDoctors,
  addFamilyMember,
  updatePassword,
  updateProfile,
  removeDoctor,
  removeFamilyMember
} = require('../controllers/patientController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Patient profile
router.get('/profile/:user_id', verifyToken, getPatientProfile);

// Doctor endpoints
router.get('/doctors', verifyToken, getDoctors);
router.post('/assign-doctor', verifyToken, assignDoctor);
router.delete('/remove-doctor', verifyToken, removeDoctor);
router.get('/:patient_id/doctor', verifyToken, getAssignedDoctor);

// Family member endpoints
router.post('/add-family-member', verifyToken, addFamilyMember);
router.get('/family-members', verifyToken, getAssignedFamilyMembers);
router.get('/unassigned-family-members', verifyToken, getUnassignedFamilyMembers);
router.delete('/family-member/:familyMemberId', verifyToken, removeFamilyMember);
router.patch('/:patient_id/assign-family', verifyToken, assignFamilyMember);

// Account management
router.put('/update-password', verifyToken, updatePassword);
router.put('/update-profile', verifyToken, updateProfile);

module.exports = router;
