// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create OTP expiration time (15 minutes from now)
const getOTPExpiration = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);
  return now;
};

module.exports = {
  generateOTP,
  getOTPExpiration,
};
