-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'doctor', 'family_member', 'pharmacy')),
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Patients table
CREATE TABLE IF NOT EXISTS patients (
  patient_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(user_id),
  assigned_doctor_id INT REFERENCES users(user_id),
  emergency_contact_id INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Seizure Events table
CREATE TABLE IF NOT EXISTS seizure_events (
  event_id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patients(patient_id),
  timestamp TIMESTAMP NOT NULL,
  accelerometer_x FLOAT,
  accelerometer_y FLOAT,
  accelerometer_z FLOAT,
  heart_rate INT,
  oxygen_level FLOAT,
  temperature FLOAT,
  location_latitude FLOAT,
  location_longitude FLOAT,
  alert_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Cardiac Events table
CREATE TABLE IF NOT EXISTS cardiac_events (
  event_id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patients(patient_id),
  timestamp TIMESTAMP NOT NULL,
  heart_rate INT,
  heart_rate_variability INT,
  oxygen_level FLOAT,
  event_type VARCHAR(100),
  alert_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  prescription_id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES users(user_id),
  patient_id INT NOT NULL REFERENCES patients(patient_id),
  pharmacy_id INT NOT NULL REFERENCES users(user_id),
  medicines JSONB NOT NULL,
  instructions TEXT,
  patient_latitude FLOAT,
  patient_longitude FLOAT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delivered')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  delivered_at TIMESTAMP,
  denied_reason TEXT,
  denied_at TIMESTAMP
);

-- Create Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  alert_id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patients(patient_id),
  alert_type VARCHAR(50) NOT NULL,
  recipient_id INT NOT NULL REFERENCES users(user_id),
  location_latitude FLOAT,
  location_longitude FLOAT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- Create Locations table
CREATE TABLE IF NOT EXISTS locations (
  location_id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patients(patient_id),
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  accuracy_meters FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  doctor_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(user_id),
  specialization VARCHAR(255),
  license_number VARCHAR(100),
  hospital_clinic VARCHAR(255),
  verification_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Family Members table
CREATE TABLE IF NOT EXISTS family_members (
  family_member_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(user_id),
  family_head_id INT REFERENCES users(user_id),
  relationship VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Pharmacies table
CREATE TABLE IF NOT EXISTS pharmacies (
  pharmacy_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(user_id),
  pharmacy_name VARCHAR(255) NOT NULL,
  province VARCHAR(100),
  district VARCHAR(100),
  city_sector VARCHAR(100),
  contact_name VARCHAR(255),
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_seizure_events_patient_id ON seizure_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_cardiac_events_patient_id ON cardiac_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_locations_patient_id ON locations(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_user_id ON pharmacies(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_location ON pharmacies(district, province);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacy_id ON prescriptions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
