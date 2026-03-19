const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/wearable/reading
// Receives sensor data from IoT device
// Body: { user_id, heart_rate, oxygen, temperature }
router.post('/reading', async (req, res) => {
  try {
    const { user_id, heart_rate, oxygen, temperature } = req.body;
    
    console.log('📊 Wearable data received:', {
      user_id,
      heart_rate,
      oxygen,
      temperature,
      timestamp: new Date().toISOString()
    });
    
    // Validate input
    if (!user_id) {
      return res.status(400).json({
        error: 'Missing required field: user_id'
      });
    }
    
    if (heart_rate === undefined && oxygen === undefined && temperature === undefined) {
      return res.status(400).json({
        error: 'At least one sensor reading required: heart_rate, oxygen, or temperature'
      });
    }
    
    // Get patient_id from user_id
    const patientResult = await pool.query(
      'SELECT patient_id FROM patients WHERE user_id = $1',
      [user_id]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        error: `Patient not found for user_id: ${user_id}. Make sure user_id is assigned as a patient.`
      });
    }
    
    const patient_id = patientResult.rows[0].patient_id;
    
    // Store in cardiac_events table
    if (heart_rate !== undefined || oxygen !== undefined) {
      await pool.query(
        `INSERT INTO cardiac_events 
         (patient_id, timestamp, heart_rate, oxygen_level, alert_sent)
         VALUES ($1, NOW(), $2, $3, FALSE)`,
        [patient_id, heart_rate || null, oxygen || null]
      );
      
      console.log(`✓ Cardiac event recorded for patient ${patient_id}: HR=${heart_rate} O2=${oxygen}%`);
    }
    
    // Check thresholds and send alerts
    await checkThresholdsAndAlert(patient_id, heart_rate, oxygen, temperature);
    
    res.status(200).json({
      success: true,
      message: 'Wearable data received and stored successfully',
      patient_id: patient_id,
      data_received: {
        heart_rate: heart_rate || null,
        oxygen: oxygen || null,
        temperature: temperature || null
      }
    });
    
  } catch (err) {
    console.error('❌ Error recording wearable data:', err.message);
    res.status(500).json({ 
      error: 'Failed to process wearable data',
      details: err.message 
    });
  }
});

// Helper function to check thresholds and send alerts
async function checkThresholdsAndAlert(patient_id, hr, o2, temp) {
  try {
    const alerts = [];
    
    // Define thresholds
    if (hr !== undefined && hr !== null) {
      if (hr > 120) {
        alerts.push({
          type: 'HIGH_HEART_RATE',
          severity: 'WARNING',
          value: hr,
          threshold: 120,
          message: `High heart rate detected: ${hr} BPM (normal: 60-100)`
        });
      }
      
      if (hr < 50) {
        alerts.push({
          type: 'LOW_HEART_RATE',
          severity: 'DANGER',
          value: hr,
          threshold: 50,
          message: `Critical: Low heart rate detected: ${hr} BPM`
        });
      }
    }
    
    if (o2 !== undefined && o2 !== null) {
      if (o2 < 90) {
        alerts.push({
          type: 'LOW_OXYGEN',
          severity: 'DANGER',
          value: o2,
          threshold: 90,
          message: `Critical: Low oxygen level: ${o2}% (normal: 95-100%)`
        });
      }
      
      if (o2 < 85) {
        alerts.push({
          type: 'CRITICAL_OXYGEN',
          severity: 'CRITICAL',
          value: o2,
          threshold: 85,
          message: `CRITICAL: Severe oxygen depletion: ${o2}%`
        });
      }
    }
    
    if (temp !== undefined && temp !== null) {
      if (temp > 38) {
        alerts.push({
          type: 'HIGH_TEMPERATURE',
          severity: 'WARNING',
          value: temp,
          threshold: 38,
          message: `Elevated temperature detected: ${temp}°C`
        });
      }
      
      if (temp > 39.5) {
        alerts.push({
          type: 'CRITICAL_TEMPERATURE',
          severity: 'DANGER',
          value: temp,
          threshold: 39.5,
          message: `Danger: Very high temperature: ${temp}°C`
        });
      }
    }
    
    // Send alerts to doctor and family if thresholds exceeded
    if (alerts.length > 0) {
      // Get patient's assigned doctor and emergency contact
      const patientData = await pool.query(
        `SELECT assigned_doctor_id, emergency_contact_id 
         FROM patients WHERE patient_id = $1`,
        [patient_id]
      );
      
      const assigned_doctor_id = patientData.rows[0]?.assigned_doctor_id;
      const emergency_contact_id = patientData.rows[0]?.emergency_contact_id;
      
      // Send alerts to doctor
      if (assigned_doctor_id) {
        for (const alert of alerts) {
          await pool.query(
            `INSERT INTO alerts 
             (patient_id, alert_type, recipient_id, sent_at)
             VALUES ($1, $2, $3, NOW())`,
            [patient_id, alert.type, assigned_doctor_id]
          );
          
          console.log(`⚠️ ALERT: ${alert.message}`);
          console.log(`→ Alert sent to doctor (user_id: ${assigned_doctor_id})`);
        }
      }
      
      // Send alerts to emergency contact (family member)
      if (emergency_contact_id) {
        for (const alert of alerts) {
          await pool.query(
            `INSERT INTO alerts 
             (patient_id, alert_type, recipient_id, sent_at)
             VALUES ($1, $2, $3, NOW())`,
            [patient_id, alert.type, emergency_contact_id]
          );
          
          console.log(`→ Alert sent to family (user_id: ${emergency_contact_id})`);
        }
      }
    }
    
  } catch (err) {
    console.error('Error checking thresholds:', err.message);
  }
}

// GET /api/wearable/latest/:patient_id
// Get latest vitals for a patient
router.get('/latest/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    
    const result = await pool.query(
      `SELECT heart_rate, oxygen_level, temperature, timestamp 
       FROM cardiac_events 
       WHERE patient_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [patient_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No wearable data found for this patient'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (err) {
    console.error('Error fetching latest vitals:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wearable/history/:patient_id
// Get vitals history for last N hours (default: 24)
router.get('/history/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { hours = 24 } = req.query;
    
    const result = await pool.query(
      `SELECT heart_rate, oxygen_level, temperature, timestamp 
       FROM cardiac_events 
       WHERE patient_id = $1 
       AND timestamp > NOW() - INTERVAL '1 hour' * $2
       ORDER BY timestamp DESC`,
      [patient_id, hours]
    );
    
    res.json({
      success: true,
      patient_id: patient_id,
      hours_back: hours,
      reading_count: result.rows.length,
      data: result.rows
    });
    
  } catch (err) {
    console.error('Error fetching vitals history:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wearable/alerts/:patient_id
// Get recent alerts for a patient
router.get('/alerts/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { limit = 10 } = req.query;
    
    const result = await pool.query(
      `SELECT alert_id, alert_type, sent_at, read_at 
       FROM alerts 
       WHERE patient_id = $1 
       ORDER BY sent_at DESC 
       LIMIT $2`,
      [patient_id, limit]
    );
    
    res.json({
      success: true,
      patient_id: patient_id,
      alert_count: result.rows.length,
      data: result.rows
    });
    
  } catch (err) {
    console.error('Error fetching alerts:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
