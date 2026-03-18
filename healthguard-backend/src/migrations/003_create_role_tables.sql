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

-- Update Prescriptions table to use medicines JSONB instead of medication_name
ALTER TABLE prescriptions DROP COLUMN IF EXISTS medication_name;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medicines JSONB;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_user_id ON pharmacies(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_location ON pharmacies(district, province);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacy_id ON prescriptions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
