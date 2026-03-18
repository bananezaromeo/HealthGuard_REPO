-- Update prescriptions table to add missing columns for prescription workflow
-- This migration adds support for prescription status tracking and delivery workflow

-- Add columns if they don't exist
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_latitude FLOAT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_longitude FLOAT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS denied_reason TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS denied_at TIMESTAMP;

-- Add constraint if it doesn't exist (status check)
ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_status_check;
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'delivered'));

-- Add indexes for faster queries if they don't exist
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacy_id ON prescriptions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_prescriptions_approved_at ON prescriptions(approved_at);
