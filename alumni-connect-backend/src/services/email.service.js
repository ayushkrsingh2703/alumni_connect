// ============================================================
// Email Service — DEV MODE (console log)
// Production mein yahan Nodemailer + Gmail SMTP aayega
// ============================================================

// Generate 6-digit OTP
export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email (in dev: console log)
export const sendVerificationEmail = async (email, otp) => {
  if (process.env.EMAIL_MODE === 'console') {
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL VERIFICATION (DEV MODE)');
    console.log('='.repeat(60));
    console.log(`   To:      ${email}`);
    console.log(`   Subject: Verify your LINKORA account`);
    console.log(`   OTP:     \x1b[33m\x1b[1m${otp}\x1b[0m`);
    console.log(`   Expires: 10 minutes`);
    console.log('='.repeat(60) + '\n');
    return { success: true, devOtp: otp };
  }

  // Production: Nodemailer implementation
  // (Baad mein add karenge)
  console.warn('⚠️  EMAIL_MODE not set to console. Email not sent.');
  return { success: false, message: 'Email service not configured' };
};

// Send password reset email (dev)
export const sendPasswordResetEmail = async (email, otp) => {
  console.log('\n' + '='.repeat(60));
  console.log('🔑 PASSWORD RESET (DEV MODE)');
  console.log('='.repeat(60));
  console.log(`   To:      ${email}`);
  console.log(`   OTP:     \x1b[33m\x1b[1m${otp}\x1b[0m`);
  console.log('='.repeat(60) + '\n');
  return { success: true, devOtp: otp };
};