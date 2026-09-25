import { query, queryOne } from '../config/db.js';

const makeId = (prefix = 'msg') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ============================================================
// GET /api/messages/conversations
// ============================================================
export const listConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        u.id, u.name, u.avatar, u.role, u.university,
        (SELECT content FROM messages m2 
         WHERE (m2.sender_id = ? AND m2.receiver_id = u.id) 
            OR (m2.sender_id = u.id AND m2.receiver_id = ?)
         ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages m3 
         WHERE (m3.sender_id = ? AND m3.receiver_id = u.id) 
            OR (m3.sender_id = u.id AND m3.receiver_id = ?)
         ORDER BY m3.created_at DESC LIMIT 1) AS last_message_time
      FROM users u
      WHERE u.id IN (
        SELECT DISTINCT 
          CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
      ) AND u.id != ?
      ORDER BY last_message_time DESC
    `;

    const conversations = await query(sql, [
      userId, userId, userId, userId, userId, userId, userId, userId,
    ]);

    return res.json({ success: true, conversations });
  } catch (err) {
    console.error('listConversations error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/messages/:userId
// ============================================================
export const getConversation = async (req, res) => {
  try {
    const meId = req.user.id;
    const { userId: partnerId } = req.params;

    const messages = await query(
      `SELECT * FROM messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [meId, partnerId, partnerId, meId]
    );

    await query(
      `UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
      [partnerId, meId]
    );

    const partner = await queryOne(
      `SELECT u.id, u.name, u.avatar, u.role, u.university, ap.company, ap.job_title
       FROM users u
       LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
       WHERE u.id = ?`,
      [partnerId]
    );

    return res.json({ success: true, messages, partner });
  } catch (err) {
    console.error('getConversation error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/messages
// ============================================================
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content } = req.body || {};

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ success: false, error: 'receiverId and content required.' });
    }

    const receiver = await queryOne('SELECT id, name FROM users WHERE id = ?', [receiverId]);
    if (!receiver) {
      return res.status(404).json({ success: false, error: 'Receiver not found.' });
    }

    const messageId = makeId('msg');
    await query(
      `INSERT INTO messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)`,
      [messageId, senderId, receiverId, content.trim()]
    );

    const sender = await queryOne('SELECT name FROM users WHERE id = ?', [senderId]);
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message)
       VALUES (?, ?, 'new_message', ?, ?)`,
      [
        makeId('notif'),
        receiverId,
        'New Message',
        `${sender?.name || 'Someone'}: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
      ]
    );

    const message = await queryOne('SELECT * FROM messages WHERE id = ?', [messageId]);

    return res.json({ success: true, message });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/chat/session/:partnerId
// ============================================================
export const getChatSession = async (req, res) => {
  try {
    const meId = req.user.id;
    const { partnerId } = req.params;

    const me = await queryOne('SELECT id, role FROM users WHERE id = ?', [meId]);
    const partner = await queryOne('SELECT id, role FROM users WHERE id = ?', [partnerId]);
    if (!me || !partner) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const studentId = me.role === 'student' ? me.id : partner.id;
    const alumniId = me.role === 'student' ? partner.id : me.id;

    let session = await queryOne(
      'SELECT * FROM chat_sessions WHERE student_id = ? AND alumni_id = ?',
      [studentId, alumniId]
    );

    if (!session) {
      const sessionId = `chat-${Date.now()}`;
      await query(
        `INSERT INTO chat_sessions (id, student_id, alumni_id, time_remaining, is_locked, price)
         VALUES (?, ?, ?, 300, FALSE, 20)`,
        [sessionId, studentId, alumniId]
      );
      session = await queryOne('SELECT * FROM chat_sessions WHERE id = ?', [sessionId]);
    }

    return res.json({ success: true, session });
  } catch (err) {
    console.error('getChatSession error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/chat/unlock
// ============================================================
export const unlockChatSession = async (req, res) => {
  try {
    const meId = req.user.id;
    const { partnerId, price } = req.body || {};

    if (!partnerId) {
      return res.status(400).json({ success: false, error: 'partnerId required.' });
    }

    const me = await queryOne('SELECT role FROM users WHERE id = ?', [meId]);
    const partner = await queryOne('SELECT role FROM users WHERE id = ?', [partnerId]);

    const studentId = me.role === 'student' ? meId : partnerId;
    const alumniId = me.role === 'student' ? partnerId : meId;

    await query(
      `UPDATE chat_sessions 
       SET time_remaining = 300, is_locked = FALSE, unlocked_count = unlocked_count + 1, price = COALESCE(?, price)
       WHERE student_id = ? AND alumni_id = ?`,
      [price || null, studentId, alumniId]
    );

    const session = await queryOne(
      'SELECT * FROM chat_sessions WHERE student_id = ? AND alumni_id = ?',
      [studentId, alumniId]
    );

    return res.json({
      success: true,
      message: 'Chat session unlocked for another 5 minutes!',
      session,
    });
  } catch (err) {
    console.error('unlockChatSession error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/chat/reset
// ============================================================
export const resetChatSession = async (req, res) => {
  try {
    const meId = req.user.id;
    const { partnerId } = req.body || {};

    if (!partnerId) {
      return res.status(400).json({ success: false, error: 'partnerId required.' });
    }

    const me = await queryOne('SELECT role FROM users WHERE id = ?', [meId]);
    const partner = await queryOne('SELECT role FROM users WHERE id = ?', [partnerId]);

    const studentId = me.role === 'student' ? meId : partnerId;
    const alumniId = me.role === 'student' ? partnerId : meId;

    await query(
      `UPDATE chat_sessions SET time_remaining = 300, is_locked = FALSE WHERE student_id = ? AND alumni_id = ?`,
      [studentId, alumniId]
    );

    return res.json({ success: true, message: 'Chat session reset.' });
  } catch (err) {
    console.error('resetChatSession error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/chat/tick
// ============================================================
export const tickChatSession = async (req, res) => {
  try {
    const meId = req.user.id;
    const { partnerId } = req.body || {};

    const me = await queryOne('SELECT role FROM users WHERE id = ?', [meId]);
    const partner = await queryOne('SELECT role FROM users WHERE id = ?', [partnerId]);

    const studentId = me.role === 'student' ? meId : partnerId;
    const alumniId = me.role === 'student' ? partnerId : meId;

    const session = await queryOne(
      'SELECT * FROM chat_sessions WHERE student_id = ? AND alumni_id = ?',
      [studentId, alumniId]
    );

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    if (session.is_locked) {
      return res.json({ success: true, session });
    }

    const newTime = Math.max(0, session.time_remaining - 1);
    const isLocked = newTime === 0;

    await query(
      `UPDATE chat_sessions SET time_remaining = ?, is_locked = ? WHERE id = ?`,
      [newTime, isLocked, session.id]
    );

    return res.json({
      success: true,
      session: { ...session, time_remaining: newTime, is_locked: isLocked },
    });
  } catch (err) {
    console.error('tickChatSession error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};