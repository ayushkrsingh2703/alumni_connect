-- ============================================================
-- ALUMNI CONNECT — MySQL Schema
-- ============================================================

-- Drop old tables (safe re-run ke liye)
DROP TABLE IF EXISTS otp_tokens;
DROP TABLE IF EXISTS profile_media;
DROP TABLE IF EXISTS resumes;
DROP TABLE IF EXISTS student_certs;
DROP TABLE IF EXISTS student_projects;
DROP TABLE IF EXISTS student_skills;
DROP TABLE IF EXISTS event_registrations;
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS mentorships;
DROP TABLE IF EXISTS connections;
DROP TABLE IF EXISTS teacher_profiles;
DROP TABLE IF EXISTS alumni_profiles;
DROP TABLE IF EXISTS student_profiles;
DROP TABLE IF EXISTS universities;
DROP TABLE IF EXISTS users;

-- ============================================================
-- 1. USERS (auth for all roles)
-- ============================================================
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','alumni','teacher','admin') NOT NULL,
  university VARCHAR(200),
  avatar VARCHAR(500),
  is_email_verified BOOLEAN DEFAULT FALSE,
  approval_status ENUM('pending','approved','rejected') DEFAULT 'approved',
  verification_status ENUM('verified','pending','under_review','rejected','info_requested','suspended') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- ============================================================
