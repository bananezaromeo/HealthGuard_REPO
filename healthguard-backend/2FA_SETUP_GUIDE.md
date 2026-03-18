# HealthGuard 2FA (Two-Factor Authentication) Setup Guide

## 🎯 What's Been Implemented

### Frontend (Flutter)
✅ **OTP Verification Screen** - Beautiful 6-digit OTP input screen  
✅ **Signup Flow Integration** - Redirects to OTP screen after signup  
✅ **API Service** - Added `verifyOtp()` and `resendOtp()` methods  
✅ **Routes** - Ready for OTP verification screen

### Backend (Node.js)
✅ **OTP Utilities** - OTP generation & expiration (15 minutes)  
✅ **Email Service** - Nodemailer setup for sending OTP emails  
✅ **Database Schema** - `otp_codes` table + `email_verified` column  
✅ **Auth Controller** - Updated all registrations to use OTP flow  
✅ **Routes** - POST `/verify-otp` and POST `/resend-otp` endpoints  
✅ **Transaction Safety** - Atomic user creation after OTP verification  

---

## 🚀 Setup Instructions

### Step 1: Configure Email Service (Gmail)

This uses **Gmail SMTP** with App Passwords. For production, you'd use your email service provider.

#### 1.1 Get Gmail App Password
1. Go to: https://myaccount.google.com/security
2. Enable 2-Step Verification (if not already enabled)
3. Generate **App Password** for "Mail" on "Windows Computer"
4. Copy the 16-character password

#### 1.2 Update .env File
```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/HealthGuard_DB
JWT_SECRET=your_jwt_secret_key_here_change_this
PORT=5000
NODE_ENV=development

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

Replace:
- `your-email@gmail.com` - Your Gmail address
- `xxxx xxxx xxxx xxxx` - The 16-character App Password (with spaces as generated)

---

### Step 2: Install Dependencies

```powershell
cd "e:\ML_DISEASE\healthguard-backend"
npm install
```

This will install **nodemailer** and all required packages.

---

### Step 3: Run Database Migration

```powershell
cd "e:\ML_DISEASE\healthguard-backend"
node runMigration.js
```

✅ This creates:
- `otp_codes` table with OTP storage
- `email_verified` column in `users` table
- Indexes for fast lookups

---

### Step 4: Restart Backend Server

```powershell
cd "e:\ML_DISEASE\healthguard-backend"
npm run dev
```

Or if already running:
- Stop the server (Ctrl+C)
- Run `npm run dev` again

---

## 🔄 Complete 2FA Flow

### User Signup Flow:
```
1. User fills signup form
   ↓
2. Clicks "Create Account"
   ↓
3. Backend generates 6-digit OTP
   ↓
4. OTP sent to user email
   ↓
5. Flutter app redirects to OTP screen
   ↓
6. User enters 6 digits (auto-advance between fields)
   ↓
7. Click "Verify Email"
   ↓
8. Backend validates OTP
   ↓
9. User created with email_verified = true
   ↓
10. JWT token returned
   ↓
11. Redirect to Login screen
```

### User Login Flow:
```
1. User enters email & password
   ↓
2. Backend checks email_verified status
   ↓
3. If NOT verified → Error message to verify email
   ↓
4. If verified → Check password match
   ↓
5. If match → Return JWT token
   ↓
