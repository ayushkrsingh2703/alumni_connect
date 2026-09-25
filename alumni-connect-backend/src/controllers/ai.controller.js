import { query, queryOne } from '../config/db.js';
import {
  calculateAIResumeAnalysis,
  matchTeachersAndMentorsAI,
  chatbotReply,
} from '../services/ai.service.js';

// ============================================================
// Helper: parse JSON safely
// ============================================================
const parseJson = (val, fallback = []) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

// ============================================================
// POST /api/ai/mentor-search
// Body: { query }
// ============================================================
export const aiMentorSearch = async (req, res) => {
  try {
    const { query: searchQuery } = req.body || {};

    if (!searchQuery?.trim()) {
      return res.status(400).json({ success: false, error: 'query required.' });
    }

    // Get current student profile (or guest default)
    const studentId = req.user?.id;
    let studentProfile = {
      skills: [],
      learning_goals: ['Machine Learning', 'Python'],
      career_goals: '',
      interests: ['AI/ML', 'Cloud'],
    };

    if (studentId) {
      const sp = await queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [studentId]);
      if (sp) {
        studentProfile = {
          ...sp,
          skills: parseJson(sp.skills, []),
          learning_goals: parseJson(sp.learning_goals, ['Machine Learning']),
          interests: parseJson(sp.interests, ['AI/ML']),
        };
      }
    }

    // Fetch teachers + alumni
    const teacherRows = await query(`SELECT * FROM teacher_profiles`);
    const alumniRows = await query(`SELECT * FROM alumni_profiles WHERE available_for_mentorship = TRUE`);

    // Get user details for each mentor
    const teacherIds = teacherRows.map(t => t.user_id);
    const alumniIds = alumniRows.map(a => a.user_id);

    const allMentorIds = [...teacherIds, ...alumniIds];
    const users = allMentorIds.length
      ? await query(`SELECT id, name, email, avatar, university FROM users WHERE id IN (${allMentorIds.map(() => '?').join(',')})`, allMentorIds)
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const teachers = teacherRows.map(t => ({
      ...t,
      ...userMap[t.user_id],
      skills: parseJson(t.skills, []),
      expertise: parseJson(t.expertise, []),
      subjects_can_teach: parseJson(t.subjects_can_teach, []),
      mentorship_topics: parseJson(t.mentorship_topics, []),
      experience_years: t.experience_years,
    }));

    const alumni = alumniRows.map(a => ({
      ...a,
      ...userMap[a.user_id],
      skills: parseJson(a.skills, []),
      expertise: parseJson(a.expertise, []),
      mentorship_topics: parseJson(a.mentorship_topics, []),
      experience_years: a.experience_years,
    }));

    const matches = matchTeachersAndMentorsAI(searchQuery, studentProfile, teachers, alumni);

    return res.json({
      success: true,
      query: searchQuery,
      matches: matches.slice(0, 10),
      total: matches.length,
    });
  } catch (err) {
    console.error('aiMentorSearch error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/ai/resume-analyse
// Body: { targetRole?, studentProfile? }
// ============================================================
export const aiResumeAnalyse = async (req, res) => {
  try {
    const { targetRole = 'Data Scientist' } = req.body || {};
    const userId = req.user?.id;

    let studentProfile = req.body?.studentProfile || {
      skills: ['Python', 'Machine Learning', 'React', 'PostgreSQL'],
      learning_goals: ['Machine Learning'],
      career_goals: '',
    };

    if (userId && !req.body?.studentProfile) {
      const sp = await queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
      if (sp) {
        studentProfile = {
          ...sp,
          skills: parseJson(sp.skills, []),
          learning_goals: parseJson(sp.learning_goals, []),
        };
      }
    }

    const analysis = calculateAIResumeAnalysis(studentProfile, targetRole);

    return res.json({ success: true, analysis });
  } catch (err) {
    console.error('aiResumeAnalyse error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/ai/chatbot
// Body: { query }
// ============================================================
export const aiChatbot = async (req, res) => {
  try {
    const { query: userQuery } = req.body || {};

    if (!userQuery?.trim()) {
      return res.status(400).json({ success: false, error: 'query required.' });
    }

    const reply = chatbotReply(userQuery);
    return res.json({ success: true, reply });
  } catch (err) {
    console.error('aiChatbot error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};