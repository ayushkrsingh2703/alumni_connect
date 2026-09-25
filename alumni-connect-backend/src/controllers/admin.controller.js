import { query, queryOne } from '../config/db.js';

// ============================================================
// GET /api/admin/analytics
// ============================================================
export const getAnalytics = async (req, res) => {
  try {
    const [{ totalUsers }] = await query(`SELECT COUNT(*) AS totalUsers FROM users`);
    const [{ totalAlumni }] = await query(`SELECT COUNT(*) AS totalAlumni FROM users WHERE role = 'alumni'`);
    const [{ totalStudents }] = await query(`SELECT COUNT(*) AS totalStudents FROM users WHERE role = 'student'`);
    const [{ totalTeachers }] = await query(`SELECT COUNT(*) AS totalTeachers FROM users WHERE role = 'teacher'`);
    const [{ verifiedAlumni }] = await query(
      `SELECT COUNT(*) AS verifiedAlumni FROM users WHERE role = 'alumni' AND verification_status = 'verified'`
    );
    const [{ pendingAlumni }] = await query(
      `SELECT COUNT(*) AS pendingAlumni FROM users WHERE role = 'alumni' AND verification_status IN ('pending','under_review','info_requested')`
    );
    const [{ activeConnections }] = await query(
      `SELECT COUNT(*) AS activeConnections FROM connections WHERE status = 'accepted'`
    );
    const [{ mentorshipSessions }] = await query(`SELECT COUNT(*) AS mentorshipSessions FROM mentorships`);
    const [{ totalUniversities }] = await query(`SELECT COUNT(*) AS totalUniversities FROM universities`);
    const [{ totalEvents }] = await query(`SELECT COUNT(*) AS totalEvents FROM events`);
    const [{ totalOpportunities }] = await query(`SELECT COUNT(*) AS totalOpportunities FROM opportunities`);

    // University distribution
    const universityDistribution = await query(`
      SELECT u.university, COUNT(*) AS count
      FROM users u
      WHERE u.role = 'alumni' AND u.university IS NOT NULL
      GROUP BY u.university
      ORDER BY count DESC
      LIMIT 6
    `);

    // Industry distribution
    const industryDistribution = await query(`
      SELECT industry, COUNT(*) AS count
      FROM alumni_profiles
      WHERE industry IS NOT NULL
      GROUP BY industry
      ORDER BY count DESC
      LIMIT 6
    `);

    // Monthly growth — last 6 months
    const monthlyGrowth = await query(`
      SELECT 
        DATE_FORMAT(created_at, '%b') AS month,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) AS students,
        SUM(CASE WHEN role = 'alumni' THEN 1 ELSE 0 END) AS alumni
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at), DATE_FORMAT(created_at, '%b')
      ORDER BY YEAR(created_at) ASC, MONTH(created_at) ASC
    `);

    return res.json({
      success: true,
      analytics: {
        totalUsers,
        totalAlumni,
        totalStudents,
        totalTeachers,
        verifiedAlumni,
        pendingAlumni,
        activeConnections,
        mentorshipSessions,
        totalUniversities,
        totalEvents,
        totalOpportunities,
        universityDistribution,
        industryDistribution,
        monthlyGrowth,
      },
    });
  } catch (err) {
    console.error('getAnalytics error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/admin/pending-alumni
// ============================================================
export const getPendingAlumni = async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        u.id, u.name, u.email, u.avatar, u.university, u.verification_status, u.created_at,
        ap.degree, ap.department, ap.graduation_year, ap.job_title, ap.company, ap.industry, ap.skills, ap.experience_years, ap.available_for_mentorship, ap.mentorship_topics
      FROM users u
      JOIN alumni_profiles ap ON ap.user_id = u.id
      WHERE u.role = 'alumni' 
        AND u.verification_status IN ('pending','under_review','info_requested')
      ORDER BY u.created_at DESC
    `);

    const alumni = rows.map(r => ({
      ...r,
      skills: r.skills ? (typeof r.skills === 'string' ? JSON.parse(r.skills) : r.skills) : [],
      mentorship_topics: r.mentorship_topics ? (typeof r.mentorship_topics === 'string' ? JSON.parse(r.mentorship_topics) : r.mentorship_topics) : [],
    }));

    return res.json({ success: true, alumni });
  } catch (err) {
    console.error('getPendingAlumni error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/admin/pending-students
// ============================================================
export const getPendingStudents = async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        u.id, u.name, u.email, u.avatar, u.university, u.approval_status, u.created_at,
        sp.course, sp.department, sp.graduation_year, sp.skills, sp.learning_goals
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'student' AND u.approval_status = 'pending'
      ORDER BY u.created_at DESC
    `);

    return res.json({ success: true, students: rows });
  } catch (err) {
    console.error('getPendingStudents error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// PATCH /api/admin/alumni/:id/approve
// ============================================================
export const approveAlumni = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await queryOne('SELECT id FROM users WHERE id = ? AND role = ?', [id, 'alumni']);
    if (!user) return res.status(404).json({ success: false, error: 'Alumni not found.' });

    await query(
      `UPDATE users SET verification_status = 'verified' WHERE id = ?`,
      [id]
    );
    await query(
      `UPDATE alumni_profiles SET admin_notes = ? WHERE user_id = ?`,
      ['Verified by University Administrator via official degree registry.', id]
    );

    // Notify
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'approval', ?, ?)`,
      [
        `notif-${Date.now()}`,
        id,
        'Verification Approved',
        'Your alumni verification has been approved. Verified Alumni Badge granted!',
      ]
    );

    return res.json({ success: true, message: 'Alumni verified successfully.' });
  } catch (err) {
    console.error('approveAlumni error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// PATCH /api/admin/alumni/:id/reject
// Body: { reason? }
// ============================================================
export const rejectAlumni = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const user = await queryOne('SELECT id FROM users WHERE id = ? AND role = ?', [id, 'alumni']);
    if (!user) return res.status(404).json({ success: false, error: 'Alumni not found.' });

    await query(`UPDATE users SET verification_status = 'rejected' WHERE id = ?`, [id]);
    await query(
      `UPDATE alumni_profiles SET admin_notes = ? WHERE user_id = ?`,
      [reason || 'Verification rejected due to insufficient or unverified credentials.', id]
    );

    return res.json({ success: true, message: 'Alumni application rejected.' });
  } catch (err) {
    console.error('rejectAlumni error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// PATCH /api/admin/alumni/:id/request-info
// Body: { note }
// ============================================================
export const requestMoreInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body || {};

    if (!note) {
      return res.status(400).json({ success: false, error: 'note required.' });
    }

    const user = await queryOne('SELECT id FROM users WHERE id = ? AND role = ?', [id, 'alumni']);
    if (!user) return res.status(404).json({ success: false, error: 'Alumni not found.' });

    await query(`UPDATE users SET verification_status = 'info_requested' WHERE id = ?`, [id]);
    await query(`UPDATE alumni_profiles SET admin_notes = ? WHERE user_id = ?`, [note, id]);

    return res.json({ success: true, message: 'Additional information requested from applicant.' });
  } catch (err) {
    console.error('requestMoreInfo error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// PATCH /api/admin/users/:id/suspend
// ============================================================
export const toggleUserSuspension = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await queryOne('SELECT id, verification_status FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    const newStatus = user.verification_status === 'suspended' ? 'verified' : 'suspended';
    await query(`UPDATE users SET verification_status = ? WHERE id = ?`, [newStatus, id]);

    return res.json({
      success: true,
      message: newStatus === 'suspended' ? 'User suspended.' : 'User reactivated.',
      newStatus,
    });
  } catch (err) {
    console.error('toggleUserSuspension error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// PATCH /api/admin/students/:id/approve
// ============================================================
export const approveStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE users SET approval_status = 'approved' WHERE id = ? AND role = 'student'`, [id]);

    await query(
      `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'approval', ?, ?)`,
      [`notif-${Date.now()}`, id, 'Account Approved', 'Your student account has been approved!']
    );

    return res.json({ success: true, message: 'Student account approved.' });
  } catch (err) {
    console.error('approveStudent error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// PATCH /api/admin/students/:id/reject
// Body: { reason? }
// ============================================================
export const rejectStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    await query(`UPDATE users SET approval_status = 'rejected' WHERE id = ? AND role = 'student'`, [id]);

    return res.json({ success: true, message: `Student rejected: ${reason || 'N/A'}` });
  } catch (err) {
    console.error('rejectStudent error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/admin/all-alumni  (for admin directory)
// ============================================================
export const getAllAlumni = async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        u.id, u.name, u.email, u.avatar, u.university, u.verification_status,
        ap.job_title, ap.company, ap.industry, ap.graduation_year
      FROM users u
      JOIN alumni_profiles ap ON ap.user_id = u.id
      WHERE u.role = 'alumni'
      ORDER BY u.created_at DESC
      LIMIT 200
    `);

    return res.json({ success: true, alumni: rows });
  } catch (err) {
    console.error('getAllAlumni error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};