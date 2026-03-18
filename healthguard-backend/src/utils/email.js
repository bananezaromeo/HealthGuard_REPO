const nodemailer = require('nodemailer');

// Configure email transporter - using Gmail for demonstration
// In production, use your email service provider
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send OTP email
const sendOTPEmail = async (email, fullName, otp) => {
  const mailOptions = {
    from: `"HealthGuard" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'HealthGuard - Email Verification OTP',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #00897B 0%, #26C6DA 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .otp-box { 
              background: #f0f7f7; 
              border: 2px dashed #00897B; 
              padding: 20px; 
              text-align: center; 
              margin: 20px 0; 
              border-radius: 6px;
            }
            .otp-code { 
              font-size: 32px; 
              font-weight: bold; 
              color: #00897B; 
              letter-spacing: 8px; 
            }
            .warning { 
              background: #fff3e0; 
              border-left: 4px solid #ff9800; 
              padding: 15px; 
              margin: 20px 0; 
              border-radius: 4px;
            }
            .footer { 
              text-align: center; 
              color: #666; 
              font-size: 12px; 
              margin-top: 20px; 
              padding-top: 20px; 
              border-top: 1px solid #eee;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>HealthGuard - Email Verification</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${fullName}</strong>,</p>
              <p>Thank you for registering with HealthGuard! To complete your email verification and activate your account, please use the following One-Time Password (OTP):</p>
              
              <div class="otp-box">
                <p style="margin: 0; color: #666; font-size: 12px; margin-bottom: 10px;">YOUR VERIFICATION CODE</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This OTP is valid for <strong>15 minutes only</strong></li>
                <li>Never share this code with anyone</li>
                <li>HealthGuard staff will never ask for this code</li>
              </ul>
              
              <div class="warning">
                <strong>⚠️ If you didn't create this account:</strong><br/>
                Please ignore this email. Your email will not be verified unless you enter this code.
              </div>
              
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br/><strong>The HealthGuard Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 HealthGuard Medical Monitoring System. All rights reserved.</p>
              <p>This email and any attachments are confidential and intended for the named recipient only.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

module.exports = {
  sendOTPEmail,
};
