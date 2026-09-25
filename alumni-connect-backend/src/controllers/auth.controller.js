import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { generateOtp, sendVerificationEmail } from '../services/email.service.js';

const OTP_EXPIRES_MINUTES = 10;

// ============================================================
// Helper: Generate unique user ID
// ============================================================
const makeUserId = (role) => {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

// ============================================================
// REGISTER
// ============================================================
export const register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      university,
      course,
      graduationYear,
      skills,
      degree,
      currentCompany,
      designation,
      industry,
      location,
      department,
      subjectsCanTeach,
      expertise,
      learningGoals,
    } = req.body;

    // Validate
    if (!fullName || !email || !password || !role || !university) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fullName, email, password, role, university',
      });
    }

    if (!['student', 'alumni', 'teacher'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be student, alumni, or teacher.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered. Please log in.',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = makeUserId(role);

    // Create user
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, university, is_email_verified, approval_status, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, FALSE, 'approved', 'pending')`,
      [userId, fullName.trim(), cleanEmail, passwordHash, role, university.trim()]
    );

    // Create role-specific profile
    const skillsArr = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (role === 'student') {
      await query(
        `INSERT INTO student_profiles (user_id, course, department, graduation_year, skills, learning_goals, profile_completion)
         VALUES (?, ?, ?, ?, ?, ?, 60)`,
        [
          userId,
          course || 'B.Tech',
          'Computer Science',
          graduationYear || 2026,
          JSON.stringify(skillsArr),
          JSON.stringify(learningGoals ? learningGoals.split(',').map(s => s.trim()) : ['Machine Learning', 'Python']),
        ]
      );
    } else if (role === 'alumni') {
      await query(
        `INSERT INTO alumni_profiles (user_id, degree, graduation_year, job_title, company, industry, location, skills, available_for_mentorship)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          userId,
          degree || course || 'B.Tech',
          graduationYear || 2021,
          designation || 'Software Engineer',
          currentCompany || 'Company',
          industry || 'Technology',
          location || 'India',
          JSON.stringify(skillsArr),
        ]
      );
    } else if (role === 'teacher') {
      await query(
        `INSERT INTO teacher_profiles (user_id, department, designation, skills, subjects_can_teach, expertise, available_for_mentorship)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          userId,
          department || 'Computer Science',
          designation || 'Assistant Professor',
          JSON.stringify(skillsArr),
          JSON.stringify(subjectsCanTeach ? subjectsCanTeach.split(',').map(s => s.trim()) : ['Machine Learning', 'Python']),
          JSON.stringify(expertise ? expertise.split(',').map(s => s.trim()) : ['Machine Learning']),
        ]
      );
    }

    // Generate OTP and store
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO otp_tokens (id, user_id, email, token, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [`otp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, userId, cleanEmail, otp, expiresAt]
    );

    // Send verification email (console in dev)
    await sendVerificationEmail(cleanEmail, otp);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.',
      userId,
      email: cleanEmail,
      role,
      // Dev helper — production mein hata dena
      devOtp: process.env.EMAIL_MODE === 'console' ? otp : undefined,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// LOGIN
// ============================================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user
    const user = await queryOne(
      `SELECT id, name, email, password_hash, role, university, avatar, is_email_verified, approval_status, verification_status
       FROM users WHERE email = ?`,
      [cleanEmail]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Check password
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Check email verification
    if (!user.is_email_verified) {
      // Resend OTP
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);
      await query(
        `INSERT INTO otp_tokens (id, user_id, email, token, expires_at) VALUES (?, ?, ?, ?, ?)`,
        [`otp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, user.id, cleanEmail, otp, expiresAt]
      );
      await sendVerificationEmail(cleanEmail, otp);

      return res.status(403).json({
        success: false,
        error: 'Email not verified. Please verify with the OTP sent.',
        needsVerification: true,
        email: cleanEmail,
        devOtp: process.env.EMAIL_MODE === 'console' ? otp : undefined,
      });
    }

    // Generate JWT
    const token = generateToken(user.id, user.role);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        university: user.university,
        avatar: user.avatar,
        isEmailVerified: !!user.is_email_verified,
        approvalStatus: user.approval_status,
        verificationStatus: user.verification_status,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// VERIFY EMAIL (OTP)
// ============================================================
export const verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP token are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find OTP
    const otpRow = await queryOne(
      `SELECT * FROM otp_tokens
       WHERE email = ? AND token = ? AND is_used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, token]
    );

    if (!otpRow) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP. Please request a new one.',
      });
    }

    // Mark OTP as used
    await query(`UPDATE otp_tokens SET is_used = TRUE WHERE id = ?`, [otpRow.id]);

    // Mark user email verified
    await query(`UPDATE users SET is_email_verified = TRUE WHERE id = ?`, [otpRow.user_id]);

    // Fetch user + generate token
    const user = await queryOne(
      `SELECT id, name, email, role, university, avatar FROM users WHERE id = ?`,
      [otpRow.user_id]
    );

    const jwtToken = generateToken(user.id, user.role);

    return res.json({
      success: true,
      message: 'Email verified successfully!',
      token: jwtToken,
      user,
    });
  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// RESEND VERIFICATION OTP
// ============================================================
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO otp_tokens (id, user_id, email, token, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [`otp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, user.id, cleanEmail, otp, expiresAt]
    );
    await sendVerificationEmail(cleanEmail, otp);

    return res.json({
      success: true,
      message: 'Verification OTP sent.',
      devOtp: process.env.EMAIL_MODE === 'console' ? otp : undefined,
    });
  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET CURRENT USER (/me)
// ============================================================
export const getMe = async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT id, name, email, role, university, avatar, is_email_verified, approval_status, verification_status, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        university: user.university,
        avatar: user.avatar,
        isEmailVerified: !!user.is_email_verified,
        approvalStatus: user.approval_status,
        verificationStatus: user.verification_status,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};