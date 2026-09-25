import { query, queryOne } from '../config/db.js';

const makeId = (prefix = 'mentor') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ============================================================
// POST /api/mentorships
// Body: { alumniId, goal, areaOfHelp, message, resumeUrl? }
// ============================================================
export const sendMentorshipRequest = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { alumniId, goal, areaOfHelp, message, resumeUrl } = req.body || {};

    if (!alumniId || !goal || !areaOfHelp || !message) {
      return res.status(400).json({
        success: false,
        error: 'alumniId, goal, areaOfHelp, and message are required.',
      });
    }

    const student = await queryOne(
      'SELECT id, name, avatar, university FROM users WHERE id = ?',
      [studentId]
    );
    const alumni = await queryOne(
      'SELECT u.id, u.name, u.avatar, ap.company FROM users u LEFT JOIN alumni_profiles ap ON ap.user_id = u.id WHERE u.id = ?',
      [alumniId]
    );

    if (!student || !alumni) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Check existing pending
    const existing = await queryOne(
      `SELECT id, status FROM mentorships WHERE student_id = ? AND alumni_id = ? AND status IN ('pending','accepted')`,
      [studentId, alumniId]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Mentorship request already ${existing.status}.`,
      });
    }

    const mId = makeId('mentor');
    await query(
      `INSERT INTO mentorships 
       (id, student_id, student_name, student_avatar, student_university,
        alumni_id, alumni_name, alumni_company, goal, area_of_help, message, resume_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        mId,
        student.id,
        student.name,
        student.avatar || null,
        student.university,
        alumni.id,
        alumni.name,
        alumni.company || null,
        goal,
        areaOfHelp,
        message,
        resumeUrl || null,
      ]
    );

    // Notify mentor
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message)
       VALUES (?, ?, 'mentorship_request', ?, ?)`,
      [
        makeId('notif'),
        alumniId,
        'New Mentorship Request',
        `${student.name} has requested mentorship in ${areaOfHelp}.`,
      ]
    );

    return res.json({
      success: true,
      message: `Mentorship request sent to ${alumni.name}.`,
      mentorshipId: mId,
    });
  } catch (err) {
    console.error('sendMentorshipRequest error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/mentorships
// ============================================================
export const listMentorships = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let sql = `SELECT * FROM mentorships WHERE (student_id = ? OR alumni_id = ?)`;
    const params = [userId, userId];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;
    const rows = await query(sql, params);

    return res.json({ success: true, mentorships: rows });
  } catch (err) {
    console.error('listMentorships error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/mentorships/incoming  (pending to me)
// ============================================================
export const incomingMentorships = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await query(
      `SELECT * FROM mentorships WHERE alumni_id = ? AND status = 'pending' ORDER BY created_at DESC`,
      [userId]
    );
    return res.json({ success: true, mentorships: rows });
  } catch (err) {
    console.error('incomingMentorships error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// PATCH /api/mentorships/:id/accept
// ============================================================
export const acceptMentorship = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const m = await queryOne('SELECT * FROM mentorships WHERE id = ?', [id]);
    if (!m) return res.status(404).json({ success: false, error: 'Mentorship not found.' });
    if (m.alumni_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the mentor can accept.' });
    }

    await query(`UPDATE mentorships SET status = 'accepted' WHERE id = ?`, [id]);

    // Welcome message
    await query(
      `INSERT INTO messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)`,
      [
        makeId('msg'),
        userId,
        m.student_id,
        `Hello ${m.student_name}! I accepted your ${m.area_of_help} mentorship request. Let's work together!`,
      ]
    );

    // Notify student
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'mentorship_accepted', ?, ?)`,
      [
        makeId('notif'),
        m.student_id,
        'Mentorship Accepted',
        `Your mentorship request has been accepted!`,
      ]
    );

    return res.json({ success: true, message: 'Mentorship accepted.' });
  } catch (err) {
    console.error('acceptMentorship error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// PATCH /api/mentorships/:id/decline
// ============================================================
export const declineMentorship = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const m = await queryOne('SELECT * FROM mentorships WHERE id = ?', [id]);
    if (!m) return res.status(404).json({ success: false, error: 'Mentorship not found.' });
    if (m.alumni_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the mentor can decline.' });
    }

    await query(`UPDATE mentorships SET status = 'declined' WHERE id = ?`, [id]);
    return res.json({ success: true, message: 'Mentorship declined.' });
  } catch (err) {
    console.error('declineMentorship error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// PATCH /api/mentorships/:id/feedback
// Body: { feedback }
// ============================================================
export const sendFeedback = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { feedback } = req.body || {};

    if (!feedback) {
      return res.status(400).json({ success: false, error: 'feedback required.' });
    }

    const m = await queryOne('SELECT * FROM mentorships WHERE id = ?', [id]);
    if (!m) return res.status(404).json({ success: false, error: 'Mentorship not found.' });
    if (m.alumni_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the mentor can provide feedback.' });
    }

    await query(
      `UPDATE mentorships SET mentor_feedback = ?, status = 'completed' WHERE id = ?`,
      [feedback, id]
    );

    // Post to chat
    await query(
      `INSERT INTO messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)`,
      [
        makeId('msg'),
        userId,
        m.student_id,
        `📋 Resume Review Feedback: ${feedback}`,
      ]
    );

    return res.json({ success: true, message: 'Feedback sent to student.' });
  } catch (err) {
    console.error('sendFeedback error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/mentorships/:id
// ============================================================
export const getMentorship = async (req, res) => {
  try {
    const { id } = req.params;
    const m = await queryOne('SELECT * FROM mentorships WHERE id = ?', [id]);
    if (!m) return res.status(404).json({ success: false, error: 'Mentorship not found.' });
    return res.json({ success: true, mentorship: m });
  } catch (err) {
    console.error('getMentorship error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};