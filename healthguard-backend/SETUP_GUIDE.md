# HealthGuard Backend - Setup Guide

## Authentication System Ready ✅

All 4 stakeholder authentication endpoints are implemented:
- **Patient**: Basic registration + medical info
- **Doctor**: License upload + verification
- **Family Member**: Relationship tracking
- **Pharmacy**: GPS location tracking

## Database Setup (Choose One)

### Option A: Supabase (Recommended - Cloud)
1. Go to https://supabase.com and create account
2. Create new project
3. In SQL Editor, run this:

```sql
-- Create users table
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create patients table
CREATE TABLE patients (
  patient_id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(user_id),
  age INT,
  medical_condition VARCHAR(255)
);

-- Create doctors table
CREATE TABLE doctors (
  doctor_id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(user_id),
  license_number VARCHAR(100) UNIQUE NOT NULL,
  license_document VARCHAR(255),
  verification_status VARCHAR(50)
);

-- Create family_members table
CREATE TABLE family_members (
  family_id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(user_id),
  relationship VARCHAR(50) NOT NULL
);

-- Create pharmacies table
CREATE TABLE pharmacies (
  pharmacy_id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(user_id),
  pharmacy_name VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8)
);

-- Create seizure_events table
CREATE TABLE seizure_events (
  event_id SERIAL PRIMARY KEY,
  patient_id INT REFERENCES patients(patient_id),
  accelerometer_x DECIMAL(10, 6),
  accelerometer_y DECIMAL(10, 6),
  accelerometer_z DECIMAL(10, 6),
  severity INT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create cardiac_events table
CREATE TABLE cardiac_events (
  event_id SERIAL PRIMARY KEY,
  patient_id INT REFERENCES patients(patient_id),
  heart_rate INT,
  blood_oxygen INT,
  ecg_data VARCHAR(1000),
  timestamp TIMESTAMP DEFAULT NOW()
);
```

4. Copy connection string from Supabase:
   - Settings → Database → Connection Pooler → URI (Node.js)
5. Update `.env`:
   ```
   DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
   ```

### Option B: Local PostgreSQL
```powershell
# Create database
createdb healthguard

# Connect and run schema
psql -U postgres -d healthguard -f schema.sql
```

Update `.env`:
```
DATABASE_URL=postgresql://postgres:[password]@localhost:5432/healthguard
```

## Test Authentication Endpoints

Server running on http://localhost:5000

### 1. Register Patient
```bash
curl -X POST http://localhost:5000/api/auth/register/patient \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "SecurePass123!",
    "full_name": "John Doe",
    "phone_number": "1234567890",
    "age": 35,
    "medical_condition": "Epilepsy"
  }'
```

### 2. Register Doctor
```bash
curl -X POST http://localhost:5000/api/auth/register/doctor \
  -H "Content-Type: multipart/form-data" \
  -F "email=doctor@example.com" \
  -F "password=SecurePass123!" \
  -F "full_name=Dr. Smith" \
  -F "phone_number=9876543210" \
  -F "license_number=MD12345" \
  -F "license_document=@/path/to/license.pdf"
```

### 3. Register Family Member
```bash
curl -X POST http://localhost:5000/api/auth/register/family \
  -H "Content-Type: application/json" \
  -d '{
    "email": "family@example.com",
    "password": "SecurePass123!",
    "full_name": "Jane Doe",
    "phone_number": "5555555555",
    "relationship": "mother"
  }'
```

### 4. Register Pharmacy
```bash
curl -X POST http://localhost:5000/api/auth/register/pharmacy \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pharmacy@example.com",
    "password": "SecurePass123!",
    "pharmacy_name": "City Pharmacy",
    "phone_number": "4444444444",
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

### 5. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "SecurePass123!"
  }'
```

Response includes JWT token for authorized requests.

## Environment Variables
```
DATABASE_URL=your_supabase_or_postgres_connection_string
JWT_SECRET=your_secret_key_here
PORT=5000
NODE_ENV=development
```

## Next Steps
- Doctor: `/api/doctor/assigned-patients`
- Patient: `/api/patient/profile`, `/api/patient/assign-family`
- Pharmacy: `/api/pharmacy/pending-prescriptions`
- Wearable: `/api/wearable/health-data`
