import { query, queryOne } from '../config/db.js';

// ============================================================
// Helper: generate ID
// ============================================================
const makeId = (prefix = 'conn') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ============================================================
// POST /api/connections/request
// Body: { targetId, targetRole?, note?, matchPercentage?, matchedSkills?, matchReason? }
// ============================================================
export const sendConnectionRequest = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { targetId, targetRole = 'alumni', note, matchPercentage, matchedSkills, matchReason } = req.body || {};

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'targetId required.' });
    }

    if (targetId === studentId) {
      return res.status(400).json({ success: false, error: 'Cannot connect with yourself.' });
    }

    // Fetch both users
    const student = await queryOne(
      'SELECT id, name, avatar, university FROM users WHERE id = ?',
      [studentId]
    );
    const target = await queryOne(
      'SELECT id, name, avatar, role, university FROM users WHERE id = ?',
      [targetId]
    );

    if (!student || !target) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Get target's company/department for display
    let targetCompany = target.university;
    if (target.role === 'alumni') {
      const p = await queryOne('SELECT company FROM alumni_profiles WHERE user_id = ?', [targetId]);
      targetCompany = p?.company || target.university;
    } else if (target.role === 'teacher') {
      const p = await queryOne('SELECT department FROM teacher_profiles WHERE user_id = ?', [targetId]);
      targetCompany = p?.department || target.university;
    }

    // Check existing connection
    const existing = await queryOne(
      'SELECT id, status FROM connections WHERE student_id = ? AND alumni_id = ?',
      [studentId, targetId]
    );

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(409).json({ success: false, error: 'Connection request already pending.' });
      }
      if (existing.status === 'accepted') {
        return res.status(409).json({ success: false, error: 'Already connected.' });
      }
      // If rejected — allow re-sending: update it
      await query(
        `UPDATE connections SET status = 'pending', note = ?, match_percentage = ?, matched_skills = ?, match_reason = ?, created_at = NOW()
         WHERE id = ?`,
        [
          note || null,
          matchPercentage || null,
          matchedSkills ? JSON.stringify(matchedSkills) : null,
          matchReason || null,
          existing.id,
        ]
      );
      return res.json({ success: true, message: 'Connection request re-sent.', connectionId: existing.id });
    }

    // Insert new
    const connId = makeId('conn');
    await query(
      `INSERT INTO connections 
       (id, student_id, student_name, student_avatar, student_university,
        alumni_id, alumni_name, alumni_avatar, alumni_company,
        target_role, status, note, match_percentage, matched_skills, match_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [
        connId,
        student.id,
        student.name,
        student.avatar || null,
        student.university,
        target.id,
        target.name,
        target.avatar || null,
        targetCompany,
        targetRole,
        note || null,
        matchPercentage || null,
        matchedSkills ? JSON.stringify(matchedSkills) : null,
        matchReason || null,
      ]
    );

    // Create notification for target
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message)
       VALUES (?, ?, 'connection_request', ?, ?)`,
      [
        makeId('notif'),
        targetId,
        'New Connection Request',
        `${student.name} wants to connect with you.`,
      ]
    );

    return res.json({
      success: true,
      message: `Connection request sent to ${target.name}.`,
      connectionId: connId,
    });
  } catch (err) {
    console.error('sendConnectionRequest error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/connections/accept
// Body: { requestId }
// ============================================================
export const acceptConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.body || {};

    if (!requestId) {
      return res.status(400).json({ success: false, error: 'requestId required.' });
    }

    const conn = await queryOne('SELECT * FROM connections WHERE id = ?', [requestId]);
    if (!conn) {
      return res.status(404).json({ success: false, error: 'Connection not found.' });
    }

    // Only the target (alumni/teacher) can accept
    if (conn.alumni_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the recipient can accept.' });
    }

    await query(`UPDATE connections SET status = 'accepted' WHERE id = ?`, [requestId]);

    // Send welcome message
    const me = await queryOne('SELECT name FROM users WHERE id = ?', [userId]);
    await query(
      `INSERT INTO messages (id, sender_id, receiver_id, content)
       VALUES (?, ?, ?, ?)`,
      [
        makeId('msg'),
        userId,
        conn.student_id,
        `Hi ${conn.student_name}! I accepted your connection request. Looking forward to connecting!`,
      ]
    );

    // Notify student
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message)
       VALUES (?, ?, 'connection_accepted', ?, ?)`,
      [
        makeId('notif'),
        conn.student_id,
        'Connection Accepted',
        `${me?.name || 'Your connection'} accepted your connection request!`,
      ]
    );

    return res.json({ success: true, message: 'Connection accepted.' });
  } catch (err) {
    console.error('acceptConnection error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/connections/reject
// Body: { requestId }
// ============================================================
export const rejectConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.body || {};

    if (!requestId) {
      return res.status(400).json({ success: false, error: 'requestId required.' });
    }

    const conn = await queryOne('SELECT * FROM connections WHERE id = ?', [requestId]);
    if (!conn) {
      return res.status(404).json({ success: false, error: 'Connection not found.' });
    }

    if (conn.alumni_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the recipient can reject.' });
    }

    await query(`UPDATE connections SET status = 'rejected' WHERE id = ?`, [requestId]);

    return res.json({ success: true, message: 'Connection request declined.' });
  } catch (err) {
    console.error('rejectConnection error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/connections
// ============================================================
export const listConnections = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let sql = `SELECT * FROM connections WHERE (student_id = ? OR alumni_id = ?)`;
    const params = [userId, userId];

    if (status && ['pending', 'accepted', 'rejected', 'blocked'].includes(status)) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    const rows = await query(sql, params);

    // Parse JSON fields
    const connections = rows.map(r => ({
      ...r,
      matched_skills: r.matched_skills ? (typeof r.matched_skills === 'string' ? JSON.parse(r.matched_skills) : r.matched_skills) : [],
    }));

    return res.json({ success: true, connections });
  } catch (err) {
    console.error('listConnections error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/connections/incoming  (pending requests TO me)
// ============================================================
export const incomingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await query(
      `SELECT * FROM connections WHERE alumni_id = ? AND status = 'pending' ORDER BY created_at DESC`,
      [userId]
    );
    const connections = rows.map(r => ({
      ...r,
      matched_skills: r.matched_skills ? (typeof r.matched_skills === 'string' ? JSON.parse(r.matched_skills) : r.matched_skills) : [],
    }));
    return res.json({ success: true, connections });
  } catch (err) {
    console.error('incomingRequests error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};