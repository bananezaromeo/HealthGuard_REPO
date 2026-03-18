-- Migration: Add assigned_doctor_id column to patients table if it doesn't exist
-- This ensures backward compatibility with existing databases

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS assigned_doctor_id INT REFERENCES users(user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_assigned_doctor_id ON patients(assigned_doctor_id);

-- Verify column was created
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name IN ('assigned_doctor_id', 'patient_id', 'user_id');
