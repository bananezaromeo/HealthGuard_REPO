# HealthGuard 2FA - Visual Architecture & Flow Diagrams

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUTTER MOBILE APP                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Login Screen │  │Signup Screen │  │ OTP Verify   │      │
│  │              │  │              │  │   Screen     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           │                               │
│                    ApiService                             │
│         (verifyOtp, resendOtp, login)                     │
└──────────────────────┬────────────────────────────────────┘
                       │ HTTP REST
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  NODE.JS BACKEND                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Auth Router (/api/auth/...)                 │  │
│  │  • /register/patient (POST)                          │  │
│  │  • /register/doctor (POST)                           │  │
│  │  • /register/family (POST)                           │  │
│  │  • /register/pharmacy (POST)                         │  │
│  │  • /verify-otp (POST)     ← NEW                      │  │
│  │  • /resend-otp (POST)     ← NEW                      │  │
│  │  • /login (POST)                                     │  │
│  └─────────────┬────────────────────────────────────────┘  │
│                │                                            │
│        ┌───────▼────────┐                                   │
│        │ Auth Controller│                                   │
│        ├────────────────┤                                   │
│        │ • generateOTP()                                    │
│        │ • verifyOtp()                                      │
│        │ • createUser()                                     │
│        └───────┬────────┘                                   │
│                │                                            │
│        ┌───────▼────────┐                                   │
│        │  Email Service │                                   │
│        │  (Nodemailer)  │                                   │
│        └────────┬───────┘                                   │
│                 │                                           │
│    ┌────────────┼────────────┐                             │
│    │            │            │                             │
│    ▼            ▼            ▼                             │
│  OTP.js      Email.js   Database                           │
│ (Generate)  (Send HTML)  (Store)                           │
└────────────────────────────────────────────────────────────┘
                 │                │
                 │                │
        ┌────────▼────────┐  ┌────▼─────────────┐
        │  GMAIL SMTP     │  │  POSTGRESQL 18  │
        │  (Email Send)   │  │  (Data Storage) │
        └─────────────────┘  └─────────────────┘
```

---

## 🔄 Signup + 2FA Flow (Step-by-Step)

```
USER                  FLUTTER APP              BACKEND              EMAIL            DATABASE
 │                        │                      │                  │                  │
 ├─ Taps Signup ─────────>│                      │                  │                  │
 │                        │                      │                  │                  │
 ├─ Fills Form ─────────>│                      │                  │                  │
 │ (email, password,      │                      │                  │                  │
 │  name, etc)            │                      │                  │                  │
 │                        │                      │                  │                  │
 ├─ Taps Create Account -->│                     │                  │                  │
 │                        │──POST /register/patient──>│             │                  │
 │                        │                      │                  │                  │
 │                        │              1. Check email             │                  │
 │                        │              2. Generate OTP            │                  │
 │                        │              3. Hash password           │                  │
 │                        │                      │                  │                  │
 │                        │              4. Store OTP+Data ─────────────────────────>│
 │                        │                      │                  │   INSERT INTO    │
 │                        │                      │                  │   otp_codes      │
 │                        │                      │──Send Email─────>│                  │
 │                        │                      │                  ├─> SMTP Server   │
 │                        │<─── 201 Created ─────│                  │   (Gmail)        │
 │                        │ { message: "OTP..." } │                  │   📧 Email sent! │
 │                        │                      │                  │                  │
 │<─ Success Message ─────│                      │                  │                  │
 │ "Check email for OTP"  │                      │                  │                  │
 │                        │                      │                  │                  │
 │<─ OTP Screen Shows ────│                      │                  │                  │
 │   "Code sent to..."    │                      │                  │                  │
 │                        │                      │                  │                  │
 │ 📧 User checks Email ──────────────────────────────────────────>│                  │
 │ Sees OTP: 523847       │                      │                  │                  │
 │                        │                      │                  │                  │
 ├─ Enters OTP digits ───>│                      │                  │                  │
 │ 5-2-3-8-4-7           │                      │                  │                  │
 │                        │                      │                  │                  │
 ├─ Taps Verify Email ───>│──POST /verify-otp────>│                  │                  │
 │                        │  { email, otp }       │                  │                  │
 │                        │                      1. Find OTP record │                  │
 │                        │                      2. Check: valid?   │                  │
 │                        │                      3. Check: expired? │                  │
 │                        │                      4. Check: unused?  │                  │
 │                        │                      │                  │                  │
 │                        │           ✅ Valid OTP - START TRANSACTION               │
 │                        │                      │                  │                  │
 │                        │              5. Create User ───────────────────────────>│
 │                        │                 (email_verified=true)   │                  │
 │                        │              6. Create Patient/Doctor/... data          │
 │                        │              7. Mark OTP as used ────────────────────>│
 │                        │                      │                  │   UPDATE        │
 │                        │                      │                  │   otp_codes     │
 │                        │           ✅ COMMIT TRANSACTION         │                  │
 │                        │                      │                  │                  │
 │                        │              8. Generate JWT Token      │                  │
 │                        │<─── 200 OK ─────────│                  │                  │
 │                        │ { token, user_id }   │                  │                  │
 │                        │                      │                  │                  │
 │<─ Success Message ─────│                      │                  │                  │
 │ "Email verified!"      │                      │                  │                  │
 │                        │                      │                  │                  │
 │<─ Screen: Login Page ──│                      │                  │                  │
 │   Ready to login       │                      │                  │                  │
 │                        │                      │                  │                  │