-- 2. UNIVERSITIES
-- ============================================================
CREATE TABLE universities (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  short_name VARCHAR(50),
  location VARCHAR(150),
  city VARCHAR(100),
  state VARCHAR(100),
  logo VARCHAR(500),
  verified_domains JSON,
  student_count INT DEFAULT 0,
  alumni_count INT DEFAULT 0,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. STUDENT PROFILES
-- ============================================================
CREATE TABLE student_profiles (
  user_id VARCHAR(64) PRIMARY KEY,
  course VARCHAR(200),
  department VARCHAR(150),
  graduation_year INT,
  gpa VARCHAR(20),
  skills JSON,
  interests JSON,
  learning_goals JSON,
  development_goals TEXT,
  experience_level ENUM('Beginner','Intermediate','Advanced') DEFAULT 'Intermediate',
  preferred_mentorship_areas JSON,
  career_goals TEXT,
  location VARCHAR(200),
  bio TEXT,
  profile_completion INT DEFAULT 0,
  linkedin_url VARCHAR(300),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 4. ALUMNI PROFILES
-- ============================================================
CREATE TABLE alumni_profiles (
  user_id VARCHAR(64) PRIMARY KEY,
  degree VARCHAR(200),
  department VARCHAR(150),
  graduation_year INT,
  job_title VARCHAR(200),
  company VARCHAR(200),
  company_logo VARCHAR(500),
  industry VARCHAR(150),
  location VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(100),
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  skills JSON,
  expertise JSON,
  bio TEXT,
  experience_years INT DEFAULT 0,
  career_trajectory JSON,
  achievements JSON,
  available_for_mentorship BOOLEAN DEFAULT TRUE,
  mentorship_topics JSON,
  mentorship_categories JSON,
  linkedin_url VARCHAR(300),
  rating DECIMAL(3, 2) DEFAULT 0,
  reviews_count INT DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 5. TEACHER PROFILES
-- ============================================================
CREATE TABLE teacher_profiles (
  user_id VARCHAR(64) PRIMARY KEY,
  department VARCHAR(200),
  designation VARCHAR(200),
  experience_years INT DEFAULT 0,
  skills JSON,
  expertise JSON,
  subjects_can_teach JSON,
  mentorship_topics JSON,
  office_hours VARCHAR(200),
  bio TEXT,
  location VARCHAR(200),
  linkedin_url VARCHAR(300),
  available_for_mentorship BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 6. CONNECTIONS
-- ============================================================
CREATE TABLE connections (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  student_name VARCHAR(150),
  student_avatar VARCHAR(500),
  student_university VARCHAR(200),
  alumni_id VARCHAR(64) NOT NULL,
  alumni_name VARCHAR(150),
  alumni_avatar VARCHAR(500),
  alumni_company VARCHAR(200),
  target_role ENUM('alumni','teacher') DEFAULT 'alumni',
  status ENUM('pending','accepted','rejected','blocked') DEFAULT 'pending',
  note TEXT,
  match_percentage INT,
  matched_skills JSON,
  match_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (alumni_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_student (student_id),
  INDEX idx_alumni (alumni_id),
  INDEX idx_status (status)
);

-- ============================================================
-- 7. MENTORSHIPS
-- ============================================================
CREATE TABLE mentorships (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  student_name VARCHAR(150),
  student_avatar VARCHAR(500),
  student_university VARCHAR(200),
  alumni_id VARCHAR(64) NOT NULL,
  alumni_name VARCHAR(150),
  alumni_company VARCHAR(200),
  goal VARCHAR(300),
  area_of_help VARCHAR(150),
  message TEXT,
  resume_url VARCHAR(500),
  status ENUM('pending','accepted','declined','completed') DEFAULT 'pending',
  scheduled_date VARCHAR(200),
  mentor_feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (alumni_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_student (student_id),
  INDEX idx_alumni (alumni_id)
);

-- ============================================================
-- 8. MESSAGES (chat)
-- ============================================================
CREATE TABLE messages (
  id VARCHAR(64) PRIMARY KEY,
  sender_id VARCHAR(64) NOT NULL,
  receiver_id VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sender (sender_id),
  INDEX idx_receiver (receiver_id),
  INDEX idx_conversation (sender_id, receiver_id)
);

-- ============================================================
-- 9. CHAT SESSIONS (5-minute timer)
-- ============================================================
CREATE TABLE chat_sessions (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  alumni_id VARCHAR(64) NOT NULL,
  time_remaining INT DEFAULT 300,
  is_locked BOOLEAN DEFAULT FALSE,
  price INT DEFAULT 20,
  unlocked_count INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_pair (student_id, alumni_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (alumni_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(50),
  title VARCHAR(200),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

-- ============================================================
-- 11. ACHIEVEMENTS
-- ============================================================
CREATE TABLE achievements (
  id VARCHAR(64) PRIMARY KEY,
  person_id VARCHAR(64),
  person_name VARCHAR(150),
  person_role ENUM('alumni','student'),
  title VARCHAR(300),
  category VARCHAR(100),
  description TEXT,
  year INT,
  institution VARCHAR(200),
  badge VARCHAR(150),
  avatar VARCHAR(500),
  company_or_org VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. EVENTS
-- ============================================================
CREATE TABLE events (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(300),
  event_date VARCHAR(100),
  event_time VARCHAR(100),
  location VARCHAR(300),
  type VARCHAR(80),
  organizer VARCHAR(200),
  institution VARCHAR(200),
  attendees_count INT DEFAULT 0,
  image VARCHAR(500),
  description TEXT,
  registration_open BOOLEAN DEFAULT TRUE,
  status VARCHAR(50) DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 13. EVENT REGISTRATIONS
-- ============================================================
CREATE TABLE event_registrations (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_reg (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 14. OPPORTUNITIES
-- ============================================================
CREATE TABLE opportunities (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(300),
  company VARCHAR(200),
  location VARCHAR(200),
  type VARCHAR(50),
  posted_by VARCHAR(150),
  alumni_id VARCHAR(64),
  institution VARCHAR(200),
  salary_or_stipend VARCHAR(150),
  deadline VARCHAR(100),
  skills_required JSON,
  description TEXT,
  status VARCHAR(50) DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 15. STUDENT SKILLS
-- ============================================================
CREATE TABLE student_skills (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(150),
  proficiency ENUM('Beginner','Intermediate','Advanced') DEFAULT 'Intermediate',
  category VARCHAR(100) DEFAULT 'Technical',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

-- ============================================================
-- 16. STUDENT PROJECTS
-- ============================================================
CREATE TABLE student_projects (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(200),
  description TEXT,
  tech_stack JSON,
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 17. STUDENT CERTIFICATIONS
-- ============================================================
CREATE TABLE student_certs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(200),
  issuing_organization VARCHAR(200),
  issue_date VARCHAR(50),
  credential_id VARCHAR(150),
  credential_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 18. RESUMES
-- ============================================================
CREATE TABLE resumes (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE,
  file_name VARCHAR(300),
  file_path VARCHAR(500),
  file_type VARCHAR(20),
  file_size VARCHAR(50),
  visibility ENUM('public','private') DEFAULT 'public',
  external_links JSON,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 19. PROFILE MEDIA
-- ============================================================
CREATE TABLE profile_media (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  url VARCHAR(500),
  caption VARCHAR(300),
  type VARCHAR(20) DEFAULT 'image',
  is_animated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

-- ============================================================
-- 20. OTP TOKENS
-- ============================================================
CREATE TABLE otp_tokens (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  email VARCHAR(180),
  token VARCHAR(10),
  expires_at TIMESTAMP,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_email (email)
);

-- ============================================================
-- DONE ✅
-- ============================================================