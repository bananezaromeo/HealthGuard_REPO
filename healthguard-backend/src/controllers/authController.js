const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { generateOTP, getOTPExpiration } = require('../utils/otp');
const { sendOTPEmail } = require('../utils/email');

// Register Patient
const registerPatient = async (req, res) => {
  const { email, password, full_name, phone_number, age, medical_condition } = req.body;

  try {
    if (!email || !password || !full_name || !phone_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if email already exists in verified users
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND email_verified = true',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check for active (non-expired) OTP
    const activeOtp = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND is_used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email]
    );
    if (activeOtp.rows.length > 0) {
      return res.status(400).json({ error: 'OTP already sent. Please check your email. Or wait for it to expire to register again.' });
    }

    // Clean up expired OTP records for this email (optional cleanup)
    await pool.query(
      'DELETE FROM otp_codes WHERE email = $1 AND (is_used = true OR expires_at < NOW())',
      [email]
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiration = getOTPExpiration();

    const registrationData = {
      email,
      password_hash: hashedPassword,
      full_name,
      phone_number,
      role: 'patient',
      age: age || null,
      medical_condition: medical_condition || null,
    };

    // Store OTP and registration data
    await pool.query(
      'INSERT INTO otp_codes (email, otp_code, registration_data, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, JSON.stringify(registrationData), otpExpiration]
    );

    // Send OTP email
    const emailSent = await sendOTPEmail(email, full_name, otp);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
    }

    res.status(201).json({
      status: 'success',
      message: 'OTP sent to your email. Please verify to complete registration.',
      email,
      role: 'patient',
      note: 'Check your email and spam folder for the verification code',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Register Doctor
const registerDoctor = async (req, res) => {
  const { email, password, full_name, phone_number, license_number } = req.body;

  try {
    if (!email || !password || !full_name || !license_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if email already exists in verified users
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND email_verified = true',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check for active (non-expired) OTP
    const activeOtp = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND is_used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email]
    );
    if (activeOtp.rows.length > 0) {
      return res.status(400).json({ error: 'OTP already sent. Please check your email. Or wait for it to expire to register again.' });
    }

    // Clean up expired OTP records for this email
    await pool.query(
      'DELETE FROM otp_codes WHERE email = $1 AND (is_used = true OR expires_at < NOW())',
      [email]
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiration = getOTPExpiration();

    const registrationData = {
      email,
      password_hash: hashedPassword,
      full_name,
      phone_number,
      role: 'doctor',
      license_number,
    };

    // Store OTP and registration data
    await pool.query(
      'INSERT INTO otp_codes (email, otp_code, registration_data, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, JSON.stringify(registrationData), otpExpiration]
    );

    // Send OTP email
    const emailSent = await sendOTPEmail(email, full_name, otp);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
    }

    res.status(201).json({
      status: 'success',
      message: 'OTP sent to your email. Please verify to complete registration.',
      email,
      role: 'doctor',
      note: 'Check your email and spam folder for the verification code',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Register Family Member
const registerFamilyMember = async (req, res) => {
  const { email, password, full_name, phone_number } = req.body;

  try {
    if (!email || !password || !full_name || !phone_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if email already exists in verified users
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND email_verified = true',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check for active (non-expired) OTP
    const activeOtp = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND is_used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email]
    );
    if (activeOtp.rows.length > 0) {
      return res.status(400).json({ error: 'OTP already sent. Please check your email. Or wait for it to expire to register again.' });
    }

    // Clean up expired OTP records for this email
    await pool.query(
      'DELETE FROM otp_codes WHERE email = $1 AND (is_used = true OR expires_at < NOW())',
      [email]
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiration = getOTPExpiration();

    const registrationData = {
      email,
      password_hash: hashedPassword,
      full_name,
      phone_number,
      role: 'family_member',
    };

    // Store OTP and registration data
    await pool.query(
      'INSERT INTO otp_codes (email, otp_code, registration_data, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, JSON.stringify(registrationData), otpExpiration]
    );

    // Send OTP email
    const emailSent = await sendOTPEmail(email, full_name, otp);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
    }

    res.status(201).json({
      status: 'success',
      message: 'OTP sent to your email. Please verify to complete registration.',
      email,
      role: 'family_member',
      note: 'Check your email and spam folder for the verification code',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Register Mobile Pharmacy
const registerPharmacy = async (req, res) => {
  const { email, password, pharmacy_name, phone_number, province, district, city_sector } = req.body;

  try {
    if (!email || !password || !pharmacy_name || !province || !district) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if email already exists in verified users
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND email_verified = true',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check for active (non-expired) OTP
    const activeOtp = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND is_used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email]
    );
    if (activeOtp.rows.length > 0) {
      return res.status(400).json({ error: 'OTP already sent. Please check your email. Or wait for it to expire to register again.' });
    }

    // Clean up expired OTP records for this email
    await pool.query(
      'DELETE FROM otp_codes WHERE email = $1 AND (is_used = true OR expires_at < NOW())',
      [email]
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiration = getOTPExpiration();

    const registrationData = {
      email,
      password_hash: hashedPassword,
      full_name: pharmacy_name,
      phone_number,
      role: 'pharmacy',
      pharmacy_name,
      province,
      district,
      city_sector: city_sector || null,
    };

    // Store OTP and registration data
    await pool.query(
      'INSERT INTO otp_codes (email, otp_code, registration_data, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, JSON.stringify(registrationData), otpExpiration]
    );

    // Send OTP email
    const emailSent = await sendOTPEmail(email, pharmacy_name, otp);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
    }

    res.status(201).json({
      status: 'success',
      message: 'OTP sent to your email. Please verify to complete registration.',
      email,
      role: 'pharmacy',
      note: 'Check your email and spam folder for the verification code',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Login (all roles)
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Login attempt with email:', normalizedEmail);

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );

    console.log('Database query returned:', result.rows.length, 'user(s)');

    if (result.rows.length === 0) {
      console.log('User not found with email:', normalizedEmail);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    console.log('Found user:', user.user_id, 'Email verified:', user.email_verified);
    console.log('Password hash from DB:', user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'MISSING');

    // Check if email is verified
    if (!user.email_verified) {
      console.log('User email not verified');
      return res.status(403).json({ error: 'Email not verified. Please check your inbox for OTP.' });
    }

    if (!user.password_hash) {
      console.error('ERROR: password_hash is NULL in database for user:', user.user_id);
      return res.status(500).json({ error: 'User record corrupted - password missing' });
    }

    console.log('Comparing passwords...');
    console.log('Incoming password length:', password.length);
    console.log('Stored hash length:', user.password_hash.length);
    
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    console.log('Password match result:', passwordMatch);

    if (!passwordMatch) {
      console.log('Password mismatch for user:', user.user_id);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Verify OTP and complete registration (or password reset)
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    // Find valid OTP
    const otpResult = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND otp_code = $2 AND is_used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const otpRecord = otpResult.rows[0];
    const purpose = otpRecord.purpose || 'registration'; // Default to registration if purpose not set

    // Handle PASSWORD RESET OTPs
    if (purpose === 'password_reset') {
      // For password reset, just verify the OTP is valid
      // Don't mark as used yet - it will be marked after password is reset
      res.status(200).json({
        status: 'success',
        message: 'OTP verified successfully',
        email: email,
        otp: otp,
        purpose: 'password_reset'
      });
      return;
    }

    // Handle REGISTRATION OTPs (existing logic)
    // Parse registration_data - handle both string and object formats
    let registrationData = otpRecord.registration_data;
    if (typeof registrationData === 'string') {
      registrationData = JSON.parse(registrationData);
    }
    
    console.log('Registration data retrieved:', {
      email: registrationData.email,
      role: registrationData.role,
      password_hash: registrationData.password_hash ? registrationData.password_hash.substring(0, 20) + '...' : 'MISSING'
    });

    // Validate registration data has all required fields
    if (!registrationData.password_hash) {
      console.error('ERROR: password_hash is missing from registration data!');
      return res.status(500).json({ error: 'Registration data corrupted - password missing' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user already exists
      const checkUser = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (checkUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Create user with email_verified = true
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, role, full_name, phone_number, email_verified, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING user_id',
        [
          registrationData.email,
          registrationData.password_hash,
          registrationData.role,
          registrationData.full_name,
          registrationData.phone_number,
          true,
        ]
      );

      const userId = userResult.rows[0].user_id;
      console.log('User created with ID:', userId, 'and password hash stored');

      // Insert role-specific data
      switch (registrationData.role) {
        case 'patient':
          await client.query(
            'INSERT INTO patients (user_id) VALUES ($1)',
            [userId]
          );
          if (registrationData.age || registrationData.medical_condition) {
            await client.query(
              'UPDATE patients SET age = $1, medical_condition = $2 WHERE user_id = $3',
              [registrationData.age, registrationData.medical_condition, userId]
            );
          }
          break;

        case 'doctor':
          await client.query(
            'INSERT INTO doctors (user_id, license_number, verification_status) VALUES ($1, $2, $3)',
            [userId, registrationData.license_number, 'verified']
          );
          console.log('Doctor registered and auto-verified with user_id:', userId);
          break;

        case 'family_member':
          await client.query(
            'INSERT INTO family_members (user_id) VALUES ($1)',
            [userId]
          );
          break;

        case 'pharmacy':
          await client.query(
            'INSERT INTO pharmacies (user_id, pharmacy_name, province, district, city_sector) VALUES ($1, $2, $3, $4, $5)',
            [
              userId,
              registrationData.pharmacy_name,
              registrationData.province,
              registrationData.district,
              registrationData.city_sector,
            ]
          );
          break;
      }

      // Mark OTP as used
      await client.query(
        'UPDATE otp_codes SET is_used = true, verified_at = NOW() WHERE otp_id = $1',
        [otpRecord.otp_id]
      );

      await client.query('COMMIT');

      // Generate JWT token
      const token = jwt.sign(
        { user_id: userId, role: registrationData.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        status: 'success',
        message: 'Email verified successfully. Registration complete!',
        user_id: userId,
        email: registrationData.email,
        role: registrationData.role,
        full_name: registrationData.full_name,
        token,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Find the most recent pending OTP
    const otpResult = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND is_used = false ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'No pending request found for this email' });
    }

    const otpRecord = otpResult.rows[0];
    const purpose = otpRecord.purpose || 'registration';

    // Get full name based on purpose
    let fullName = '';
    
    if (purpose === 'password_reset') {
      // For password reset, get name from users table
      const userResult = await pool.query(
        'SELECT full_name FROM users WHERE email = $1',
        [email]
      );
      if (userResult.rows.length > 0) {
        fullName = userResult.rows[0].full_name;
      }
    } else {
      // For registration, get from registration_data
      const registrationData = otpRecord.registration_data;
      if (typeof registrationData === 'string') {
        fullName = JSON.parse(registrationData).full_name;
      } else if (registrationData) {
        fullName = registrationData.full_name;
      }
    }

    // Check if OTP is still valid (not expired more than 5 minutes ago)
    const timeDiff = new Date() - new Date(otpRecord.expires_at);
    if (timeDiff > 5 * 60 * 1000) {
      return res.status(400).json({ error: 'Session expired. Please try again.' });
    }

    // Generate new OTP
    const newOtp = generateOTP();
    const newExpiration = getOTPExpiration();

    // Update OTP
    await pool.query(
      'UPDATE otp_codes SET otp_code = $1, expires_at = $2 WHERE otp_id = $3',
      [newOtp, newExpiration, otpRecord.otp_id]
    );

    // Send new OTP email
    const emailSent = await sendOTPEmail(email, fullName, newOtp);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
    }

    res.status(200).json({
      status: 'success',
      message: 'OTP resent successfully. Check your email.',
      email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all pharmacies (for doctor selection)
const getPharmacies = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.user_id, p.pharmacy_name, u.phone_number, p.latitude, p.longitude FROM pharmacies p JOIN users u ON p.user_id = u.user_id'
    );

    const pharmacies = result.rows.map(p => ({
      pharmacy_id: p.user_id,
      pharmacy_name: p.pharmacy_name,
      phone_number: p.phone_number,
      location: { latitude: p.latitude, longitude: p.longitude },
    }));

    res.status(200).json({
      status: 'success',
      pharmacies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Forgot Password - Generate OTP and send email
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if email exists in verified users
    const existingUser = await pool.query(
      'SELECT u.full_name FROM users u WHERE u.email = $1 AND u.email_verified = true',
      [email]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found or not verified' });
    }

    const fullName = existingUser.rows[0].full_name;

    // Check for active (non-expired) OTP
    const activeOtp = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND is_used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (activeOtp.rows.length > 0) {
      return res.status(400).json({ error: 'OTP already sent. Please check your email or wait for it to expire.' });
    }

    // Clean up expired OTP records for this email
    await pool.query(
      'DELETE FROM otp_codes WHERE email = $1 AND (is_used = true OR expires_at < NOW())',
      [email]
    );

    // Generate OTP for password reset
    const otp = generateOTP();
    const otpExpiration = getOTPExpiration();

    // Store OTP with purpose = 'password_reset' and NULL registration_data
    await pool.query(
      'INSERT INTO otp_codes (email, otp_code, registration_data, expires_at, purpose) VALUES ($1, $2, $3, $4, $5)',
      [email, otp, null, otpExpiration, 'password_reset']
    );

    // Send OTP email
    const emailSent = await sendOTPEmail(email, fullName, otp);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send password reset email. Please try again.' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Password reset code sent to your email',
      email,
      note: 'Check your email and spam folder for the reset code',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reset Password - Verify OTP and update password
const resetPassword = async (req, res) => {
  const { email, resetCode, newPassword } = req.body;

  try {
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify OTP exists, is valid, and is for password reset
    const otpRecord = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND otp_code = $2 AND is_used = false AND expires_at > NOW() AND (purpose = $3 OR purpose IS NULL)',
      [email, resetCode, 'password_reset']
    );

    if (otpRecord.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired reset code' });
    }

    // Check if email exists in verified users
    const userCheck = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 AND email_verified = true',
      [email]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const userId = userCheck.rows[0].user_id;

    // Update password in database
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2',
      [hashedPassword, userId]
    );

    // Mark OTP as used
    await pool.query(
      'UPDATE otp_codes SET is_used = true WHERE otp_id = $1',
      [otpRecord.rows[0].otp_id]
    );

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. Please login with your new password.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
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
};
