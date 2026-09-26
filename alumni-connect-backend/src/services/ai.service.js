// ============================================================
// AI Service — Ported from frontend utils/aiEngines.ts
// Same logic, Node.js compatible
// ============================================================

// ============================================================
// AI Resume Analysis
// ============================================================
export const calculateAIResumeAnalysis = (student, targetRole = 'Data Scientist') => {
  const currentSkills = (student.skills || []).map(s => s.toLowerCase());

  const roleSkillMap = {
    'data scientist': {
      core: ['python', 'machine learning', 'statistics', 'sql', 'data structures'],
      tools: ['pandas', 'numpy', 'scikit-learn', 'power bi', 'bigquery', 'tableau'],
      recommended: [
        'Improve Statistics & Probability',
        'Build 2 Production ML Projects',
        'Learn Power BI / Tableau',
      ],
    },
    'machine learning engineer': {
      core: ['python', 'pytorch', 'machine learning', 'deep learning', 'docker', 'system design'],
      tools: ['mlops', 'fastapi', 'transformers', 'kubernetes', 'tensorflow'],
      recommended: [
        'Master Transformer fine-tuning with PyTorch',
        'Deploy ML models using FastAPI & Docker',
        'Study Distributed System Design',
      ],
    },
    'software development engineer': {
      core: ['data structures', 'algorithms', 'system design', 'react', 'postgresql', 'git'],
      tools: ['docker', 'kubernetes', 'redis', 'kafka', 'go', 'node.js'],
      recommended: [
        'Solve 100+ LeetCode Medium Problems',
        'Implement a Distributed Caching / Messaging Project',
        'Master Low-Level System Design (LLD)',
      ],
    },
    'cloud & devops engineer': {
      core: ['docker', 'kubernetes', 'linux', 'aws', 'azure', 'git'],
      tools: ['terraform', 'ci/cd', 'ansible', 'prometheus', 'grafana'],
      recommended: [
        'Achieve AWS Solutions Architect / CKA Certification',
        'Build Multi-Stage GitOps Pipelines',
        'Configure Prometheus & Grafana Monitoring',
      ],
    },
  };

  const normalizedRole =
    Object.keys(roleSkillMap).find(r => targetRole.toLowerCase().includes(r)) || 'data scientist';

  const roleReq = roleSkillMap[normalizedRole];
  const allNeeded = [...roleReq.core, ...roleReq.tools];

  const strengths = allNeeded.filter(skill =>
    currentSkills.some(cs => cs.includes(skill) || skill.includes(cs))
  );

  const missingSkills = allNeeded.filter(
    skill => !currentSkills.some(cs => cs.includes(skill) || skill.includes(cs))
  );

  const currentMatchScore = Math.min(
    95,
    Math.max(45, Math.round((strengths.length / allNeeded.length) * 100))
  );

  return {
    targetRole,
    currentMatchScore,
    strengths: strengths.map(s => s.toUpperCase()),
    skillGaps: missingSkills.slice(0, 4).map(s => s.toUpperCase()),
    missingSkills: missingSkills.map(s => s.toUpperCase()),
    suggestedRoles: [
      targetRole,
      normalizedRole === 'data scientist' ? 'Machine Learning Engineer' : 'Full Stack Developer',
      'Backend Systems Engineer',
    ],
    recommendedIndustries: [
      'Enterprise Cloud & SaaS',
      'Artificial Intelligence & Deep Tech',
      'FinTech & High-Frequency Systems',
    ],
    recommendedActions: roleReq.recommended,
  };
};

