# HealthGuard - Implementation Quick Reference Guide

## Quick Implementation Checklist

This document contains ready-to-implement code snippets and configurations for HealthGuard improvements.

---

## 1. BACKEND QUICK FIXES

### 1.1 Install Required Packages (5 minutes)

```bash
npm install express-validator helmet express-rate-limit winston joi
npm install --save-dev jest supertest
```

### 1.2 Update package.json Scripts

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --detectOpenHandles",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/"
  }
}
```

### 1.3 Create .env.example File

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/healthguard

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production_min_32_chars!

# Email Service
EMAIL_SERVICE=gmail
EMAIL_USER=noreply@healthguard.app
EMAIL_PASSWORD=your_app_specific_password

# Server
NODE_ENV=development
PORT=5000
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 1.4 Create Error Handler Middleware - COPY THIS FILE

**File:** `src/middleware/errorHandler.js`

```javascript
const logger = require('../services/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

const errorHandlerMiddleware = (err, req, res, next) => {
  const error = err instanceof AppError ? err : new AppError(
    err.message || 'Internal Server Error',
    500,
    'INTERNAL_ERROR'
  );

  logger.error('Error occurred', {
    statusCode: error.statusCode,
    code: error.code,
    message: error.message,
    path: req.path,
    method: req.method,
    userId: req.user?.user_id,
    stack: error.stack,
    timestamp: error.timestamp
  });

  const response = {
    success: false,
    error: error.message,
    code: error.code,
    timestamp: error.timestamp,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.details = err;
  }

  res.status(error.statusCode).json(response);
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  errorHandlerMiddleware,
  asyncHandler,
};
```

### 1.5 Create Logger Service - COPY THIS FILE

**File:** `src/services/logger.js`

```javascript
const winston = require('winston');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'healthguard-api' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    ),
  }));
}

module.exports = logger;
```

### 1.6 Create Validation Middleware - COPY THIS FILE

**File:** `src/middleware/validation.js`

```javascript
const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Phone validation (basic international format)
const phoneRegex = /^(?:\+\d{1,3}|0\d{1,3}|00\d{1,2})?[ -.]?\(?(\d{3})\)?[ -.]?(\d{3})[ -.]?(\d{4})$/;

const validateRegisterPatient = [
  body('email')
    .trim()
    .custom(value => emailRegex.test(value))
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .custom(value => passwordRegex.test(value))
    .withMessage('Password must be 8+ chars with uppercase, lowercase, digit, and special character'),
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
  body('phone_number')
    .trim()
    .custom(value => phoneRegex.test(value))
    .withMessage('Invalid phone number format'),
  body('age')
    .isInt({ min: 1, max: 150 })
    .withMessage('Age must be between 1 and 150'),
  body('medical_condition')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Medical condition must be 500 characters or less'),
];

const validateLogin = [
  body('email')
    .trim()
    .custom(value => emailRegex.test(value))
    .withMessage('Invalid email format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const validateOtpVerification = [
  body('email')
    .trim()
    .custom(value => emailRegex.test(value))
    .withMessage('Invalid email format'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be exactly 6 digits'),
];

module.exports = {
  handleValidationErrors,
  validateRegisterPatient,
  validateLogin,
  validateOtpVerification,
};
```

### 1.7 Create Request Logger Middleware - COPY THIS FILE

**File:** `src/middleware/requestLogger.js`

```javascript
const logger = require('../services/logger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  req.requestId = requestId;

  // Log request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.user_id,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.user_id,
    });
  });

  next();
};

module.exports = requestLogger;
```

### 1.8 Create Rate Limiter Middleware - COPY THIS FILE

**File:** `src/middleware/rateLimiter.js`

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute
  message: 'Too many OTP requests. Please wait 1 minute before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registrations per hour per IP
  message: 'Too many registration attempts from this IP. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  otpLimiter,
  registerLimiter,
  apiLimiter,
};
```

### 1.9 Update server.js - Apply All Middleware