6. Redirect to appropriate dashboard
```

---

## 🧪 Testing the Flow

### 1. Test Signup with OTP
```powershell
# Using Invoke-WebRequest
$body = @{
    email = "testuser@gmail.com"
    password = "SecurePass123!"
    full_name = "Test User"
    phone_number = "1234567890"
    age = 25
    medical_condition = "Asthma"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register/patient" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

✅ Response: OTP sent to email

### 2. Check Email for OTP
- Check your Gmail inbox (check spam folder too)
- Look for email from "HealthGuard"
- Note the 6-digit OTP

### 3. Test OTP Verification
```powershell
$body = @{
    email = "testuser@gmail.com"
    otp = "123456"  # Use actual OTP from email
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/verify-otp" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

✅ Response: User created, JWT token returned

### 4. Test Login
```powershell
$body = @{
    email = "testuser@gmail.com"
    password = "SecurePass123!"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

✅ Response: Login successful, JWT token returned

### 5. Test OTP Resend
```powershell
$body = @{
    email = "testuser@gmail.com"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/resend-otp" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

✅ Response: New OTP sent to email

---

## 📱 Testing on Flutter App

### Step 1: Hot Reload the App
In Flutter terminal, press:
```
r  (for hot reload)
```

### Step 2: Navigate to Signup
Click "Sign Up" on Login screen

### Step 3: Fill Signup Form
- Select role (Patient, Doctor, Family, Pharmacy)
- Fill in required fields
- Click "Create Account"

### Step 4: OTP Screen Appears
- Beautiful 6-digit input screen
- Each field auto-advances
- Shows email for verification

### Step 5: Enter OTP from Email
- Check Gmail for OTP (it's in the email)
- Enter 6 digits
- Click "Verify Email"

### Step 6: Success!
- Message: "Email verified! Please login now."
- Redirects to Login screen
- Can now login with verified email

---

## 🔑 Key Features

✅ **6-Digit OTP** - Secure one-time password
✅ **15-Minute Expiration** - OTP expires after 15 minutes
✅ **Resend OTP** - User can request new OTP if expired
✅ **Email Validation** - Ensures email ownership
✅ **Atomic Transactions** - User only created after OTP verification
✅ **Beautiful UI** - Professional medical theme
✅ **Error Handling** - Clear messages for all scenarios
✅ **Rate Limiting Ready** - Can add rate limiting to resend endpoint

---

## ⚠️ Email Configuration Notes

### For Production:
- Use AWS SES, SendGrid, or Mailgun instead of Gmail
- Set up DKIM/SPF records for authentication
- Implement rate limiting on resend OTP
- Add email templates (currently in html format)

### For Development/Testing:
- Gmail works perfectly for testing
- App Passwords are more secure than actual password
- Emails appear in inbox within seconds
- Great for final year project submission

---

## 🐛 Troubleshooting

**Problem**: Email not sending
- **Solution**: Check .env has correct EMAIL_USER and EMAIL_PASSWORD
- **Check**: EMAIL_PASSWORD must be App Password, not main password

**Problem**: OTP expired before entering
- **Solution**: OTP is valid for 15 minutes. Click "Resend" to get new OTP
- **Check**: Email might be in spam folder

**Problem**: "Email already registered"
- **Solution**: Use different email address or delete user from database

**Problem**: Backend crashes on migration
- **Solution**: Check PostgreSQL is running
- **Solution**: Run migration again: `node runMigration.js`

---

## 📚 API Endpoints

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/auth/register/patient` | {email, password, full_name, phone_number, age, medical_condition} | OTP sent |
| POST | `/api/auth/register/doctor` | {email, password, full_name, phone_number, license_number} | OTP sent |
| POST | `/api/auth/register/family` | {email, password, full_name, phone_number, relationship} | OTP sent |
| POST | `/api/auth/register/pharmacy` | {email, password, pharmacy_name, phone_number, province, district} | OTP sent |
| POST | `/api/auth/verify-otp` | {email, otp} | User created, JWT token |
| POST | `/api/auth/resend-otp` | {email} | New OTP sent |
| POST | `/api/auth/login` | {email, password} | JWT token (if email_verified) |

---

## ✨ Next Steps

After 2FA is working:
1. ✅ Test complete signup/login flow
2. ⏳ Design Dashboard screens
3. ⏳ Implement dashboard features
4. ⏳ Add patient-doctor relationships
5. ⏳ Implement prescription workflow
6. ⏳ Add alert/notification system
7. ⏳ Deploy to production

---

**Created:** February 12, 2026  
**For:** HealthGuard Medical Monitoring System  
**Status:** 🟢 Ready for Testing
