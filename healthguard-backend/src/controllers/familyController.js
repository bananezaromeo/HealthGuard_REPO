const pool = require('../config/database');

// Family member views their assigned patient
const getAssignedPatient = async (req, res) => {
  const userId = req.user.user_id;

  try {
    // Get family member's assigned patient using JWT user_id
    const result = await pool.query(
      `SELECT f.family_id, f.relationship, p.patient_id, u.user_id, u.email, u.full_name, u.phone_number, 
              p.age, p.medical_condition
       FROM family_members f
       JOIN patients p ON f.patient_id = p.patient_id
       JOIN users u ON p.user_id = u.user_id
       WHERE f.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No patient assigned to this family member' });
    }

    const data = result.rows[0];
    res.status(200).json({
      status: 'success',
      family_id: data.family_id,
      relationship: data.relationship,
      patient: {
        patient_id: data.patient_id,
        user_id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        phone_number: data.phone_number,
        age: data.age,
        medical_condition: data.medical_condition,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Family member views patient's medical history (events)
const getPatientMedicalHistory = async (req, res) => {
  const userId = req.user.user_id;

  try {
    // Get family member's assigned patient using JWT user_id
    const familyResult = await pool.query(
      'SELECT patient_id FROM family_members WHERE user_id = $1',
      [userId]
    );

    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    const patient_id = familyResult.rows[0].patient_id;

    if (!patient_id) {
      return res.status(404).json({ error: 'No patient assigned to this family member' });
    }

    // Get seizure events
    const seizureResult = await pool.query(
      `SELECT event_id, severity, latitude, longitude, timestamp
       FROM seizure_events
       WHERE patient_id = $1
       ORDER BY timestamp DESC
       LIMIT 20`,
      [patient_id]
    );

    // Get cardiac events
    const cardiacResult = await pool.query(
      `SELECT event_id, heart_rate, blood_oxygen, latitude, longitude, timestamp
       FROM cardiac_events
       WHERE patient_id = $1
       ORDER BY timestamp DESC
       LIMIT 20`,
      [patient_id]
    );

    res.status(200).json({
      status: 'success',
      patient_id,
      seizure_events: seizureResult.rows,
      cardiac_events: cardiacResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get family member's own profile
const getFamilyMemberProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get family member info from users and family_members table
    const result = await pool.query(
      `SELECT f.family_id, f.relationship, f.patient_id, u.user_id, u.email, u.full_name, u.phone_number, u.created_at
       FROM family_members f
       JOIN users u ON f.user_id = u.user_id
       WHERE u.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    const profile = result.rows[0];
    res.status(200).json({
      status: 'success',
      family_member: {
        family_id: profile.family_id,
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        relationship: profile.relationship,
        assigned_patient_id: profile.patient_id,
        created_at: profile.created_at,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update family member's profile
const updateFamilyMemberProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { full_name, phone_number } = req.body;

    // Validate input
    if (!full_name && !phone_number) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Update users table
    const updates = [];
    const values = [userId];
    let paramCount = 2;

    if (full_name) {
      updates.push(`full_name = $${paramCount}`);
      values.push(full_name);
      paramCount++;
    }

    if (phone_number) {
      updates.push(`phone_number = $${paramCount}`);
      values.push(phone_number);
      paramCount++;
    }

    const query = `UPDATE users SET ${updates.join(', ')} WHERE user_id = $1 RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      user: {
        user_id: updatedUser.user_id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        phone_number: updatedUser.phone_number,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAssignedPatient,
  getPatientMedicalHistory,
  getFamilyMemberProfile,
  updateFamilyMemberProfile,
};
