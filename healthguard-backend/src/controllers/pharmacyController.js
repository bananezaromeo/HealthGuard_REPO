const pool = require('../config/database');

// Get pharmacy profile
const getPharmacyProfile = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      console.error('req.user is undefined');
      return res.status(401).json({ error: 'Unauthorized: No user data' });
    }

    const userId = req.user.user_id;

    if (!userId) {
      console.error('user_id not found in token:', req.user);
      return res.status(401).json({ error: 'Unauthorized: No user_id in token' });
    }

    const result = await pool.query(
      `SELECT p.pharmacy_id, u.full_name, u.email, u.phone_number, 
              p.pharmacy_name, p.province, p.district, p.city_sector, u.created_at
       FROM pharmacies p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }

    const pharmacy = result.rows[0];
    res.status(200).json({
      status: 'success',
      pharmacy: {
        pharmacy_id: pharmacy.pharmacy_id,
        full_name: pharmacy.full_name,
        email: pharmacy.email,
        phone_number: pharmacy.phone_number,
        pharmacy_name: pharmacy.pharmacy_name,
        province: pharmacy.province,
        district: pharmacy.district,
        city_sector: pharmacy.city_sector,
        created_at: pharmacy.created_at,
      },
    });
  } catch (err) {
    console.error('Error in getPharmacyProfile:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Get all prescriptions for pharmacy
const getPrescriptions = async (req, res) => {
  const userId = req.user.user_id;

  try {
    // Get pharmacy_id from user_id
    const pharmacyResult = await pool.query(
      'SELECT pharmacy_id FROM pharmacies WHERE user_id = $1',
      [userId]
    );

    if (pharmacyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }

    const pharmacyId = pharmacyResult.rows[0].pharmacy_id;

    // Get all prescriptions for this pharmacy with doctor and patient info
    const result = await pool.query(
      `SELECT 
        pr.prescription_id, pr.pharmacy_id, pr.doctor_id, pr.patient_id,
        pr.medicines, pr.instructions, pr.status, pr.created_at,
        d_user.full_name as doctor_name, d_user.email as doctor_email,
        p_user.full_name as patient_name, p_user.phone_number as patient_phone
       FROM prescriptions pr
       JOIN doctors d ON pr.doctor_id = d.doctor_id
       JOIN users d_user ON d.user_id = d_user.user_id
       JOIN patients pt ON pr.patient_id = pt.patient_id
       JOIN users p_user ON pt.user_id = p_user.user_id
       WHERE pr.pharmacy_id = $1
       ORDER BY pr.created_at DESC`,
      [pharmacyId]
    );

    const prescriptions = result.rows.map(p => ({
      prescription_id: p.prescription_id,
      medicines: typeof p.medicines === 'string' ? JSON.parse(p.medicines) : p.medicines,
      instructions: p.instructions,
      status: p.status,
      created_at: p.created_at,
      doctor: {
        name: p.doctor_name,
        email: p.doctor_email,
      },
      patient: {
        name: p.patient_name,
        phone: p.patient_phone,
      },
    }));

    res.status(200).json({
      status: 'success',
      total_prescriptions: prescriptions.length,
      prescriptions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Approve prescription (mark as accepted/received)
const approvePrescription = async (req, res) => {
  const userId = req.user.user_id;
  const { prescriptionId } = req.params;

  try {
    // Verify this pharmacy owns this prescription
    const prescriptionCheck = await pool.query(
      `SELECT pr.prescription_id, p.user_id FROM prescriptions pr
       JOIN pharmacies p ON pr.pharmacy_id = p.pharmacy_id
       WHERE pr.prescription_id = $1 AND p.user_id = $2`,
      [prescriptionId, userId]
    );

    if (prescriptionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found or unauthorized' });
    }

    // Update prescription status to approved
    const result = await pool.query(
      `UPDATE prescriptions 
       SET status = 'approved', updated_at = NOW()
       WHERE prescription_id = $1
       RETURNING prescription_id, status, updated_at`,
      [prescriptionId]
    );

    res.status(200).json({
      status: 'success',
      message: 'Prescription approved successfully',
      prescription: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Deny prescription
const denyPrescription = async (req, res) => {
  const userId = req.user.user_id;
  const { prescriptionId } = req.params;
  const { reason } = req.body;

  try {
    // Verify this pharmacy owns this prescription
    const prescriptionCheck = await pool.query(
      `SELECT pr.prescription_id, p.user_id FROM prescriptions pr
       JOIN pharmacies p ON pr.pharmacy_id = p.pharmacy_id
       WHERE pr.prescription_id = $1 AND p.user_id = $2`,
      [prescriptionId, userId]
    );

    if (prescriptionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found or unauthorized' });
    }

    // Update prescription status to denied
    const result = await pool.query(
      `UPDATE prescriptions 
       SET status = 'denied', notes = COALESCE(notes, '') || '\n[Denied Reason: ' || $2 || ']', updated_at = NOW()
       WHERE prescription_id = $1
       RETURNING prescription_id, status, updated_at`,
      [prescriptionId, reason || 'No reason provided']
    );

    res.status(200).json({
      status: 'success',
      message: 'Prescription denied successfully',
      prescription: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Deliver prescription (mark as delivered)
const deliverPrescription = async (req, res) => {
  const userId = req.user.user_id;
  const { prescriptionId } = req.params;

  try {
    // Verify this pharmacy owns this prescription and it's approved
    const prescriptionCheck = await pool.query(
      `SELECT pr.prescription_id, pr.status, p.user_id FROM prescriptions pr
       JOIN pharmacies p ON pr.pharmacy_id = p.pharmacy_id
       WHERE pr.prescription_id = $1 AND p.user_id = $2`,
      [prescriptionId, userId]
    );

    if (prescriptionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found or unauthorized' });
    }

    if (prescriptionCheck.rows[0].status !== 'approved') {
      return res.status(400).json({ error: 'Only approved prescriptions can be marked as delivered' });
    }

    // Update prescription status to delivered
    const result = await pool.query(
      `UPDATE prescriptions 
       SET status = 'delivered', updated_at = NOW()
       WHERE prescription_id = $1
       RETURNING prescription_id, status, updated_at`,
      [prescriptionId]
    );

    res.status(200).json({
      status: 'success',
      message: 'Prescription marked as delivered successfully',
      prescription: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update pharmacy profile
const updatePharmacyProfile = async (req, res) => {
  const userId = req.user.user_id;
  const { full_name, pharmacy_name, phone_number, province, district, city_sector } = req.body;

  try {
    // Get pharmacy and user IDs
    const pharmacyResult = await pool.query(
      'SELECT pharmacy_id FROM pharmacies WHERE user_id = $1',
      [userId]
    );

    if (pharmacyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }

    // Update pharmacy info
    if (pharmacy_name || province || district || city_sector) {
      await pool.query(
        `UPDATE pharmacies 
         SET pharmacy_name = COALESCE($1, pharmacy_name),
             province = COALESCE($2, province),
             district = COALESCE($3, district),
             city_sector = COALESCE($4, city_sector)
         WHERE user_id = $5`,
        [pharmacy_name, province, district, city_sector, userId]
      );
    }

    // Update user info (full_name and phone_number)
    if (full_name || phone_number) {
      await pool.query(
        `UPDATE users 
         SET full_name = COALESCE($1, full_name),
             phone_number = COALESCE($2, phone_number)
         WHERE user_id = $3`,
        [full_name, phone_number, userId]
      );
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

module.exports = {
  getPharmacyProfile,
  getPrescriptions,
  approvePrescription,
  denyPrescription,
  deliverPrescription,
  updatePharmacyProfile,
};