// ============================================================
// AI Mentor / Teacher Matchmaking
// ============================================================
export const matchTeachersAndMentorsAI = (query, student, teachers = [], alumni = []) => {
  const cleanQ = (query || '').toLowerCase().trim();

  const candidates = [
    ...teachers.map(t => ({ mentor: t, mentorType: 'teacher' })),
    ...alumni
      .filter(a => a.available_for_mentorship)
      .map(a => ({ mentor: a, mentorType: 'alumni' })),
  ];

  const studentSkills = (student.skills || []).map(s => s.toLowerCase());
  const studentGoals = (student.learning_goals || student.lookingForGuidanceIn || [student.career_goals || 'Machine Learning'])
    .map(g => (g || '').toLowerCase());
  const studentInterests = (student.interests || ['ai/ml', 'cloud']).map(i => i.toLowerCase());

  const matches = candidates.map(({ mentor, mentorType }) => {
    const isTeacher = mentorType === 'teacher';

    const mentorSkills = (mentor.skills || []).map(s => s.toLowerCase());
    const mentorSubjects = (
      isTeacher
        ? mentor.subjects_can_teach || mentor.mentorship_topics || []
        : mentor.subjectsCanTeach || mentor.mentorship_topics || []
    ).map(s => s.toLowerCase());

    // 1. Query score (30%)
    let queryScore = 55;
    if (cleanQ) {
      if (cleanQ.includes('machine learning') || cleanQ.includes('ml')) {
        if (mentorSkills.some(s => s.includes('machine learning') || s === 'ml') || mentorSubjects.some(s => s.includes('machine learning'))) {
          queryScore += 38;
        }
      }
      if (cleanQ.includes('python')) {
        if (mentorSkills.includes('python') || mentorSubjects.some(s => s.includes('python'))) {
          queryScore += 30;
        }
      }
      if (cleanQ.includes('data science') || cleanQ.includes('deep learning')) {
        if (mentorSkills.some(s => s.includes('data science') || s.includes('deep learning'))) {
          queryScore += 28;
        }
      }
      if (cleanQ.includes('system design') || cleanQ.includes('backend')) {
        if (mentorSkills.some(s => s.includes('system design') || s.includes('go') || s.includes('backend'))) {
          queryScore += 35;
        }
      }
      if (cleanQ.includes('cloud') || cleanQ.includes('aws') || cleanQ.includes('azure')) {
        if (mentorSkills.some(s => s.includes('cloud') || s.includes('azure') || s.includes('aws'))) {
          queryScore += 35;
        }
      }
    } else {
      queryScore = 80;
    }
    const queryAlignment = Math.min(99, Math.max(50, queryScore));

    // 2. Learning goal alignment (25%)
    let goalScore = 60;
    const matchingGoals = studentGoals.filter(goal =>
      mentorSubjects.some(s => s.includes(goal) || goal.includes(s)) ||
      mentorSkills.some(s => s.includes(goal) || goal.includes(s))
    );
    if (matchingGoals.length > 0) goalScore += Math.min(38, matchingGoals.length * 20);
    const learningGoalAlignment = Math.min(99, Math.max(52, goalScore));

    // 3. Skill overlap (20%)
    const matchingSkills = (mentor.skills || []).filter(ms =>
      studentSkills.some(ss => ss.includes(ms.toLowerCase()) || ms.toLowerCase().includes(ss))
    );
    const missingSkills = (mentor.skills || [])
      .filter(ms => !matchingSkills.some(m => m.toLowerCase() === ms.toLowerCase()))
      .slice(0, 3);
    const skillRatio = (mentor.skills || []).length > 0
      ? matchingSkills.length / Math.min(mentor.skills.length, 5)
      : 0.5;
    const skillOverlap = Math.min(98, Math.max(52, Math.round(skillRatio * 95) + 10));

    // 4. Interest alignment (15%)
    let interestScore = 65;
    const sharedInterests = studentInterests.filter(si =>
      (mentor.expertise || []).some(me => me.toLowerCase().includes(si)) ||
      mentorSubjects.some(ms => ms.includes(si) || si.includes(ms))
    );
    if (sharedInterests.length > 0) interestScore += Math.min(30, sharedInterests.length * 15);
    const interestAlignment = Math.min(98, Math.max(55, interestScore));

    // 5. Experience relevance (10%)
    const exp = mentor.experience_years || mentor.experienceYears || 4;
    const experienceRelevance = Math.min(98, 70 + exp * 2.4);

    const matchPercentage = Math.min(
      99,
      Math.max(
        60,
        Math.round(
          queryAlignment * 0.3 +
          learningGoalAlignment * 0.25 +
          skillOverlap * 0.2 +
          interestAlignment * 0.15 +
          experienceRelevance * 0.1
        )
      )
    );

    let recommendationReason = '';
    if (cleanQ.includes('machine learning') || cleanQ.includes('ml')) {
      recommendationReason = `Strong match for your Machine Learning goals.`;
    } else if (matchingGoals.length > 0) {
      recommendationReason = `High alignment with your target learning goal in ${matchingGoals.slice(0, 2).join(' & ')}.`;
    } else {
      recommendationReason = `Strong technical compatibility and verified mentorship track record.`;
    }

    const goalNames = studentGoals.slice(0, 2).join(' and ') || 'Machine Learning';
    const mentorSubjectsNames = (mentor.subjects_can_teach || mentor.skills || []).slice(0, 3).join(', ');

    return {
      mentor,
      mentorType,
      matchPercentage,
      explanation: {
        summary: `Your interests in ${goalNames} align with ${mentor.name}'s expertise in ${mentorSubjectsNames}.`,
        matchingSkills: matchingSkills.length > 0 ? matchingSkills : [(mentor.skills || [])[0] || 'Python'],
        missingSkills: missingSkills.length > 0 ? missingSkills : ['Advanced Research'],
        sharedInterests: sharedInterests.length > 0 ? sharedInterests.map(i => i.toUpperCase()) : ['AI/ML', 'TECHNICAL CAREERS'],
        relevantExpertise: mentor.expertise || (mentor.skills || []).slice(0, 3),
        recommendationReason,
        criteriaBreakdown: {
          skillOverlap,
          learningGoalAlignment,
          interestAlignment,
          mentorshipTopicAlignment: Math.round((goalScore + queryAlignment) / 2),
          experienceRelevance: Math.round(experienceRelevance),
        },
      },
    };
  });

  return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
};

