import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, queryOne } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// Helper: make public URL for a file
const fileUrl = (subfolder, filename) => `/uploads/${subfolder}/${filename}`;

// ============================================================
// GET /api/profile/:userId
// ============================================================
export const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await queryOne(
      `SELECT id, name, email, role, university, avatar, is_email_verified, approval_status, verification_status, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    let profile = null;
    if (user.role === 'student') {
      profile = await queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
    } else if (user.role === 'alumni') {
      profile = await queryOne('SELECT * FROM alumni_profiles WHERE user_id = ?', [userId]);
    } else if (user.role === 'teacher') {
      profile = await queryOne('SELECT * FROM teacher_profiles WHERE user_id = ?', [userId]);
    }

    // Get media gallery
    const media = await query('SELECT * FROM profile_media WHERE user_id = ? ORDER BY created_at DESC', [userId]);

    // Get resume
    const resume = await queryOne('SELECT * FROM resumes WHERE user_id = ?', [userId]);

    return res.json({
      success: true,
      user,
      profile,
      media,
      resume,
    });
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// PUT /api/profile/:userId
// ============================================================
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body || {};

    // Update user table
    if (updates.name || updates.university || updates.avatar) {
      const fields = [];
      const values = [];
      if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
      if (updates.university) { fields.push('university = ?'); values.push(updates.university); }
      if (updates.avatar) { fields.push('avatar = ?'); values.push(updates.avatar); }
      values.push(userId);
      await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    // Determine role
    const u = await queryOne('SELECT role FROM users WHERE id = ?', [userId]);
    if (!u) return res.status(404).json({ success: false, error: 'User not found.' });

    // Update role-specific profile
    const skillArr = updates.skills
      ? (Array.isArray(updates.skills) ? updates.skills : updates.skills.split(',').map(s => s.trim()).filter(Boolean))
      : null;

    if (u.role === 'student') {
      await query(
        `UPDATE student_profiles SET
          course = COALESCE(?, course),
          department = COALESCE(?, department),
          graduation_year = COALESCE(?, graduation_year),
          skills = COALESCE(?, skills),
          interests = COALESCE(?, interests),
          learning_goals = COALESCE(?, learning_goals),
          development_goals = COALESCE(?, development_goals),
          career_goals = COALESCE(?, career_goals),
          location = COALESCE(?, location),
          bio = COALESCE(?, bio),
          linkedin_url = COALESCE(?, linkedin_url)
         WHERE user_id = ?`,
        [
          updates.course || null,
          updates.department || null,
          updates.graduationYear ? Number(updates.graduationYear) : null,
          skillArr ? JSON.stringify(skillArr) : null,
          updates.interests ? JSON.stringify(updates.interests.split(',').map(s => s.trim())) : null,
          updates.learningGoals ? JSON.stringify(updates.learningGoals.split(',').map(s => s.trim())) : null,
          updates.developmentGoals || null,
          updates.careerGoals || null,
          updates.location || null,
          updates.bio || null,
          updates.linkedinUrl || null,
          userId,
        ]
      );
    } else if (u.role === 'alumni') {
      await query(
        `UPDATE alumni_profiles SET
          degree = COALESCE(?, degree),
          graduation_year = COALESCE(?, graduation_year),
          job_title = COALESCE(?, job_title),
          company = COALESCE(?, company),
          industry = COALESCE(?, industry),
          location = COALESCE(?, location),
          skills = COALESCE(?, skills),
          expertise = COALESCE(?, expertise),
          bio = COALESCE(?, bio),
          experience_years = COALESCE(?, experience_years),
          linkedin_url = COALESCE(?, linkedin_url)
         WHERE user_id = ?`,
        [
          updates.degree || updates.course || null,
          updates.graduationYear ? Number(updates.graduationYear) : null,
          updates.designation || null,
          updates.currentCompany || null,
          updates.industry || null,
          updates.location || null,
          skillArr ? JSON.stringify(skillArr) : null,
          updates.expertise ? JSON.stringify(updates.expertise.split(',').map(s => s.trim())) : null,
          updates.bio || null,
          updates.experience ? Number(updates.experience) : null,
          updates.linkedinUrl || null,
          userId,
        ]
      );
    } else if (u.role === 'teacher') {
      await query(
        `UPDATE teacher_profiles SET
          department = COALESCE(?, department),
          designation = COALESCE(?, designation),
          experience_years = COALESCE(?, experience_years),
          skills = COALESCE(?, skills),
          expertise = COALESCE(?, expertise),
          subjects_can_teach = COALESCE(?, subjects_can_teach),
          office_hours = COALESCE(?, office_hours),
          bio = COALESCE(?, bio),
          location = COALESCE(?, location),
          linkedin_url = COALESCE(?, linkedin_url)
         WHERE user_id = ?`,
        [
          updates.department || null,
          updates.designation || null,
          updates.experience ? Number(updates.experience) : null,
          skillArr ? JSON.stringify(skillArr) : null,
          updates.expertise ? JSON.stringify(updates.expertise.split(',').map(s => s.trim())) : null,
          updates.subjectsCanTeach ? JSON.stringify(updates.subjectsCanTeach.split(',').map(s => s.trim())) : null,
          updates.officeHours || null,
          updates.bio || null,
          updates.location || null,
          updates.linkedinUrl || null,
          userId,
        ]
      );
    }

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/profile/avatar
// ============================================================
export const uploadAvatarCtrl = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No avatar file uploaded.' });
    }

    const url = fileUrl('avatars', req.file.filename);
    await query('UPDATE users SET avatar = ? WHERE id = ?', [url, userId]);

    return res.json({
      success: true,
      message: 'Avatar uploaded successfully.',
      avatarUrl: url,
    });
  } catch (err) {
    console.error('uploadAvatar error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/profile/resume
// ============================================================
export const uploadResumeCtrl = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No resume file uploaded.' });
    }

    const fileType = req.file.originalname.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX';
    const fileSize = (req.file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const url = fileUrl('resumes', req.file.filename);
    const resumeId = `res-${Date.now()}`;

    // Upsert (replace existing)
    const existing = await queryOne('SELECT id FROM resumes WHERE user_id = ?', [userId]);
    if (existing) {
      await query(
        `UPDATE resumes SET file_name = ?, file_path = ?, file_type = ?, file_size = ? WHERE user_id = ?`,
        [req.file.originalname, url, fileType, fileSize, userId]
      );
    } else {
      await query(
        `INSERT INTO resumes (id, user_id, file_name, file_path, file_type, file_size, visibility) 
         VALUES (?, ?, ?, ?, ?, ?, 'public')`,
        [resumeId, userId, req.file.originalname, url, fileType, fileSize]
      );
    }

    return res.json({
      success: true,
      message: 'Resume uploaded successfully.',
      resume: {
        id: existing?.id || resumeId,
        fileName: req.file.originalname,
        fileUrl: url,
        fileType,
        fileSize,
      },
    });
  } catch (err) {
    console.error('uploadResume error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// DELETE /api/profile/resume
// ============================================================
export const deleteResumeCtrl = async (req, res) => {
  try {
    const userId = req.user.id;
    const existing = await queryOne('SELECT file_path FROM resumes WHERE user_id = ?', [userId]);

    if (existing?.file_path) {
      // Delete physical file
      const relative = existing.file_path.replace('/uploads/', '');
      const fullPath = path.join(UPLOAD_ROOT, relative);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) { console.warn('File delete warn:', e.message); }
      }
    }

    await query('DELETE FROM resumes WHERE user_id = ?', [userId]);
    return res.json({ success: true, message: 'Resume deleted.' });
  } catch (err) {
    console.error('deleteResume error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/profile/media
// ============================================================
export const uploadMediaCtrl = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No media file uploaded.' });
    }

    const isAnimated = req.file.mimetype === 'image/gif' || req.file.originalname.toLowerCase().endsWith('.gif');
    const url = fileUrl('media', req.file.filename);
    const mediaId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const caption = req.body.caption || req.file.originalname;

    await query(
      `INSERT INTO profile_media (id, user_id, url, caption, type, is_animated)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [mediaId, userId, url, caption, isAnimated ? 'gif' : 'image', isAnimated]
    );

    return res.json({
      success: true,
      message: 'Media uploaded successfully.',
      media: { id: mediaId, url, caption, isAnimated, uploadedAt: 'Just now' },
    });
  } catch (err) {
    console.error('uploadMedia error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// DELETE /api/profile/media/:userId/:id
// ============================================================
export const deleteMediaCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const media = await queryOne('SELECT url FROM profile_media WHERE id = ? AND user_id = ?', [id, userId]);
    if (!media) {
      return res.status(404).json({ success: false, error: 'Media not found.' });
    }

    // Delete physical file
    const relative = media.url.replace('/uploads/', '');
    const fullPath = path.join(UPLOAD_ROOT, relative);
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch (e) { console.warn('File delete warn:', e.message); }
    }

    await query('DELETE FROM profile_media WHERE id = ? AND user_id = ?', [id, userId]);
    return res.json({ success: true, message: 'Media deleted.' });
  } catch (err) {
    console.error('deleteMedia error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};