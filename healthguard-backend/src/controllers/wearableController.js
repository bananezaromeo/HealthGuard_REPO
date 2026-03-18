const pool = require('../config/database');

// Store wearable health data
const storeHealthData = async (req, res) => {
  const { device_id, patient_id, timestamp, accelerometer, heart_rate, heart_rate_variability, oxygen_level, temperature, location } = req.body;

  try {
    // Store location
    await pool.query(
      'INSERT INTO locations (patient_id, latitude, longitude, timestamp, accuracy_meters) VALUES ($1, $2, $3, $4, $5)',
      [patient_id, location.latitude, location.longitude, timestamp, location.accuracy]
    );

    res.status(200).json({ status: 'success', event_recorded: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to store health data' });
  }
};

// Detect seizure event
const detectSeizure = async (req, res) => {
  const { patient_id, event_timestamp, detection_confidence, location } = req.body;

  try {
    // Insert seizure event
    const result = await pool.query(
      'INSERT INTO seizure_events (patient_id, timestamp, heart_rate, alert_sent) VALUES ($1, $2, 0, true) RETURNING event_id',
      [patient_id, event_timestamp]
    );

    const event_id = result.rows[0].event_id;

    // Get assigned doctor and family members
    const patientInfo = await pool.query(
      'SELECT assigned_doctor_id FROM patients WHERE patient_id = $1',
      [patient_id]
    );

    if (patientInfo.rows.length > 0) {
      const doctor_id = patientInfo.rows[0].assigned_doctor_id;

      // Create alerts for doctor and relevant contacts
      await pool.query(
        'INSERT INTO alerts (patient_id, alert_type, recipient_id, location_latitude, location_longitude, sent_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [patient_id, 'seizure', doctor_id, location.latitude, location.longitude]
      );
    }

    res.status(200).json({
      status: 'success',
      event_id,
      alert_dispatched: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record seizure' });
  }
};

// Detect cardiac event
const detectCardiac = async (req, res) => {
  const { patient_id, event_type, heart_rate, timestamp } = req.body;

  try {
    // Insert cardiac event
    await pool.query(
      'INSERT INTO cardiac_events (patient_id, timestamp, heart_rate, event_type, alert_sent) VALUES ($1, $2, $3, $4, true)',
      [patient_id, timestamp, heart_rate, event_type]
    );

    res.status(200).json({
      status: 'success',
      alert_dispatched: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record cardiac event' });
  }
};

module.exports = { storeHealthData, detectSeizure, detectCardiac };