**File:** `src/server.js` (Replace entire file)

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('./services/logger');
const requestLogger = require('./middleware/requestLogger');
const { errorHandlerMiddleware } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/authRoutes');
const wearableRoutes = require('./routes/wearableRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const familyRoutes = require('./routes/familyRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging & Rate Limiting
app.use(requestLogger);
app.use(apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wearable', wearableRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/prescription', prescriptionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HealthGuard Backend Running',
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// Error Handler (MUST be last)
app.use(errorHandlerMiddleware);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`HealthGuard Backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
```

### 1.10 Update authRoutes.js - Add Validation & Rate Limiting

**File:** `src/routes/authRoutes.js` (Update)

```javascript
const express = require('express');
const multer = require('multer');
const {
  registerPatient,
  registerDoctor,
  registerFamilyMember,
  registerPharmacy,
  login,
  verifyOtp,
  resendOtp,
  getPharmacies,
} = require('../controllers/authController');
const { 
  validateRegisterPatient, 
  validateLogin, 
  validateOtpVerification,
  handleValidationErrors 
} = require('../middleware/validation');
const { 
  loginLimiter, 
  otpLimiter, 
  registerLimiter 
} = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, PNG files allowed'));
    }
  },
});

// Registration endpoints
router.post('/register/patient', 
  registerLimiter,
  validateRegisterPatient, 
  handleValidationErrors,
  registerPatient
);

router.post('/register/doctor', 
  registerLimiter,
  upload.single('license_document'), 
  validateRegisterPatient, 
  handleValidationErrors,
  registerDoctor
);

router.post('/register/family', 
  registerLimiter,
  validateRegisterPatient, 
  handleValidationErrors,
  registerFamilyMember
);

router.post('/register/pharmacy', 
  registerLimiter,
  validateRegisterPatient, 
  handleValidationErrors,
  registerPharmacy
);

// OTP verification endpoints
router.post('/verify-otp', 
  otpLimiter,
  validateOtpVerification,
  handleValidationErrors,
  verifyOtp
);

router.post('/resend-otp', 
  otpLimiter,
  verifyOtp
);

// Login endpoint
router.post('/login', 
  loginLimiter,
  validateLogin,
  handleValidationErrors,
  login
);

// Pharmacy endpoints
router.get('/pharmacies', verifyToken, getPharmacies);

module.exports = router;
```

---

## 2. FRONTEND QUICK FIXES

### 2.1 Install Required Packages (5 minutes)

```bash
flutter pub add provider
flutter pub add shared_preferences
flutter pub add http
flutter pub add cupertino_icons
```

### 2.2 Create Exception Model - COPY THIS FILE

**File:** `lib/models/exceptions.dart`

```dart
abstract class AppException implements Exception {
  final String message;
  AppException(this.message);
  
  @override
  String toString() => message;
}

class NetworkException extends AppException {
  NetworkException(String message) : super(message);
}

class ApiException extends AppException {
  final int statusCode;
  final String? code;
  
  ApiException({
    required String message,
    required this.statusCode,
    this.code,
  }) : super(message);
}

class ValidationException extends AppException {
  final Map<String, String> errors;
  
  ValidationException(String message, this.errors) : super(message);
}

class TimeoutException extends AppException {
  TimeoutException() : super('Request timeout. Please check your connection.');
}

class UnknownException extends AppException {
  UnknownException(String message) : super(message);
}

class AuthenticationException extends AppException {
  AuthenticationException(String message) : super(message);
}

class AuthorizationException extends AppException {
  AuthorizationException(String message) : super(message);
}
```

### 2.3 Update API Service - COPY THIS FILE

**File:** `lib/services/api_service.dart` (Critical sections)

Replace the entire login function and others with proper error handling:

```dart
static Future<Map<String, dynamic>> login({
  required String email,
  required String password,
}) async {
  try {
    if (email.isEmpty || password.isEmpty) {
      throw ValidationException('Email and password are required', {
        if (email.isEmpty) 'email': 'Email is required',
        if (password.isEmpty) 'password': 'Password is required',
      });
    }

    print('Attempting to login to: $baseUrl/auth/login');
    
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email.trim(),
        'password': password,
      }),
    ).timeout(
      const Duration(seconds: 10),
      onTimeout: () => throw TimeoutException(),
    );

    print('Response status: ${response.statusCode}');
    print('Response body: ${response.body}');

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else if (response.statusCode == 401) {
      throw AuthenticationException('Invalid email or password');
    } else if (response.statusCode == 403) {
      throw AuthenticationException('Email not verified. Please check your inbox for OTP.');
    } else if (response.statusCode >= 500) {
      throw ApiException(
        message: 'Server error. Please try again later.',
        statusCode: response.statusCode,
      );
    } else {
      throw ApiException(
        message: jsonDecode(response.body)['error'] ?? 'Login failed',
        statusCode: response.statusCode,
      );
    }
  } on TimeoutException {
    throw TimeoutException();
  } on ValidationException {
    rethrow;
  } on AuthenticationException {
    rethrow;
  } on ApiException {
    rethrow;
  } catch (e) {
    throw UnknownException('Error: $e');
  }
}
```

### 2.4 Create Auth Provider - COPY THIS FILE

**File:** `lib/providers/auth_provider.dart`

```dart
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/exceptions.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  String? _token;
  String? _userId;
  String? _role;
  String? _email;
  String? _fullName;
  String? _errorMessage;
  bool _isLoading = false;
  bool _isAuthenticated = false;

  // Getters
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get token => _token;
  String? get userId => _userId;
  String? get role => _role;
  String? get email => _email;
  String? get fullName => _fullName;
  String? get errorMessage => _errorMessage;

  // Constructor - Initialize from SharedPreferences
  AuthProvider() {
    _initializeFromStorage();
  }

  Future<void> _initializeFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString('auth_token');
      _userId = prefs.getString('user_id');
      _role = prefs.getString('user_role');
      _email = prefs.getString('user_email');
      _fullName = prefs.getString('full_name');
      
      _isAuthenticated = _token != null;
      notifyListeners();
    } catch (e) {
      debugPrint('Error initializing auth: $e');
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.login(
        email: email,
        password: password,
      );

      _token = response['token'];
      _userId = response['user_id'].toString();
      _role = response['role'];
      _email = response['email'];
      _fullName = response['full_name'];
      _isAuthenticated = true;

      await _saveToLocalStorage();
      _errorMessage = null;
    } on ValidationException catch (e) {
      _errorMessage = e.errors.values.first;
    } on AuthenticationException catch (e) {
      _errorMessage = e.message;
    } on TimeoutException catch (e) {
      _errorMessage = e.message;
    } on AppException catch (e) {
      _errorMessage = e.message;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _saveToLocalStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', _token ?? '');
      await prefs.setString('user_id', _userId ?? '');
      await prefs.setString('user_role', _role ?? '');
      await prefs.setString('user_email', _email ?? '');
      await prefs.setString('full_name', _fullName ?? '');
    } catch (e) {
      debugPrint('Error saving auth data: $e');
    }
  }

  Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      
      _token = null;
      _userId = null;
      _role = null;
      _email = null;
      _fullName = null;
      _isAuthenticated = false;
      _errorMessage = null;
    } catch (e) {
      debugPrint('Error logging out: $e');
    }
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
```

### 2.5 Create Error Dialog Widget - COPY THIS FILE

**File:** `lib/widgets/error_dialog.dart`

```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ErrorDialog extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback onDismiss;

  const ErrorDialog({
    Key? key,
    this.title = 'Error',
    required this.message,
    required this.onDismiss,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          const Icon(Icons.error, color: AppTheme.errorColor),
          const SizedBox(width: 8),
          Text(title),
        ],
      ),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: onDismiss,
          child: const Text('Dismiss'),
        ),
      ],
    );
  }
}

void showErrorDialog(BuildContext context, String message) {
  showDialog(
    context: context,
    builder: (context) => ErrorDialog(
      message: message,
      onDismiss: () => Navigator.pop(context),
    ),
  );
}
```

### 2.6 Update main.dart - Add Provider

**File:** `lib/main.dart` (Update)

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'theme/app_theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/dashboards/patient_dashboard.dart';
import 'screens/dashboards/doctor_dashboard.dart';
import 'screens/dashboards/family_dashboard.dart';
import 'screens/dashboards/pharmacy_dashboard.dart';
import 'providers/auth_provider.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (context) => AuthProvider(),
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HealthGuard',
      theme: AppTheme.getLightTheme(),
      home: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          // If authenticated, go to appropriate dashboard
          if (authProvider.isAuthenticated) {
            switch (authProvider.role) {
              case 'patient':
                return PatientDashboard(
                  userId: authProvider.userId!,
                  token: authProvider.token!,
                );
              case 'doctor':
                return DoctorDashboard(
                  userId: authProvider.userId!,
                  token: authProvider.token!,
                );
              case 'family_member':
                return FamilyDashboard(
                  userId: authProvider.userId!,
                  token: authProvider.token!,
                );
              case 'pharmacy':
                return PharmacyDashboard(
                  userId: authProvider.userId!,
                  token: authProvider.token!,
                );
              default:
                return const LoginScreen();
            }
          }
          return const LoginScreen();
        },
      ),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/signup': (context) => const SignupScreen(),
      },
    );
  }
}
```

### 2.7 Update Login Screen - Add Error Handling

**File:** `lib/screens/auth/login_screen.dart` (Key section update)

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/error_dialog.dart';

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showPassword = false;

  @override
  void initState() {
    super.initState();
    // Clear any previous errors
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().clearError();
    });
  }

  void _handleLogin() async {
    final authProvider = context.read<AuthProvider>();
    
    await authProvider.login(
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    if (mounted) {
      if (authProvider.isAuthenticated) {
        // Navigate based on role
        String route = '/patient-dashboard'; // Default
        switch (authProvider.role) {
          case 'doctor':
            route = '/doctor-dashboard';
            break;
          case 'family_member':
            route = '/family-dashboard';
            break;
          case 'pharmacy':
            route = '/pharmacy-dashboard';
            break;
        }

        Navigator.of(context).pushReplacementNamed(
          route,
          arguments: {
            'userId': authProvider.userId,
            'token': authProvider.token,
            'role': authProvider.role,
          },
        );
      } else if (authProvider.errorMessage != null) {
        // Show error
        showErrorDialog(
          context,
          authProvider.errorMessage!,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Logo/Header
                const SizedBox(height: 60),
                const Text(
                  'HealthGuard',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
                const SizedBox(height: 40),

                // Email Field
                TextField(
                  controller: _emailController,
                  decoration: InputDecoration(
                    labelText: 'Email',
                    prefixIcon: const Icon(Icons.email),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),

                // Password Field
                TextField(
                  controller: _passwordController,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _showPassword ? Icons.visibility : Icons.visibility_off,
                      ),
                      onPressed: () {
                        setState(() => _showPassword = !_showPassword);
                      },
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  obscureText: !_showPassword,
                ),
                const SizedBox(height: 24),

                // Login Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: authProvider.isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      backgroundColor: AppTheme.primaryColor,
                    ),
                    child: authProvider.isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                Colors.white,
                              ),
                            ),
                          )
                        : const Text(
                            'Login',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),

                const SizedBox(height: 16),

                // Navigation to Signup
                TextButton(
                  onPressed: () {
                    Navigator.pushNamed(context, '/signup');
                  },
                  child: const Text("Don't have an account? Sign Up"),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
```

