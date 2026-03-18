const pool = require('../config/database');

// Doctor views all pharmacies (by location)
const getPharmacies = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.pharmacy_id, u.user_id, p.pharmacy_name, u.phone_number, p.province, p.district, p.city_sector
       FROM pharmacies p
       JOIN users u ON p.user_id = u.user_id
       ORDER BY p.province, p.district ASC`
    );

    const pharmacies = result.rows.map(ph => ({
      pharmacy_id: ph.pharmacy_id,
      pharmacy_name: ph.pharmacy_name,
      phone_number: ph.phone_number,
      location: {
        province: ph.province,
        district: ph.district,
        city_sector: ph.city_sector,
      },
    }));

    res.status(200).json({
      status: 'success',
      total_pharmacies: pharmacies.length,
      pharmacies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Doctor sends prescription to pharmacy
const sendPrescription = async (req, res) => {
  const userId = req.user.user_id; // From JWT
  const { patient_id, pharmacy_id, medicines, instructions } = req.body;

  try {
    console.log('=== sendPrescription START ===');
    console.log('userId:', userId, 'patient_id:', patient_id, 'pharmacy_id:', pharmacy_id);

    if (!patient_id || !pharmacy_id || !medicines || !Array.isArray(medicines)) {
      return res.status(400).json({ error: 'Missing or invalid fields' });
    }

    // Verify doctor exists
    const doctorResult = await pool.query(
      'SELECT doctor_id FROM doctors WHERE user_id = $1',
      [userId]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctorId = doctorResult.rows[0].doctor_id;

    // Verify patient is assigned to this doctor
    const relationship = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1 AND assigned_doctor_id = $2',
      [patient_id, userId]
    );

    if (relationship.rows.length === 0) {
      return res.status(403).json({ error: 'Patient not assigned to this doctor' });
    }

    // Verify pharmacy exists
    const pharmacyExists = await pool.query(
      'SELECT pharmacy_id FROM pharmacies WHERE pharmacy_id = $1',
      [pharmacy_id]
    );

    if (pharmacyExists.rows.length === 0) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }

    // Get patient's latest event location (seizure or cardiac)
    const latestEvent = await pool.query(
      `(SELECT latitude, longitude FROM seizure_events WHERE patient_id = $1 ORDER BY timestamp DESC LIMIT 1)
       UNION ALL
       (SELECT latitude, longitude FROM cardiac_events WHERE patient_id = $1 ORDER BY timestamp DESC LIMIT 1)
       LIMIT 1`,
      [patient_id]
    );

    const patientLocation = latestEvent.rows.length > 0 
      ? { latitude: latestEvent.rows[0].latitude, longitude: latestEvent.rows[0].longitude }
      : { latitude: null, longitude: null };

    // Create prescription with pending status
    const result = await pool.query(
      `INSERT INTO prescriptions (doctor_id, patient_id, pharmacy_id, medicines, instructions, patient_latitude, patient_longitude, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
       RETURNING prescription_id, created_at`,
      [doctorId, patient_id, pharmacy_id, JSON.stringify(medicines), instructions || null, patientLocation.latitude, patientLocation.longitude]
    );

    const prescription = result.rows[0];
    console.log('Prescription created - id:', prescription.prescription_id, 'status: pending');
    console.log('=== sendPrescription SUCCESS ===');

    res.status(201).json({
      status: 'success',
      message: 'Prescription sent successfully',
      prescription_id: prescription.prescription_id,
      patient_id: parseInt(patient_id),
      pharmacy_id: parseInt(pharmacy_id),
      medicines,
      patient_location: patientLocation,
      prescription_status: 'pending',
      created_at: prescription.created_at,
    });
  } catch (err) {
    console.error('ERROR in sendPrescription:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Get all prescriptions sent by doctor (for doctor dashboard)
const getDoctorPrescriptions = async (req, res) => {
  const userId = req.user.user_id; // From JWT

  try {
    console.log('=== getDoctorPrescriptions for user:', userId);

    // Get doctor_id from user_id
    const doctorResult = await pool.query(
      'SELECT doctor_id FROM doctors WHERE user_id = $1',
      [userId]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctorId = doctorResult.rows[0].doctor_id;

    // Get all prescriptions sent by this doctor
    const result = await pool.query(
      `SELECT 
        p.prescription_id,
        p.status,
        p.created_at,
        p.approved_at,
        p.delivered_at,
        p.medicines,
        p.instructions,
        p.patient_latitude,
        p.patient_longitude,
        u_patient.full_name AS patient_name,
        pa.age AS patient_age,
        u_patient.phone_number AS patient_phone,
        ph.pharmacy_name AS pharmacy_name,
        u_pharmacy.phone_number AS pharmacy_phone,
        ph.latitude AS pharmacy_latitude,
        ph.longitude AS pharmacy_longitude
       FROM prescriptions p
       JOIN patients pa ON p.patient_id = pa.patient_id
       JOIN users u_patient ON pa.user_id = u_patient.user_id
       JOIN pharmacies ph ON p.pharmacy_id = ph.pharmacy_id
       JOIN users u_pharmacy ON ph.user_id = u_pharmacy.user_id
       WHERE p.doctor_id = $1
       ORDER BY p.created_at DESC`,
      [doctorId]
    );

    console.log('Found', result.rows.length, 'prescriptions');

    res.json({
      status: 'success',
      total: result.rows.length,
      prescriptions: result.rows.map(r => ({
        prescription_id: r.prescription_id,
        status: r.status,
        created_at: r.created_at,
        approved_at: r.approved_at,
        delivered_at: r.delivered_at,
        medicines: JSON.parse(r.medicines),
        instructions: r.instructions,
        patient: {
          name: r.patient_name,
          age: r.patient_age,
          phone: r.patient_phone,
          location: { latitude: r.patient_latitude, longitude: r.patient_longitude }
        },
        pharmacy: {
          name: r.pharmacy_name,
          phone: r.pharmacy_phone,
          location: { latitude: r.pharmacy_latitude, longitude: r.pharmacy_longitude }
        }
      }))
    });
  } catch (err) {
    console.error('ERROR in getDoctorPrescriptions:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Pharmacy views pending prescriptions
const getPendingPrescriptions = async (req, res) => {
  const userId = req.user.user_id; // From JWT

  try {
    console.log('=== getPendingPrescriptions for user:', userId);

    // Get pharmacy_id from user_id
    const pharmacyResult = await pool.query(
      'SELECT pharmacy_id FROM pharmacies WHERE user_id = $1',
      [userId]
    );

    if (pharmacyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }

    const pharmacyId = pharmacyResult.rows[0].pharmacy_id;

    // Get pending and approved prescriptions for this pharmacy
    const result = await pool.query(
      `SELECT 
        p.prescription_id,
        p.status,
        p.created_at,
        p.approved_at,
        p.delivered_at,
        p.medicines,
        p.instructions,
        p.patient_latitude,
        p.patient_longitude,
        u_doctor.full_name AS doctor_name,
        u_patient.full_name AS patient_name,
        pa.age AS patient_age,
        u_patient.phone_number AS patient_phone
       FROM prescriptions p
       JOIN doctors dr ON p.doctor_id = dr.doctor_id
       JOIN users u_doctor ON dr.user_id = u_doctor.user_id
       JOIN patients pa ON p.patient_id = pa.patient_id
       JOIN users u_patient ON pa.user_id = u_patient.user_id
       WHERE p.pharmacy_id = $1 AND p.status IN ('pending', 'approved')
       ORDER BY p.created_at DESC`,
      [pharmacyId]
    );

    console.log('Found', result.rows.length, 'pending/approved prescriptions');

    res.json({
      status: 'success',
      total: result.rows.length,
      pending_count: result.rows.filter(r => r.status === 'pending').length,
      prescriptions: result.rows.map(r => ({
        prescription_id: r.prescription_id,
        status: r.status,
        created_at: r.created_at,
        approved_at: r.approved_at,
        delivered_at: r.delivered_at,
        medicines: typeof r.medicines === 'string' ? JSON.parse(r.medicines) : r.medicines,
        instructions: r.instructions,
        doctor: {
          name: r.doctor_name
        },
        patient: {
          name: r.patient_name,
          age: r.patient_age,
          phone: r.patient_phone,
          location: { latitude: r.patient_latitude, longitude: r.patient_longitude }
        }
      }))
    });
  } catch (err) {
    console.error('ERROR in getPendingPrescriptions:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Pharmacy gets prescription history (approved, rejected, delivered)
const getPrescriptionHistory = async (req, res) => {
  const userId = req.user.user_id; // From JWT

  try {
    console.log('=== getPrescriptionHistory for user:', userId);

    // Get pharmacy_id from user_id
    const pharmacyResult = await pool.query(
      'SELECT pharmacy_id FROM pharmacies WHERE user_id = $1',
      [userId]
    );

    if (pharmacyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }

    const pharmacyId = pharmacyResult.rows[0].pharmacy_id;

    // Get approved, rejected, and delivered prescriptions for this pharmacy
    const result = await pool.query(
      `SELECT 
        p.prescription_id,
        p.status,
        p.created_at,
        p.approved_at,
        p.delivered_at,
        p.denied_reason,
        p.denied_at,
        p.medicines,
        p.instructions,
        p.patient_latitude,
        p.patient_longitude,
        u_doctor.full_name AS doctor_name,
        u_patient.full_name AS patient_name,
        pa.age AS patient_age,
        u_patient.phone_number AS patient_phone
       FROM prescriptions p
       JOIN doctors dr ON p.doctor_id = dr.doctor_id
       JOIN users u_doctor ON dr.user_id = u_doctor.user_id
       JOIN patients pa ON p.patient_id = pa.patient_id
       JOIN users u_patient ON pa.user_id = u_patient.user_id
       WHERE p.pharmacy_id = $1 AND p.status IN ('approved', 'rejected', 'delivered')
       ORDER BY COALESCE(p.delivered_at, p.denied_at, p.approved_at, p.created_at) DESC`,
      [pharmacyId]
    );

    console.log('Found', result.rows.length, 'history prescriptions');

    res.json({
      status: 'success',
      total: result.rows.length,
      prescriptions: result.rows.map(r => ({
        prescription_id: r.prescription_id,
        status: r.status,
        created_at: r.created_at,
        approved_at: r.approved_at,
        delivered_at: r.delivered_at,
        denied_reason: r.denied_reason,
        denied_at: r.denied_at,
        medicines: typeof r.medicines === 'string' ? JSON.parse(r.medicines) : r.medicines,
        instructions: r.instructions,
        doctor: {
          name: r.doctor_name
        },
        patient: {
          name: r.patient_name,
          age: r.patient_age,
          phone: r.patient_phone,
          location: { latitude: r.patient_latitude, longitude: r.patient_longitude }
        }
      }))
    });
  } catch (err) {
    console.error('ERROR in getPrescriptionHistory:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Pharmacy approves prescription
const approvePrescription = async (req, res) => {
  const userId = req.user.user_id; // From JWT
  const { prescription_id } = req.params;

  try {
    console.log('=== approvePrescription for user:', userId, 'prescription:', prescription_id);

    // Get pharmacy_id from user_id
    const pharmacyResult = await pool.query(
      'SELECT pharmacy_id FROM pharmacies WHERE user_id = $1',
      [userId]
    );

    if (pharmacyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }

    const pharmacyId = pharmacyResult.rows[0].pharmacy_id;

    // Verify prescription belongs to this pharmacy and is pending
    const prescription = await pool.query(
      'SELECT prescription_id, status FROM prescriptions WHERE prescription_id = $1 AND pharmacy_id = $2',
      [prescription_id, pharmacyId]
    );

    if (prescription.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Only pending prescriptions can be approved' });
    }

    // Approve prescription
    const result = await pool.query(
      'UPDATE prescriptions SET status = $1, approved_at = NOW() WHERE prescription_id = $2 RETURNING prescription_id, status, approved_at',
      ['approved', prescription_id]
    );

    const updated = result.rows[0];
    console.log('Prescription approved - id:', prescription_id);
    console.log('=== approvePrescription SUCCESS ===');

    res.json({
      status: 'success',
      message: 'Prescription approved',
      prescription_id: updated.prescription_id,
      prescription_status: updated.status,
      approved_at: updated.approved_at
    });
  } catch (err) {
    console.error('ERROR in approvePrescription:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Pharmacy marks prescription as delivered
const deliverPrescription = async (req, res) => {
  const userId = req.user.user_id; // From JWT
  const { prescription_id } = req.params;

  try {
    console.log('=== deliverPrescription for user:', userId, 'prescription:', prescription_id);

    // Get pharmacy_id from user_id
    const pharmacyResult = await pool.query(
      'SELECT pharmacy_id FROM pharmacies WHERE user_id = $1',
      [userId]
    );

    if (pharmacyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }

    const pharmacyId = pharmacyResult.rows[0].pharmacy_id;

    // Verify prescription belongs to this pharmacy and is approved
    const prescription = await pool.query(
      'SELECT prescription_id, status FROM prescriptions WHERE prescription_id = $1 AND pharmacy_id = $2',
      [prescription_id, pharmacyId]
    );

    if (prescription.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.rows[0].status !== 'approved') {
      return res.status(400).json({ error: 'Only approved prescriptions can be delivered' });
    }

    // Mark as delivered
    const result = await pool.query(
      'UPDATE prescriptions SET status = $1, delivered_at = NOW() WHERE prescription_id = $2 RETURNING prescription_id, status, delivered_at',
      ['delivered', prescription_id]
    );

    const updated = result.rows[0];
    console.log('Prescription delivered - id:', prescription_id);
    console.log('=== deliverPrescription SUCCESS ===');

    res.json({
      status: 'success',
      message: 'Prescription marked as delivered',
      prescription_id: updated.prescription_id,
      prescription_status: updated.status,
      delivered_at: updated.delivered_at
    });
  } catch (err) {
    console.error('ERROR in deliverPrescription:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Pharmacy denies prescription
const denyPrescription = async (req, res) => {
  const userId = req.user.user_id; // From JWT
  const { prescription_id } = req.params;
  const { reason } = req.body;

  try {
    console.log('=== denyPrescription for user:', userId, 'prescription:', prescription_id);

    // Get pharmacy_id from user_id
    const pharmacyResult = await pool.query(
      'SELECT pharmacy_id FROM pharmacies WHERE user_id = $1',
      [userId]
    );

    if (pharmacyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }

    const pharmacyId = pharmacyResult.rows[0].pharmacy_id;

    // Verify prescription belongs to this pharmacy and is pending
    const prescription = await pool.query(
      'SELECT prescription_id, status FROM prescriptions WHERE prescription_id = $1 AND pharmacy_id = $2',
      [prescription_id, pharmacyId]
    );

    if (prescription.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Only pending prescriptions can be denied' });
    }

    // Deny prescription
    const result = await pool.query(
      'UPDATE prescriptions SET status = $1, denied_reason = $2, denied_at = NOW() WHERE prescription_id = $3 RETURNING prescription_id, status, denied_at',
      ['rejected', reason || null, prescription_id]
    );

    const updated = result.rows[0];
    console.log('Prescription denied - id:', prescription_id);
    console.log('=== denyPrescription SUCCESS ===');

    res.json({
      status: 'success',
      message: 'Prescription denied',
      prescription_id: updated.prescription_id,
      prescription_status: updated.status,
      denied_at: updated.denied_at
    });
  } catch (err) {
    console.error('ERROR in denyPrescription:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Doctor checks prescription status
const getPrescriptionStatus = async (req, res) => {
  const userId = req.user.user_id; // From JWT
  const { prescription_id } = req.params;

  try {
    console.log('=== getPrescriptionStatus for user:', userId, 'prescription:', prescription_id);

    // Get doctor_id from user_id
    const doctorResult = await pool.query(
      'SELECT doctor_id FROM doctors WHERE user_id = $1',
      [userId]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctorId = doctorResult.rows[0].doctor_id;

    // Get prescription status
    const result = await pool.query(
      `SELECT 
        p.prescription_id,
        p.status,
        p.medicines,
        p.instructions,
        p.created_at,
        p.approved_at,
        p.delivered_at,
        p.denied_reason,
        p.denied_at,
        u_patient.full_name AS patient_name,
        ph.pharmacy_name AS pharmacy_name
       FROM prescriptions p
       JOIN patients pa ON p.patient_id = pa.patient_id
       JOIN users u_patient ON pa.user_id = u_patient.user_id
       JOIN pharmacies ph ON p.pharmacy_id = ph.pharmacy_id
       WHERE p.prescription_id = $1 AND p.doctor_id = $2`,
      [prescription_id, doctorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const p = result.rows[0];
    console.log('Found prescription - status:', p.status);

    res.json({
      status: 'success',
      prescription: {
        prescription_id: p.prescription_id,
        patient_name: p.patient_name,
        pharmacy_name: p.pharmacy_name,
        medicines: JSON.parse(p.medicines),
        instructions: p.instructions,
        prescription_status: p.status,
        created_at: p.created_at,
        approved_at: p.approved_at,
        delivered_at: p.delivered_at,
        denied_reason: p.denied_reason,
        denied_at: p.denied_at
      }
    });
  } catch (err) {
    console.error('ERROR in getPrescriptionStatus:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

module.exports = {
  getPharmacies,
  sendPrescription,
  getDoctorPrescriptions,
  getPendingPrescriptions,
  getPrescriptionHistory,
  approvePrescription,
  denyPrescription,
  deliverPrescription,
  getPrescriptionStatus,
};
