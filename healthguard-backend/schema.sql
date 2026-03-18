-- Create Users table
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'doctor', 'family_member', 'pharmacy')),
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Patients table
CREATE TABLE patients (
  patient_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(user_id),
  assigned_doctor_id INT REFERENCES users(user_id),
  emergency_contact_id INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Seizure Events table
CREATE TABLE seizure_events (
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
CREATE TABLE cardiac_events (
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
CREATE TABLE prescriptions (
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
CREATE TABLE alerts (
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
CREATE TABLE locations (
  location_id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patients(patient_id),
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  accuracy_meters FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_seizure_events_patient_id ON seizure_events(patient_id);
CREATE INDEX idx_cardiac_events_patient_id ON cardiac_events(patient_id);
CREATE INDEX idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX idx_locations_patient_id ON locations(patient_id);