// ============================================================
// AI Chatbot — Rule-based responses
// ============================================================
export const chatbotReply = (query) => {
  const q = query.toLowerCase().trim();

  if (/^(hello|hi|hey|namaste)/.test(q)) {
    return { text: "Hello! 👋 How can I help you explore LINKORA?" };
  }
  if (q.includes('how are you')) {
    return { text: "I'm doing great, thank you! How can I help you today?" };
  }
  if (q.includes('what can you do') || q.includes('help me') || q.includes('features')) {
    return {
      text: "I can assist you with:\n• Finding verified alumni by company, role, or university\n• Matching with 1-on-1 career mentors\n• Guiding you on how to send connection requests\n• Exploring alumni distribution across India\n• Explaining our student & alumni verification process.",
      action: { label: 'Explore Network', view: 'explore' },
    };
  }
  if ((q.includes('machine learning') || q.includes('ml')) && (q.includes('mentor') || q.includes('need'))) {
    return {
      text: "Sure! I can help you find ML mentors. Tell me your preferred company or experience level.",
      action: { label: 'View ML Mentors', view: 'mentors' },
    };
  }
  if (q.includes('microsoft')) {
    return {
      text: 'We have verified alumni working at Microsoft: Rahul Sharma (ML Engineer) and Priya Patel (Senior SDE, Cloud).',
      action: { label: 'Explore Microsoft Alumni', view: 'explore', query: 'Microsoft' },
    };
  }
  if (q.includes('google')) {
    return {
      text: 'We have verified alumni at Google, including Rohan Malhotra (Staff ML Engineer) and Ananya Verma (Data Scientist).',
      action: { label: 'View Google Alumni', view: 'explore', query: 'Google' },
    };
  }
  if (q.includes('how do i connect') || q.includes('how to connect')) {
    return {
      text: "To connect:\n1. Open Explore directory\n2. Click 'View Profile'\n3. Click 'Connect' to send a personalized note.\n\nIf not logged in, you'll be prompted to sign up.",
      action: { label: 'Go to Explore', view: 'explore' },
    };
  }
  return {
    text: `I understand you're interested in "${query}". Let me help you find relevant alumni or mentors.`,
    action: { label: `Search "${query}"`, view: 'explore', query },
  };
};