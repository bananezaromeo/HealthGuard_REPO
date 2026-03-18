const pool = require('../config/database');

// Doctor views all assigned patients
const getAssignedPatients = async (req, res) => {
  const { doctor_id } = req.params;

  try {
    // Verify doctor exists
    const doctorExists = await pool.query(
      'SELECT doctor_id FROM doctors WHERE doctor_id = $1',
      [doctor_id]
    );

    if (doctorExists.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Get all assigned patients
    const result = await pool.query(
      `SELECT p.patient_id, u.user_id, u.email, u.full_name, u.phone_number, p.age, p.medical_condition
       FROM patients p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.doctor_id = $1
       ORDER BY u.full_name ASC`,
      [doctor_id]
    );

    const patients = result.rows.map(p => ({
      patient_id: p.patient_id,
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      phone_number: p.phone_number,
      age: p.age,
      medical_condition: p.medical_condition,
    }));

    res.status(200).json({
      status: 'success',
      total_patients: patients.length,
      patients,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Doctor views specific patient details
const getPatientDetails = async (req, res) => {
  const { doctor_id, patient_id } = req.params;

  try {
    // Verify doctor-patient relationship
    const relationship = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1 AND doctor_id = $2',
      [patient_id, doctor_id]
    );

    if (relationship.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to view this patient' });
    }

    // Get patient details
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.full_name, u.phone_number, p.patient_id, p.age, p.medical_condition
       FROM patients p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.patient_id = $1`,
      [patient_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = result.rows[0];
    res.status(200).json({
      status: 'success',
      patient: {
        patient_id: patient.patient_id,
        user_id: patient.user_id,
        full_name: patient.full_name,
        email: patient.email,
        phone_number: patient.phone_number,
        age: patient.age,
        medical_condition: patient.medical_condition,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Doctor views patient's medical history (seizures/cardiac events)
const getPatientMedicalHistory = async (req, res) => {
  const { doctor_id, patient_id } = req.params;

  try {
    // Verify doctor-patient relationship
    const relationship = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1 AND doctor_id = $2',
      [patient_id, doctor_id]
    );

    if (relationship.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to view this patient' });
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
      seizure_events: seizureResult.rows,
      cardiac_events: cardiacResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get doctor profile
const getDoctorProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user data' });
    }

    const userId = req.user.user_id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: No user_id in token' });
    }

    const result = await pool.query(
      `SELECT d.doctor_id, u.full_name, u.email, u.phone_number, 
              d.specialization, d.license_number, d.hospital_clinic, u.created_at
       FROM doctors d
       JOIN users u ON d.user_id = u.user_id
       WHERE d.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctor = result.rows[0];
    res.status(200).json({
      status: 'success',
      doctor: {
        doctor_id: doctor.doctor_id,
        full_name: doctor.full_name,
        email: doctor.email,
        phone_number: doctor.phone_number,
        specialization: doctor.specialization,
        license_number: doctor.license_number,
        hospital_clinic: doctor.hospital_clinic,
        created_at: doctor.created_at,
      },
    });
  } catch (err) {
    console.error('Error in getDoctorProfile:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Get all patients assigned to this doctor
const getDoctorAssignedPatients = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user data' });
    }

    const userId = req.user.user_id;

    // Get doctor_id from user_id
    const doctorResult = await pool.query(
      'SELECT doctor_id FROM doctors WHERE user_id = $1',
      [userId]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctorId = doctorResult.rows[0].doctor_id;

    // Get all assigned patients (assigned_doctor_id stores doctor's user_id)
    const result = await pool.query(
      `SELECT p.patient_id, u.user_id, u.full_name, u.email, u.phone_number, 
              p.age, p.medical_condition
       FROM patients p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.assigned_doctor_id = $1
       ORDER BY u.full_name ASC`,
      [userId]
    );

    console.log(`getDoctorAssignedPatients: Found ${result.rows.length} patients for doctor ${userId}`);

    res.status(200).json({
      status: 'success',
      patients: result.rows,
      total: result.rows.length,
    });
  } catch (err) {
    console.error('Error in getDoctorAssignedPatients:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Get patient alerts/history for a specific patient
const getDoctorPatientHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user data' });
    }

    const { patientId } = req.params;
    const userId = req.user.user_id;

    console.log('getDoctorPatientHistory called - patientId:', patientId, 'userId:', userId);

    // Verify patient is assigned to this doctor
    const patientCheck = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1 AND assigned_doctor_id = $2',
      [patientId, userId]
    );

    console.log('Patient check result:', patientCheck.rows.length);

    if (patientCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Patient not assigned to you' });
    }

    // Get seizure events (alerts)
    const seizureEvents = await pool.query(
      `SELECT event_id, timestamp, accelerometer_x, accelerometer_y, accelerometer_z,
              heart_rate, oxygen_level, temperature
       FROM seizure_events
       WHERE patient_id = $1
       ORDER BY timestamp DESC
       LIMIT 10`,
      [patientId]
    );

    // Get cardiac events (alerts)
    const cardiacEvents = await pool.query(
      `SELECT event_id, timestamp, heart_rate, heart_rate_variability, oxygen_level
       FROM cardiac_events
       WHERE patient_id = $1
       ORDER BY timestamp DESC
       LIMIT 10`,
      [patientId]
    );

    // Get general alerts
    const alerts = await pool.query(
      `SELECT alert_id, alert_type, sent_at, read_at
       FROM alerts
       WHERE patient_id = $1
       ORDER BY sent_at DESC
       LIMIT 10`,
      [patientId]
    );

    console.log('Found - seizure:', seizureEvents.rows.length, 'cardiac:', cardiacEvents.rows.length, 'alerts:', alerts.rows.length);

    res.status(200).json({
      status: 'success',
      seizure_events: seizureEvents.rows,
      cardiac_events: cardiacEvents.rows,
      alerts: alerts.rows,
    });
  } catch (err) {
    console.error('Error in getDoctorPatientHistory:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Get prescriptions sent by doctor
const getDoctorPrescriptions = async (req, res) => {
  const userId = req.user.user_id;

  try {
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
        pr.prescription_id, pr.doctor_id, pr.patient_id, pr.pharmacy_id,
        pr.medicines, pr.instructions, pr.status, pr.created_at,
        p_user.full_name as patient_name, p_user.phone_number as patient_phone,
        ph.pharmacy_name, ph_user.full_name as pharmacy_contact,
        ph_user.phone_number as pharmacy_phone
       FROM prescriptions pr
       JOIN patients pt ON pr.patient_id = pt.patient_id
       JOIN users p_user ON pt.user_id = p_user.user_id
       JOIN pharmacies ph ON pr.pharmacy_id = ph.pharmacy_id
       JOIN users ph_user ON ph.user_id = ph_user.user_id
       WHERE pr.doctor_id = $1
       ORDER BY pr.created_at DESC
       LIMIT 50`,
      [doctorId]
    );

    const prescriptions = result.rows.map(p => ({
      prescription_id: p.prescription_id,
      patient_name: p.patient_name,
      patient_phone: p.patient_phone,
      pharmacy_name: p.pharmacy_name,
      pharmacy_contact: p.pharmacy_contact,
      pharmacy_phone: p.pharmacy_phone,
      medicines: typeof p.medicines === 'string' ? JSON.parse(p.medicines) : p.medicines,
      instructions: p.instructions,
      status: p.status,
      created_at: p.created_at,
    }));

    res.status(200).json({
      status: 'success',
      prescriptions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get patient alerts for doctor (placeholder for wearable data)
const getPatientAlerts = async (req, res) => {
  try {
    // TODO: Implement wearable data integration
    // For now, return empty array as placeholder
    res.status(200).json({
      status: 'success',
      alerts: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update doctor profile
const updateDoctorProfile = async (req, res) => {
  const userId = req.user.user_id;
  const { full_name, phone_number, specialization, license_number, hospital_clinic } = req.body;

  try {
    // Get doctor_id
    const doctorResult = await pool.query(
      'SELECT doctor_id FROM doctors WHERE user_id = $1',
      [userId]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Update doctor info
    if (specialization || license_number || hospital_clinic) {
      await pool.query(
        `UPDATE doctors 
         SET specialization = COALESCE($1, specialization),
             license_number = COALESCE($2, license_number),
             hospital_clinic = COALESCE($3, hospital_clinic)
         WHERE user_id = $4`,
        [specialization, license_number, hospital_clinic, userId]
      );
    }

    // Update user info
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

// Send prescription to pharmacy
const sendPrescription = async (req, res) => {
  const userId = req.user.user_id;
  const { patient_id, pharmacy_id, medicines, instructions } = req.body;

  try {
    // Get doctor_id
    const doctorResult = await pool.query(
      'SELECT doctor_id FROM doctors WHERE user_id = $1',
      [userId]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctorId = doctorResult.rows[0].doctor_id;

    // Create prescription
    const medicinesJson = JSON.stringify(medicines);
    const result = await pool.query(
      `INSERT INTO prescriptions (doctor_id, patient_id, pharmacy_id, medicines, instructions, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING prescription_id, created_at`,
      [doctorId, patient_id, pharmacy_id, medicinesJson, instructions]
    );

    const prescription = result.rows[0];
    res.status(201).json({
      status: 'success',
      message: 'Prescription sent successfully',
      prescription_id: prescription.prescription_id,
      created_at: prescription.created_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Search pharmacies by name or district
const searchPharmacy = async (req, res) => {
  const { q, district } = req.query;

  try {
    let query = `SELECT p.pharmacy_id, p.pharmacy_name, p.province, p.district, p.city_sector, 
                  u.full_name as contact_name, u.phone_number, u.email
                 FROM pharmacies p
                 JOIN users u ON p.user_id = u.user_id
                 WHERE 1=1`;
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      query += ` AND (p.pharmacy_name ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
    }

    if (district) {
      params.push(district);
      query += ` AND p.district = $${params.length}`;
    }

    query += ' LIMIT 20';

    const result = await pool.query(query, params);

    res.status(200).json({
      status: 'success',
      pharmacies: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get alerts/notifications for a specific patient
const getPatientAlertHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { patientId } = req.params;
    const userId = req.user.user_id;

    console.log('getPatientAlertHistory - patientId:', patientId, 'userId:', userId);

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID required' });
    }

    // Verify patient is assigned to this doctor
    const patientCheck = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1 AND assigned_doctor_id = $2',
      [patientId, userId]
    );

    if (patientCheck.rows.length === 0) {
      console.log('Patient not assigned to doctor');
      return res.status(403).json({ error: 'Patient not assigned to you' });
    }

    // Get patient alerts (from seizure_events, cardiac_events, or manual alerts)
    const alertsResult = await pool.query(
      `SELECT 
        'seizure' as alert_type,
        se.timestamp,
        se.heart_rate,
        se.oxygen_level,
        se.temperature,
        'Seizure Event Detected' as description,
        se.event_id
       FROM seizure_events se
       WHERE se.patient_id = $1
       
       UNION ALL
       
       SELECT 
        'cardiac' as alert_type,
        ce.timestamp,
        ce.heart_rate,
        ce.oxygen_level,
        NULL as temperature,
        ce.event_type as description,
        ce.event_id
       FROM cardiac_events ce
       WHERE ce.patient_id = $1
       
       UNION ALL
       
       SELECT 
        a.alert_type,
        a.sent_at as timestamp,
        NULL as heart_rate,
        NULL as oxygen_level,
        NULL as temperature,
        a.alert_type as description,
        a.alert_id as event_id
       FROM alerts a
       WHERE a.patient_id = $1
       
       ORDER BY timestamp DESC
       LIMIT 50`,
      [patientId]
    );

    console.log('Found alerts:', alertsResult.rows.length);

    const alerts = alertsResult.rows.map(a => ({
      alert_id: a.event_id,
      alert_type: a.alert_type,
      timestamp: a.timestamp,
      heart_rate: a.heart_rate,
      oxygen_level: a.oxygen_level,
      temperature: a.temperature,
      description: a.description,
    }));

    res.status(200).json({
      status: 'success',
      total_alerts: alerts.length,
      alerts,
    });
  } catch (err) {
    console.error('Error in getPatientAlertHistory:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

module.exports = {
  getAssignedPatients,
  getPatientDetails,
  getPatientMedicalHistory,
  getDoctorProfile,
  getDoctorAssignedPatients,
  getPatientAlertHistory,
  getDoctorPrescriptions,
  getPatientAlerts,
  updateDoctorProfile,
  sendPrescription,
  searchPharmacy,
};
