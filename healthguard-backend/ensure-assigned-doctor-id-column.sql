-- Ensure assigned_doctor_id column exists in patients table
-- Run this if you get column errors

ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS assigned_doctor_id INT REFERENCES users(user_id);

-- Verify the column was created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name = 'assigned_doctor_id';