```

---

## 🔐 Login Flow (After 2FA)

```
USER              FLUTTER APP           BACKEND            DATABASE
 │                    │                    │                  │
 ├─ Enter Email ────>│                    │                  │
 │ Enter Password    │                    │                  │
 │                   │                    │                  │
 ├─ Tap Login ──────>│──POST /login────>│                  │
 │                   │  { email, password}│                  │
 │                   │                    ├─Query for user──>│
 │                   │                    │                  ├─Find user
 │                   │                    │<─Return user ───┤
 │                   │                    │                  │
 │                   │            1. Check email_verified?  │
 │                   │            2. Match password?        │
 │                   │                    │                  │
 │                   │    ✅ Both valid                      │
 │                   │                    │                  │
 │                   │            3. Generate JWT Token     │
 │                   │                    │                  │
 │                   │<─── 200 OK ───────│                  │
 │                   │ { token, role }    │                  │
 │                   │                    │                  │
 │<─ Success ────────│                    │                  │
 │ Stored in app     │                    │                  │
 │                   │                    │                  │
 │<─ Redirect to ────│                    │                  │
 │ Patient Dashboard │                    │                  │
 │                   │                    │                  │
```

---

## 📊 Database Schema

```
┌─────────────────────────────────────────────────────────┐
│                      USERS TABLE                         │
├─────────┬──────────────────┬─────────────────────────────┤
│ user_id │ email            │ password_hash               │
│ 1       │ john@gmail.com   │ $2a$10$N9qo8uLO...        │
├─────────┼──────────────────┼─────────────────────────────┤
│ role    │ full_name        │ email_verified (NEW!)       │
│ patient │ John Doe         │ TRUE (after OTP verify)     │
└─────────┴──────────────────┴─────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│               OTP_CODES TABLE (NEW!)                     │
├────────┬────────┬──────────┬──────────┬─────────────────┤
│ otp_id │ email  │ otp_code │ is_used  │ expires_at      │
│ 1      │ john@..│ 523847   │ FALSE    │ 2026-02-12 16:35│
├────────┼────────┼──────────┼──────────┼─────────────────┤
│ created_at       │ registration_data (JSON)              │
│ 2026-02-12 16:20 │ { password_hash, full_name, ... }   │
└────────┴────────┴──────────┴──────────┴─────────────────┘
```

---

## 🔑 Key Decisions

### Why Separate OTP Table?
```
✅ OTP data is temporary (auto-deletes after 15 min)
✅ Registration data stored as JSON (flexible for all roles)
✅ Keeps user table clean (only verified users)
✅ Easy to audit (all OTP attempts logged)
✅ Supports resend without storing multiple passwords
```

### Why `email_verified` Flag?
```
✅ Prevents unverified users from logging in
✅ Can add reminders to unverified users
✅ Audit trail of verified accounts
✅ Supports future features (re-verification)
```

### Why Atomic Transactions?
```
✅ If OTP valid but user creation fails:
   - OTP not marked as used
   - User creation didn't happen
   - Whole operation rolls back
   