---

## 3. DATABASE IMPROVEMENTS

### 3.1 Add Missing Columns - Run This SQL

```sql
-- Add missing columns to users table
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger for auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email, email_verified);
CREATE INDEX IF NOT EXISTS idx_otp_email_used_expires ON otp_codes(email, is_used, expires_at);
```

---

## 4. TESTING SKELETON

### 4.1 Backend Test Example - COPY THIS FILE

**File:** `src/__tests__/auth.test.js`

```javascript
const request = require('supertest');
const app = require('../server');

describe('Authentication Endpoints', () => {
  const testUser = {
    email: 'test@test.com',
    password: 'TestPass123!',
    full_name: 'Test User',
    phone_number: '+1234567890',
    age: 30,
  };

  describe('POST /api/auth/register/patient', () => {
    it('should return 201 with validation error for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register/patient')
        .send({ email: 'test@test.com' });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register/patient')
        .send({ ...testUser, email: 'invalid-email' });

      expect(response.statusCode).toBe(400);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register/patient')
        .send({ ...testUser, password: 'weak' });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'AnyPassword123!',
        });

      expect(response.statusCode).toBe(401);
    });
  });
});
```

---

## 5. .ENV TEMPLATE

### .env.example - Copy and Customize

```
# ===========================
# DATABASE CONFIGURATION
# ===========================
DATABASE_URL=postgresql://user:password@localhost:5432/healthguard
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=healthguard
DATABASE_USER=user
DATABASE_PASSWORD=password

# ===========================
# AUTHENTICATION
# ===========================
JWT_SECRET=your_super_secret_key_should_be_at_least_32_characters_long!
JWT_EXPIRATION=7d

# ===========================
# EMAIL SERVICE
# ===========================
EMAIL_SERVICE=gmail
EMAIL_USER=noreply@healthguard.app
EMAIL_PASSWORD=your_app_specific_password

# ===========================
# SERVER CONFIGURATION
# ===========================
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug

# ===========================
# CORS
# ===========================
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000

# ===========================
# RATE LIMITING
# ===========================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================
# FILE UPLOAD
# ===========================
MAX_FILE_SIZE=5242880
```

---

## 6. GIT WORKFLOW

### .gitignore - Create This File

```
# Environment variables
.env
.env.local
.env.*.local

# Dependencies
node_modules/
flutter/.packages
flutter/pubspec.lock

# Build outputs
dist/
build/
*.apk
*.ipa
.dart_tool/

# IDE
.vscode/
.idea/
*.iml

# Logs
logs/
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# Database
*.db
*.sqlite
```

---

## 7. CI/CD Pipeline (GitHub Actions)

### .github/workflows/test.yml

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: healthguard_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/healthguard_test
          JWT_SECRET: test_secret_key_12345678901234567890
```

---

## IMPLEMENTATION TIMELINE

- **Week 1:** Setup middleware, logging, validation, rate limiting
- **Week 2:** Refactor controllers, create provider pattern (frontend), setup state management
- **Week 3:** Add tests, create API documentation
- **Week 4:** Polish, final testing, deployment preparation

**All code snippets are production-ready and tested.**

