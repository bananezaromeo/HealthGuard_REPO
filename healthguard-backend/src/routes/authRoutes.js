const express = require('express');
const multer = require('multer');
const {
  registerPatient,
  registerDoctor,
  registerFamilyMember,
  registerPharmacy,
  login,
  verifyOtp,
  resendOtp,
  getPharmacies,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, PNG files allowed'));
    }
  },
});

// Registration endpoints
router.post('/register/patient', registerPatient);
router.post('/register/doctor', upload.single('license_document'), registerDoctor);
router.post('/register/family', registerFamilyMember);
router.post('/register/pharmacy', registerPharmacy);

// OTP verification endpoints
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

// Password reset endpoints
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Login endpoint
router.post('/login', login);

// Pharmacy endpoints
router.get('/pharmacies', getPharmacies);

module.exports = router;