✅ No orphaned OTP codes
✅ No partial user records
✅ Data consistency guaranteed
```

---

## 🔐 Security Features Implemented

```
┌──────────────────────────────────────────────────────┐
│           BEFORE Reaching Backend                    │
│  • HTTPS (production deployment)                     │
│  • Flutter app validation                            │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│           At Backend Entry Point                     │
│  • Email format validation                           │
│  • Password complexity check (implicit)              │
│  • Rate limiting (can be added)                      │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│         During Registration (OTP Generate)           │
│  ✅ 6-digit OTP (1 in 1M chance)                     │
│  ✅ 15-min expiration                               │
│  ✅ One-time use enforcement                        │
│  ✅ Registration data in JSON (nested)              │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│         Email Delivery                               │
│  ✅ Gmail app password (safer than main password)    │
│  ✅ HTML email (professional look)                   │
│  ✅ Warnings about code sharing                      │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│         User Enters OTP (Verify)                     │
│  ✅ OTP validation (must match stored)               │
│  ✅ Expiration check                                 │
│  ✅ One-time use check                              │
│  ✅ Atomic transaction (all-or-nothing)              │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│         User Account Created                         │
│  ✅ Password hashed (bcrypt, 10 rounds)              │
│  ✅ email_verified = true flag set                   │
│  ✅ JWT token generated (7-day expiry)               │
│  ✅ OTP marked as used                               │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│         On Login (Subsequent)                        │
│  ✅ Email verified check (must be true)              │
│  ✅ Password comparison (bcrypt.compare)             │
│  ✅ New JWT token issued                             │
│  ✅ No OTP needed (only first time)                  │
└──────────────────────────────────────────────────────┘
```

---

## 📱 Screen Transitions

```
                    LOGIN SCREEN
                         │
                    ┌────┴────┐
                    │          │
                "Sign Up"    "Login"
                    │          │
                    ▼          │
              SIGNUP SCREEN    │
                    │          │
            Choose Role & Fill │
                  Form         │
                    │          │
            ┌───────┴───────┐  │
            ▼               ▼  │
        Patient         Doctor │
        Form           Form    │
            │               │  │
            └───────┬───────┘  │
                    │          │
            Click "Create      │
            Account"           │
                    │          │
                    ▼          │
          OTP VERIFICATION     │
           SCREEN (NEW!)       │
                    │          │
            (6 digit input)     │
                    │          │
            ┌───────┴─────────┐│
            │                 ││
        Correct OTP    Wrong/Expired
            │                 ││
            ▼                 ││
    "Email Verified!"  Resend Button
    Redirect to Login         │
            │                 │
            └────────┬────────┘
                     │
                     ▼
              LOGIN SCREEN
          (with verified email)
                     │
           Click "Login"
                     │
                     ▼
         PATIENT/DOCTOR/FAMILY/
          PHARMACY DASHBOARD
```

---

## 💡 Best Practices Applied

```
SECURITY
  ✅ Defense in depth (multiple verification layers)
  ✅ Never store plain passwords
  ✅ Time-limited OTP codes
  ✅ One-time use enforcement
  ✅ Rate limiting friendly (code in place)

CODE QUALITY
  ✅ Atomic transactions (no partial updates)
  ✅ Comprehensive error handling
  ✅ Clear, descriptive error messages
  ✅ Modular code (separate files for OTP, Email)
  ✅ Well-commented functions

UX/UI DESIGN
  ✅ Beautiful, professional screens
  ✅ Auto-advancing input fields
  ✅ Resend countdown timer
  ✅ Helpful error messages
  ✅ Loading states
  ✅ Success notifications

DATABASE DESIGN
  ✅ Normalized tables
  ✅ Proper indexes on lookup columns
  ✅ JSON storage for flexible data
  ✅ Referential integrity
  ✅ Audit trail ready
```

---

**Diagram Legend:**
```
─────> Process flow/data flow
  │    Continuation
  ▼    Next step
  └┐   Decision fork
```

**Color Coding:**
- ✅ Implemented & working
- ⏳ To be implemented
- ⚠️  Needs attention
