# ⚡ HealthGuard 2FA - Quick Start Checklist

## 🔴 BEFORE YOU BEGIN - Email Setup (5 min)

### 1. Get Gmail App Password
**YouTube**: Search "Gmail App Password" if you need help

```
1. Go to: https://myaccount.google.com/security
2. Click "2-Step Verification" → Complete if needed
3. Back to Security settings
4. Find "App passwords" (bottom of page)
5. Select: Mail + Windows Computer
6. Google generates 16 characters: xxxx xxxx xxxx xxxx
7. Copy this password
```

### 2. Update Backend .env File
**File**: `e:\ML_DISEASE\healthguard-backend\.env`

```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/HealthGuard_DB
JWT_SECRET=your_jwt_secret_key_here_change_this
PORT=5000
NODE_ENV=development

# ✏️ UPDATE THESE TWO LINES:
EMAIL_SERVICE=gmail
EMAIL_USER=your-actual-gmail@gmail.com          # Your Gmail address
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx              # 16-char App Password (with spaces)
```

---

## 🟢 SETUP (10 min)

### Step 1: Install Dependencies
```powershell
cd "e:\ML_DISEASE\healthguard-backend"
npm install
```

### Step 2: Create Database Tables
```powershell
cd "e:\ML_DISEASE\healthguard-backend"
node runMigration.js
```

✅ Should output: "Migration completed successfully!"

### Step 3: Restart Backend
```powershell
npm run dev
```

✅ Should see: "Server running on port 5000"

---

## 🟡 TESTING (10 min)

### Test 1: Signup with OTP
1. Open Flutter app (should still be running)
2. Press 'r' to hot reload
3. Click "Sign Up" button
4. Select Role: **Patient**
5. Fill form:
   - Email: `testyour-email@gmail.com` (use YOUR Gmail)
   - Password: `Test123!@#`
   - Name: `Test User`
   - Phone: `1234567890`
   - Age: `25`
   - Condition: `Testing`
6. Click "Create Account"

### ✅ Expected Result:
- SnackBar: "Registration successful! Check your email for OTP."
- 🎨 Beautiful OTP screen appears
- Fields show: "We sent a 6-digit code to testyour-email@gmail.com"

### Test 2: Check Email for OTP
1. Open **Gmail inbox** in browser
2. Look for email from "HealthGuard"
3. Subject: "HealthGuard - Email Verification OTP"
4. **Note the 6-digit code** (e.g., 5-2-3-8-4-7)
5. *(Check spam folder if not in inbox)*

### Test 3: Enter OTP Code
1. Back to Flutter app
2. 6 digit fields waiting for input
3. Tap first field
4. Type first digit (auto-advances)
5. Type remaining 5 digits
6. Click "Verify Email"

### ✅ Expected Result:
- SnackBar: "Email verified! Please login now."
- Back to Login screen

### Test 4: Login with Verified Account
1. Email: `testyour-email@gmail.com`
2. Password: `Test123!@#`
3. Click "Login"

### ✅ Expected Result:
- SnackBar: "Login successful"
- Redirect to Patient Dashboard

---

## 🎯 Key Files to Know

| Location | Purpose | Edit? |
|----------|---------|-------|
| `.env` | Email config | ✏️ YES - Add credentials |
| `OtpVerificationScreen` | Flutter UI | 🔍 View only |
| `authController.js` | Backend logic | 🔍 View only |
| `app_theme.dart` | Colors/styling | 🔍 View only |

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Failed to send OTP email" | Check `.env` - wrong Gmail credentials |
| Email not received | Check spam folder first |
| "OTP incorrect" or "expired" | Request new OTP with "Resend" button |
| Backend crashes on startup | Run `node runMigration.js` again |
| "Email already registered" | Use different Gmail address |

---

## 📱 What to Show for Project

### Screenshots to Capture:
1. **Signup Screen** - Role selector, form fields
2. **OTP Screen** - 6 beautiful digit fields
3. **Email** - The OTP code email from Gmail
4. **Verification Success** - "Email verified" message
5. **Dashboard** - After successful login

### Code to Highlight:
1. **OTP Screen** - `otp_verification_screen.dart` (beautiful Flutter UI)
2. **Backend Auth** - `authController.js` (security, transactions)
3. **Database** - `001_add_otp_support.sql` (schema design)
4. **Email** - `email.js` (professional HTML template)

---

## ⏱️ Estimated Timeline

| Task | Time | Status |
|------|------|--------|
| Email setup | 5 min | ⏳ DO THIS FIRST |
| Install/migrate | 10 min | ⏳ DO THIS SECOND |
| Test signup flow | 5 min | ⏳ DO THIS THIRD |
| Test login flow | 5 min | ⏳ DO THIS FOURTH |
| **TOTAL** | **25 min** | ✅ One sitting |

---

## 🚀 After Testing Works

Once everything works:

1. **Celebrate!** 🎉 You have 2FA implemented for a medical app
2. **Next**: Design the 4 dashboard screens
3. **Then**: Add patient-doctor features
4. **Finally**: Deploy to Heroku

---

## 📝 Notes

- OTP is valid for 15 minutes
- Each OTP can only be used once
- User must verify email before logging in
- Perfect security feature for final year project
- Shows production-level thinking

---

**🎯 Remember**: 
1. Update `.env` with YOUR Gmail first!
2. Check email spam folder for OTP
3. Each OTP works only once (click Resend for new one)

**Good luck! 🚀**
