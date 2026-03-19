const express = require('express');
const cors = require('cors');

// Load .env only in development, not in production
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const authRoutes = require('./routes/authRoutes');
const wearableRoutes = require('./routes/wearableRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const familyRoutes = require('./routes/familyRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const pool = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database schema
async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');
    
    // Ensure assigned_doctor_id column exists
    await pool.query(
      `ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS assigned_doctor_id INT REFERENCES users(user_id);`
    );
    console.log('✓ assigned_doctor_id column ensured');
    
    // Create index for faster lookups
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_patients_assigned_doctor_id ON patients(assigned_doctor_id);`
    );
    console.log('✓ Index created for assigned_doctor_id');

    // Update prescriptions table to add missing columns for prescription workflow
    console.log('Updating prescriptions table...');
    await pool.query(
      `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;`
    );
    await pool.query(
      `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_latitude FLOAT;`
    );
    await pool.query(
      `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_longitude FLOAT;`
    );
    await pool.query(
      `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS denied_reason TEXT;`
    );
    await pool.query(
      `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS denied_at TIMESTAMP;`
    );
    
    // Add constraint for status values
    await pool.query(
      `ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_status_check;`
    );
    await pool.query(
      `ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'delivered'));`
    );
    
    // Create indexes for prescription queries
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);',
      'CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);',
      'CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacy_id ON prescriptions(pharmacy_id);',
      'CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);',
      'CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_prescriptions_approved_at ON prescriptions(approved_at);'
    ];
    
    for (const index of indexes) {
      await pool.query(index);
    }
    console.log('✓ Prescriptions table updated with status tracking columns');
    
  } catch (err) {
    console.error('Warning: Database initialization error:', err.message);
    // Don't stop server, just log warning
  }
}

// Initialize database on startup
initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wearable', wearableRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/prescription', prescriptionRoutes);
app.use('/api/pharmacy', pharmacyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'HealthGuard Backend Running' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`HealthGuard Backend running on port ${PORT}`);
});
