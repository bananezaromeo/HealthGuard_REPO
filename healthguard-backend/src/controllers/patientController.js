const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Patient assigns a doctor
const assignDoctor = async (req, res) => {
  const { patient_id, doctor_id } = req.body;
  const userId = req.user.user_id; // From JWT token

  try {
    if (!doctor_id) {
      return res.status(400).json({ error: 'Doctor ID required' });
    }

    console.log('=== assignDoctor START ===');
    console.log('Inputs - patient_id:', patient_id, 'doctor_id:', doctor_id, 'userId:', userId);

    // Get patient_id from user_id if not provided
    let actualPatientId = patient_id;
    if (!actualPatientId) {
      const patientLookup = await pool.query(
        'SELECT patient_id FROM patients WHERE user_id = $1',
        [userId]
      );
      if (patientLookup.rows.length === 0) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      actualPatientId = patientLookup.rows[0].patient_id;
      console.log('Looked up patient_id from user_id:', actualPatientId);
    }

    // Verify doctor exists
    const doctorResult = await pool.query(
      'SELECT doctor_id FROM doctors WHERE user_id = $1',
      [doctor_id]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    console.log('Doctor verified - user_id:', doctor_id);

    // Verify patient exists
    const patientVerify = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1',
      [actualPatientId]
    );

    if (patientVerify.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    console.log('Patient verified - patient_id:', actualPatientId);

    // Ensure assigned_doctor_id column exists
    console.log('Attempting to ensure assigned_doctor_id column exists...');
    try {
      await pool.query(
        `ALTER TABLE patients ADD COLUMN IF NOT EXISTS assigned_doctor_id INT REFERENCES users(user_id);`
      );
      console.log('assigned_doctor_id column ensured');
    } catch (colErr) {
      console.log('Column already exists or other alter error (continuing):', colErr.message);
    }

    // Update patient with assigned doctor
    console.log('About to update - patient_id:', actualPatientId, 'assign doctor_id:', doctor_id);
    const updateResult = await pool.query(
      'UPDATE patients SET assigned_doctor_id = $1 WHERE patient_id = $2 RETURNING patient_id, assigned_doctor_id',
      [doctor_id, actualPatientId]
    );

    console.log('Update result:', updateResult.rows);
    console.log('=== assignDoctor SUCCESS ===');

    res.status(200).json({
      status: 'success',
      message: 'Doctor assigned successfully',
      patient_id: actualPatientId,
      doctor_id: doctor_id,
    });
  } catch (err) {
    console.error('=== assignDoctor ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error detail:', err.detail);
    console.error('Full stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Patient views their assigned doctor
const getAssignedDoctor = async (req, res) => {
  const { patient_id } = req.params;
  const userId = req.user.user_id; // From JWT token

  try {
    // Get patient_id from user_id if needed
    let actualPatientId = patient_id;
    
    if (!patient_id || patient_id === 'undefined') {
      const patientResult = await pool.query(
        'SELECT patient_id FROM patients WHERE user_id = $1',
        [userId]
      );
      
      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      
      actualPatientId = patientResult.rows[0].patient_id;
    }

    const result = await pool.query(
      `SELECT d.doctor_id, u.user_id, u.full_name, u.phone_number, u.email, d.license_number, d.specialization, d.hospital_clinic, d.verification_status
       FROM patients p
       JOIN users u ON p.assigned_doctor_id = u.user_id
       JOIN doctors d ON u.user_id = d.user_id
       WHERE p.patient_id = $1`,
      [actualPatientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No doctor assigned yet' });
    }

    const doctor = result.rows[0];
    res.status(200).json({
      status: 'success',
      doctor: {
        doctor_id: doctor.doctor_id,
        user_id: doctor.user_id,
        full_name: doctor.full_name,
        phone_number: doctor.phone_number,
        email: doctor.email,
        license_number: doctor.license_number,
        specialization: doctor.specialization || 'General Practitioner',
        hospital_clinic: doctor.hospital_clinic || 'N/A',
        verification_status: doctor.verification_status,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Patient views their own profile
const getPatientProfile = async (req, res) => {
  const { user_id } = req.params;

  try {
    console.log('getPatientProfile called for user_id:', user_id);
    
    // Get basic patient info (without assigned_doctor_id initially to avoid column issues)
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.full_name, u.phone_number, p.patient_id, p.age, p.medical_condition
       FROM patients p
       JOIN users u ON p.user_id = u.user_id
       WHERE u.user_id = $1`,
      [user_id]
    );

    console.log('Patient query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = result.rows[0];

    // Try to get assigned doctor separately
    let doctor = null;
    try {
      const assignedDoctorQuery = await pool.query(
        `SELECT assigned_doctor_id FROM patients WHERE patient_id = $1`,
        [patient.patient_id]
      );
      
      if (assignedDoctorQuery.rows.length > 0 && assignedDoctorQuery.rows[0].assigned_doctor_id) {
        const doctorUserId = assignedDoctorQuery.rows[0].assigned_doctor_id;
        console.log('Patient has assigned_doctor_id:', doctorUserId);
        
        const doctorResult = await pool.query(
          `SELECT d.doctor_id, u.user_id, u.full_name, u.phone_number, u.email, d.specialization, d.hospital_clinic
           FROM doctors d
           JOIN users u ON d.user_id = u.user_id
           WHERE u.user_id = $1`,
          [doctorUserId]
        );
        if (doctorResult.rows.length > 0) {
          doctor = doctorResult.rows[0];
        }
      }
    } catch (doctorErr) {
      console.error('Error fetching assigned doctor:', doctorErr.message);
      // Don't fail the request, just return without doctor
    }

    res.status(200).json({
      status: 'success',
      patient: {
        patient_id: patient.patient_id,
        user_id: patient.user_id,
        email: patient.email,
        full_name: patient.full_name,
        phone_number: patient.phone_number,
        age: patient.age,
        medical_condition: patient.medical_condition,
        doctor: doctor,
      },
    });
  } catch (err) {
    console.error('ERROR in getPatientProfile:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Patient assigns a family member
const assignFamilyMember = async (req, res) => {
  const { patient_id } = req.params;
  const { family_member_id } = req.body;

  try {
    if (!family_member_id) {
      return res.status(400).json({ error: 'Family member ID required' });
    }

    // Verify patient exists
    const patientResult = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1',
      [patient_id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Verify family member exists
    const familyResult = await pool.query(
      'SELECT family_id FROM family_members WHERE family_id = $1',
      [family_member_id]
    );

    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    // Update family_member with patient_id
    await pool.query(
      'UPDATE family_members SET patient_id = $1 WHERE family_id = $2',
      [patient_id, family_member_id]
    );

    res.status(200).json({
      status: 'success',
      message: 'Family member assigned successfully',
      patient_id: parseInt(patient_id),
      family_member_id: parseInt(family_member_id),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Patient views their assigned family members
// Get assigned family members for a patient (their existing family members)
const getAssignedFamilyMembers = async (req, res) => {
  const userId = req.user.user_id; // From JWT token

  try {
    // Get patient_id from user_id
    const patientResult = await pool.query(
      'SELECT patient_id FROM patients WHERE user_id = $1',
      [userId]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const actualPatientId = patientResult.rows[0].patient_id;

    // Get ASSIGNED family members (patient_id = current patient)
    const result = await pool.query(
      `SELECT f.family_id, u.user_id, u.email, u.full_name, u.phone_number, f.relationship
       FROM family_members f
       JOIN users u ON f.user_id = u.user_id
       WHERE f.patient_id = $1
       ORDER BY u.full_name ASC`,
      [actualPatientId]
    );

    const familyMembers = result.rows.map(fm => ({
      family_id: fm.family_id,
      user_id: fm.user_id,
      full_name: fm.full_name,
      email: fm.email,
      phone_number: fm.phone_number,
      relationship: fm.relationship,
    }));

    res.status(200).json({
      status: 'success',
      total_family_members: familyMembers.length,
      family_members: familyMembers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get unassigned family members (available to add)
const getUnassignedFamilyMembers = async (req, res) => {
  try {
    // Get UNASSIGNED family members (patient_id IS NULL)
    const result = await pool.query(
      `SELECT f.family_id, u.user_id, u.email, u.full_name, u.phone_number
       FROM family_members f
       JOIN users u ON f.user_id = u.user_id
       WHERE f.patient_id IS NULL
       ORDER BY u.full_name ASC`
    );

    const familyMembers = result.rows.map(fm => ({
      family_id: fm.family_id,
      user_id: fm.user_id,
      full_name: fm.full_name,
      email: fm.email,
      phone_number: fm.phone_number,
    }));

    res.status(200).json({
      status: 'success',
      total_family_members: familyMembers.length,
      family_members: familyMembers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all available doctors for assignment
const getDoctors = async (req, res) => {
  try {
    console.log('getDoctors: Fetching verified doctors...');
    const result = await pool.query(
      `SELECT d.doctor_id, u.user_id, u.email, u.full_name, u.phone_number, 
              d.specialization, d.hospital_clinic, d.license_number, d.verification_status
       FROM doctors d
       JOIN users u ON d.user_id = u.user_id
       WHERE d.verification_status = 'verified'
       ORDER BY u.full_name ASC`
    );

    console.log(`getDoctors: Found ${result.rows.length} verified doctors`);

    const doctors = result.rows.map(doc => ({
      doctor_id: doc.doctor_id,
      user_id: doc.user_id,
      email: doc.email,
      full_name: doc.full_name,
      phone_number: doc.phone_number,
      specialization: doc.specialization || 'General Practitioner',
      hospital_clinic: doc.hospital_clinic || 'N/A',
      license_number: doc.license_number,
      verification_status: doc.verification_status,
    }));

    res.status(200).json({
      status: 'success',
      total_doctors: doctors.length,
      doctors: doctors,
    });
  } catch (err) {
    console.error('getDoctors error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Add a family member to a patient
const addFamilyMember = async (req, res) => {
  const { family_member_id, relationship } = req.body;

  try {
    if (!family_member_id || !relationship) {
      return res.status(400).json({ error: 'Family Member ID and relationship required' });
    }

    // Get patient_id from JWT token (user_id)
    const userId = req.user.user_id;
    const patientResult = await pool.query(
      'SELECT patient_id FROM patients WHERE user_id = $1',
      [userId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientId = patientResult.rows[0].patient_id;

    // Verify family member exists by user_id and get family_id
    const familyResult = await pool.query(
      'SELECT family_id FROM family_members WHERE user_id = $1 AND patient_id IS NULL',
      [family_member_id]
    );

    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Family member not found or already assigned' });
    }

    const familyId = familyResult.rows[0].family_id;

    // Update family_member with patient_id and relationship
    await pool.query(
      'UPDATE family_members SET patient_id = $1, relationship = $2 WHERE family_id = $3',
      [patientId, relationship, familyId]
    );

    res.status(200).json({
      status: 'success',
      message: 'Family member added successfully',
      patient_id: patientId,
      family_member_id: parseInt(family_member_id),
      family_id: familyId,
      relationship: relationship,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update patient password
const updatePassword = async (req, res) => {
  const { user_id, old_password, new_password } = req.body;

  try {
    if (!user_id || !old_password || !new_password) {
      return res.status(400).json({ error: 'User ID, old password, and new password required' });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT user_id, password_hash FROM users WHERE user_id = $1',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify old password
    const passwordMatch = await bcrypt.compare(old_password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2',
      [hashedNewPassword, user_id]
    );

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update patient profile
const updateProfile = async (req, res) => {
  const { user_id, full_name, phone_number, medical_condition } = req.body;

  try {
    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Verify user exists
    const userResult = await pool.query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user profile
    const updateData = [];
    const updateParams = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updateData.push(`full_name = $${paramIndex++}`);
      updateParams.push(full_name);
    }
    if (phone_number !== undefined) {
      updateData.push(`phone_number = $${paramIndex++}`);
      updateParams.push(phone_number);
    }

    if (updateData.length > 0) {
      updateParams.push(user_id);
      const query = `UPDATE users SET ${updateData.join(', ')} WHERE user_id = $${paramIndex}`;
      await pool.query(query, updateParams);
    }

    // Update medical condition if provided
    if (medical_condition !== undefined) {
      const patientResult = await pool.query(
        'SELECT patient_id FROM patients WHERE user_id = $1',
        [user_id]
      );

      if (patientResult.rows.length > 0) {
        await pool.query(
          'UPDATE patients SET medical_condition = $1 WHERE user_id = $2',
          [medical_condition, user_id]
        );
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove doctor assignment
const removeDoctor = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get patient_id from user_id
    const patientResult = await pool.query(
      'SELECT patient_id FROM patients WHERE user_id = $1',
      [userId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientId = patientResult.rows[0].patient_id;

    // Set assigned_doctor_id to NULL
    await pool.query(
      'UPDATE patients SET assigned_doctor_id = NULL WHERE patient_id = $1',
      [patientId]
    );

    console.log(`Doctor assignment removed for patient ${patientId}`);

    res.status(200).json({
      status: 'success',
      message: 'Doctor assignment removed successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove family member (unassign from patient)
const removeFamilyMember = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { familyMemberId } = req.params;

    // Get patient_id from user_id
    const patientResult = await pool.query(
      'SELECT patient_id FROM patients WHERE user_id = $1',
      [userId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientId = patientResult.rows[0].patient_id;

    // Unassign the family member by setting patient_id and relationship back to NULL
    const updateResult = await pool.query(
      'UPDATE family_members SET patient_id = NULL, relationship = NULL WHERE patient_id = $1 AND user_id = $2 RETURNING family_id',
      [patientId, familyMemberId]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Family member not found or not assigned to you' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Family member removed successfully',
      family_id: updateResult.rows[0].family_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
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
  removeFamilyMember,
};
