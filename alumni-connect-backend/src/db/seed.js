import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool, query } from '../config/db.js';

dotenv.config();

const SEED_PASSWORD = 'password123';

// ============================================================
// Seed Data (from frontend mockData.ts)
// ============================================================

const UNIVERSITIES = [
  { id: 'tulas-inst', name: "Tula's Institute", short_name: "Tula's", location: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand', logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=120', verified_domains: ['tulas.edu.in'], student_count: 3850, alumni_count: 7200, latitude: 30.3473, longitude: 77.8920 },
  { id: 'graphic-era', name: 'Graphic Era University', short_name: 'GEU', location: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand', logo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=120', verified_domains: ['geu.ac.in'], student_count: 12400, alumni_count: 24500, latitude: 30.2709, longitude: 78.0069 },
  { id: 'iit-roorkee', name: 'Indian Institute of Technology Roorkee', short_name: 'IIT Roorkee', location: 'Roorkee', city: 'Roorkee', state: 'Uttarakhand', logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=120', verified_domains: ['iitr.ac.in'], student_count: 8900, alumni_count: 38000, latitude: 29.8659, longitude: 77.8963 },
  { id: 'iit-hyderabad', name: 'Indian Institute of Technology Hyderabad', short_name: 'IIT Hyderabad', location: 'Kandi, Sangareddy', city: 'Hyderabad', state: 'Telangana', logo: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=120', verified_domains: ['iith.ac.in'], student_count: 4200, alumni_count: 11000, latitude: 17.5947, longitude: 78.1230 },
  { id: 'bits-pilani', name: 'BITS Pilani', short_name: 'BITS', location: 'Pilani & Hyderabad', city: 'Pilani', state: 'Rajasthan', logo: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=120', verified_domains: ['pilani.bits-pilani.ac.in'], student_count: 16500, alumni_count: 52000, latitude: 28.3639, longitude: 75.5870 },
  { id: 'dtu-delhi', name: 'Delhi Technological University', short_name: 'DTU', location: 'New Delhi', city: 'New Delhi', state: 'Delhi NCR', logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=120', verified_domains: ['dtu.ac.in'], student_count: 14200, alumni_count: 41000, latitude: 28.7501, longitude: 77.1177 },
  { id: 'nit-trichy', name: 'National Institute of Technology Tiruchirappalli', short_name: 'NIT Trichy', location: 'Tiruchirappalli', city: 'Tiruchirappalli', state: 'Tamil Nadu', logo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=120', verified_domains: ['nitt.edu'], student_count: 6800, alumni_count: 29000, latitude: 10.7589, longitude: 78.8132 },
];

const STUDENT_USER = {
  id: 'student-ayushi-arya',
  name: 'Ayushi Arya',
  email: 'ayushi.arya@tulas.edu.in',
  role: 'student',
  university: "Tula's Institute",
  avatar: '',
  is_email_verified: 1,
  approval_status: 'approved',
  verification_status: 'verified',
};

const ALUMNI_USERS = [
  { id: 'alumni-1', name: 'Priya Patel', email: 'priya.patel@microsoft.com', university: 'Indian Institute of Technology Roorkee', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', profile: { degree: 'B.Tech in CSE', department: 'Computer Science', graduation_year: 2020, job_title: 'Senior Software Engineer', company: 'Microsoft', industry: 'Cloud & Distributed Systems', location: 'Bengaluru, Karnataka', city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, skills: ['Azure Cloud','Distributed Systems','C#','Go','Kubernetes','System Design','Python'], expertise: ['System Design','Cloud Architecture'], bio: 'IIT Roorkee 2020 alumna. Currently designing high-throughput ingestion pipelines for Azure Monitor at Microsoft IDC Bangalore.', experience_years: 6, available_for_mentorship: 1, mentorship_topics: ['System Design','Cloud Infrastructure','Product SDE Interviews','Resume Critique'], mentorship_categories: ['Career Guidance','Technical Skills'], linkedin_url: 'https://linkedin.com/in/priya-patel-cloud', rating: 4.9, reviews_count: 38, career_trajectory: [{year:'2023 - Present',role:'Senior Software Engineer',company:'Microsoft',desc:'Leading distributed streaming'}] } },
  { id: 'alumni-2', name: 'Rohan Malhotra', email: 'rohan.m@google.com', university: 'Indian Institute of Technology Roorkee', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', profile: { degree: 'M.Tech in AI & DS', department: 'Computer Science', graduation_year: 2019, job_title: 'Staff Machine Learning Engineer', company: 'Google', industry: 'Artificial Intelligence & LLMs', location: 'Hyderabad, Telangana', city: 'Hyderabad', state: 'Telangana', latitude: 17.3850, longitude: 78.4867, skills: ['PyTorch','LLMs','Transformers','Python','MLOps','Generative AI','Machine Learning'], expertise: ['AI Research','LLMs'], bio: 'Ex-Researcher at IIT Roorkee, now developing multilingual generative AI models at Google.', experience_years: 7, available_for_mentorship: 1, mentorship_topics: ['AI / ML Careers','Research Publications','LLM Fine-tuning','Python for Data Science'], mentorship_categories: ['Technical Skills','Higher Studies'], linkedin_url: 'https://linkedin.com/in/rohan-malhotra-ai', rating: 5.0, reviews_count: 52 } },
  { id: 'alumni-3', name: 'Aditya Negi', email: 'aditya.negi@zomato.com', university: "Tula's Institute", avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', profile: { degree: 'B.Tech in CSE', department: 'Computer Science', graduation_year: 2021, job_title: 'Tech Lead - Payments', company: 'Zomato', industry: 'FinTech & E-Commerce', location: 'Gurgaon, Haryana', city: 'Gurgaon', state: 'Delhi NCR', latitude: 28.4595, longitude: 77.0266, skills: ['Go','Node.js','Redis','Kafka','PostgreSQL','High-Volume Payments'], expertise: ['Backend Scaling'], bio: "Proud Tula's Institute Dehradun alumnus. From college projects in Uttarakhand to scaling millions of transactions per minute at Zomato.", experience_years: 5, available_for_mentorship: 1, mentorship_topics: ['DSA','Tier-2 to Product Company','Backend Scaling','Resume Review'], mentorship_categories: ['Placements','Technical Skills'], linkedin_url: 'https://linkedin.com/in/aditya-negi-zomato', rating: 4.95, reviews_count: 47 } },
  { id: 'alumni-4', name: 'Sneha Rawat', email: 'sneha.rawat@razorpay.com', university: 'Graphic Era University', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400', profile: { degree: 'B.Tech in IT', department: 'Information Technology', graduation_year: 2021, job_title: 'Lead Frontend Architect', company: 'Razorpay', industry: 'FinTech', location: 'Bengaluru, Karnataka', city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, skills: ['React','TypeScript','Next.js','Design Systems','Web Performance','GraphQL','UI/UX'], expertise: ['Frontend Architecture'], bio: 'Graphic Era Dehradun alumna. Building enterprise checkout SDKs and dashboard design systems at Razorpay.', experience_years: 5, available_for_mentorship: 1, mentorship_topics: ['Frontend Engineering','UI/UX','Next.js & React','Mock Interviews'], mentorship_categories: ['Technical Skills','Career Guidance'], linkedin_url: 'https://linkedin.com/in/sneha-rawat-dev', rating: 4.9, reviews_count: 33 } },
  { id: 'alumni-rahul-sharma', name: 'Rahul Sharma', email: 'rahul.sharma@microsoft.com', university: 'Indian Institute of Technology Roorkee', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', profile: { degree: 'B.Tech & M.Tech in CSE', department: 'Computer Science', graduation_year: 2018, job_title: 'Machine Learning Engineer', company: 'Microsoft', industry: 'Artificial Intelligence & Machine Learning', location: 'Bengaluru, Karnataka', city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, skills: ['Machine Learning','PyTorch','Deep Learning','Azure AI','Python','Computer Vision','NLP'], expertise: ['ML Engineering'], bio: 'IIT Roorkee alumnus. 7 years experience building large-scale deep learning models at Microsoft IDC.', experience_years: 7, available_for_mentorship: 1, mentorship_topics: ['Machine Learning','Interview Preparation','Career Guidance','Resume Review'], mentorship_categories: ['Technical Skills','Career Guidance'], linkedin_url: 'https://linkedin.com/in/rahul-sharma-ml', rating: 4.98, reviews_count: 64 } },
  { id: 'alumni-ananya-verma', name: 'Ananya Verma', email: 'ananya.verma@google.com', university: "Tula's Institute", avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', profile: { degree: 'B.Tech in CSE', department: 'Computer Science', graduation_year: 2020, job_title: 'Data Scientist', company: 'Google', industry: 'Data Science & Analytics', location: 'Bengaluru, Karnataka', city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, skills: ['Data Science','Python','SQL','BigQuery','Predictive Modeling','Statistics','Machine Learning'], expertise: ['Data Science'], bio: "Tula's Institute alumna. Currently Data Scientist at Google working on search ads optimization.", experience_years: 5, available_for_mentorship: 1, mentorship_topics: ['Data Science Roadmap','SQL & Big Data','Python for Analytics','Cracking Tier-1 Roles'], mentorship_categories: ['Career Guidance','Technical Skills'], linkedin_url: 'https://linkedin.com/in/ananya-verma-ds', rating: 4.94, reviews_count: 42 } },
  { id: 'alumni-vikram-joshi', name: 'Vikram Joshi', email: 'vikram.j@amazon.com', university: 'Graphic Era University', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', profile: { degree: 'B.Tech in CS', department: 'Computer Science', graduation_year: 2019, job_title: 'Machine Learning Engineer', company: 'Amazon', industry: 'E-Commerce & Computer Vision', location: 'Hyderabad, Telangana', city: 'Hyderabad', state: 'Telangana', latitude: 17.3850, longitude: 78.4867, skills: ['Machine Learning','AWS SageMaker','PyTorch','Python','Deep Learning','Docker'], expertise: ['ML Engineering'], bio: 'Graphic Era University alumnus. ML Engineer at Amazon Hyderabad.', experience_years: 6, available_for_mentorship: 1, mentorship_topics: ['ML System Design','AWS SageMaker','Resume Review'], mentorship_categories: ['Technical Skills','Placements'], linkedin_url: 'https://linkedin.com/in/vikram-joshi-amazon', rating: 4.88, reviews_count: 29 } },
  { id: 'alumni-arjun-rao', name: 'Dr. Arjun Rao', email: 'arjun.rao@adobe.com', university: 'Indian Institute of Technology Hyderabad', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', profile: { degree: 'PhD in AI', department: 'Computer Science', graduation_year: 2018, job_title: 'AI/ML Researcher', company: 'Adobe', industry: 'Generative Media & Research', location: 'Bengaluru, Karnataka', city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, skills: ['AI/ML Research','Generative AI','Diffusion Models','PyTorch','Python','Deep Learning','Machine Learning'], expertise: ['AI Research'], bio: 'IIT Hyderabad alumnus and AI/ML Researcher at Adobe.', experience_years: 8, available_for_mentorship: 1, mentorship_topics: ['AI / ML Research','PhD & Higher Studies','Publishing','Generative AI'], mentorship_categories: ['Higher Studies','Technical Skills'], linkedin_url: 'https://linkedin.com/in/dr-arjun-rao-ai', rating: 5.0, reviews_count: 45 } },
  { id: 'alumni-kunal-pm', name: 'Kunal Shah', email: 'kunal.shah@razorpay.com', university: 'BITS Pilani', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', profile: { degree: 'B.E. & M.Sc. in Information Systems', department: 'Computer Science', graduation_year: 2017, job_title: 'Lead Product Manager', company: 'Razorpay', industry: 'Product Management & FinTech', location: 'Bengaluru, Karnataka', city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, skills: ['Product Management','Product Strategy','User Research','Agile Roadmap','Go-To-Market','Metrics & Analytics'], expertise: ['Product Strategy'], bio: 'BITS Pilani alumnus. Lead PM at Razorpay scaling B2B payout infrastructure.', experience_years: 8, available_for_mentorship: 1, mentorship_topics: ['Transition to PM','Product Case Studies','Roadmapping','PRD Design'], mentorship_categories: ['Career Guidance','Interview Preparation'], linkedin_url: 'https://linkedin.com/in/kunal-shah-product', rating: 4.96, reviews_count: 58 } },
  { id: 'alumni-riya-design', name: 'Riya Sen', email: 'riya.sen@cred.club', university: 'Graphic Era University', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', profile: { degree: 'B.Des & Visual Communications', department: 'Design & Media', graduation_year: 2020, job_title: 'Staff UI/UX Designer', company: 'CRED', industry: 'UI/UX Design', location: 'Bengaluru, Karnataka', city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, skills: ['UI/UX Design','Figma','Design Systems','Prototyping','Micro-Interactions','User Research'], expertise: ['UI/UX Design'], bio: 'Graphic Era University alumna. Staff Product Designer at CRED.', experience_years: 6, available_for_mentorship: 1, mentorship_topics: ['Design Portfolio Critique','Figma & Design Systems','UI/UX Interviews'], mentorship_categories: ['Technical Skills','Career Guidance'], linkedin_url: 'https://linkedin.com/in/riya-sen-ux', rating: 4.98, reviews_count: 51 } },
];

const TEACHER_USERS = [
  { id: 'teacher-sunita-sen', name: 'Dr. Sunita Sen', email: 'sunita.sen@iitr.ac.in', university: 'Indian Institute of Technology Roorkee', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', profile: { department: 'Department of Computer Science & Engineering', designation: 'Professor & Head of AI Laboratory', experience_years: 14, skills: ['Machine Learning','Python','Deep Learning','PyTorch','Data Science','Statistics','NLP'], expertise: ['Machine Learning','Deep Neural Networks'], subjects_can_teach: ['Machine Learning','Python','Data Science','Deep Learning'], mentorship_topics: ['ML Foundations','Python for Data Science','Research Guidance'], office_hours: 'Mon & Thu 3:00 PM - 5:30 PM IST', bio: 'Professor of AI at IIT Roorkee with 14+ years of academic research.', location: 'Roorkee, Uttarakhand', available_for_mentorship: 1 } },
  { id: 'teacher-vikram-mehra', name: 'Prof. Vikram Mehra', email: 'vikram.mehra@tulas.edu.in', university: "Tula's Institute", avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', profile: { department: 'Department of Computer Science', designation: 'Associate Professor', experience_years: 9, skills: ['Python','Machine Learning','SQL','Data Science','Database Systems','Java'], expertise: ['ML','Data Analytics'], subjects_can_teach: ['Python Programming','Machine Learning','SQL & Data Systems'], mentorship_topics: ['Python Fundamentals','ML Projects','DB Systems'], office_hours: 'Tue & Fri 2:00 PM - 4:00 PM IST', bio: 'Associate Professor passionate about bridge programs between academia and industry.', location: 'Dehradun, Uttarakhand', available_for_mentorship: 1 } },
  { id: 'teacher-ananya-mukherjee', name: 'Dr. Ananya Mukherjee', email: 'ananya.m@geu.ac.in', university: 'Graphic Era University', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400', profile: { department: 'School of Computing', designation: 'Assistant Professor of AI & Data Science', experience_years: 6, skills: ['Python','Natural Language Processing','Machine Learning','Data Science','PyTorch'], expertise: ['NLP','Data Science'], subjects_can_teach: ['NLP','Machine Learning','Python','Data Science'], mentorship_topics: ['NLP with Python','ML Research','Data Science'], office_hours: 'Wed 11:00 AM - 1:00 PM IST', bio: 'Assistant Professor specializing in NLP and conversational AI.', location: 'Dehradun, Uttarakhand', available_for_mentorship: 1 } },
];

const ACHIEVEMENTS = [
  { id: 'ach-1', person_id: 'alumni-rahul-sharma', person_name: 'Rahul Sharma', person_role: 'alumni', title: 'Promoted to Senior ML Engineer at Microsoft', category: 'Career Achievement', description: 'Led optimization of large foundation model inferencing in Microsoft Copilot.', year: 2024, institution: 'IIT Roorkee', badge: 'Enterprise Excellence', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', company_or_org: 'Microsoft' },
  { id: 'ach-2', person_id: 'alumni-1', person_name: 'Priya Patel', person_role: 'alumni', title: 'Microsoft High Impact Award 2024', category: 'Innovation', description: 'Awarded for designing high-resiliency streaming architecture.', year: 2024, institution: 'IIT Roorkee', badge: 'High Impact', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', company_or_org: 'Microsoft' },
];

const EVENTS = [
  { id: 'event-1', title: 'Cracking Tier-1 Tech: Off-Campus SDE Roadmap', event_date: 'Saturday, Oct 12, 2026', event_time: '6:00 PM - 7:30 PM IST', location: 'Virtual (Zoom)', type: 'Webinar', organizer: 'Alumni Connect Council', institution: 'IIT Roorkee & Tula\'s Institute', attendees_count: 420, image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600', description: 'Interactive session with senior engineers.', registration_open: 1, status: 'approved' },
  { id: 'event-2', title: 'Annual Dehradun Campus-Alumni Networking Summit', event_date: 'Friday, Nov 07, 2026', event_time: '10:00 AM - 5:00 PM IST', location: 'Auditorium, Tula\'s Institute', type: 'Networking', organizer: 'Uttarakhand Consortium', institution: 'Tula\'s & GEU', attendees_count: 750, image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600', description: 'In-person networking summit.', registration_open: 1, status: 'approved' },
];

const OPPORTUNITIES = [
  { id: 'opp-1', title: 'Software Engineer Intern (Cloud)', company: 'Microsoft', location: 'Bengaluru / Hyderabad', type: 'Internship', posted_by: 'Priya Patel', alumni_id: 'alumni-1', institution: 'IIT Roorkee', salary_or_stipend: '₹1,25,000/month', deadline: 'Oct 30, 2026', skills_required: ['Go','C#','Azure','Distributed Systems'], description: 'Join Azure telemetry infrastructure team.', status: 'approved' },
  { id: 'opp-2', title: 'Backend Engineer (Go)', company: 'Zomato', location: 'Gurgaon, Haryana', type: 'Full-time', posted_by: 'Aditya Negi', alumni_id: 'alumni-3', institution: "Tula's Institute", salary_or_stipend: '₹16 - ₹22 LPA', deadline: 'Nov 01, 2026', skills_required: ['Go','Kafka','PostgreSQL','Redis'], description: 'Alumni referral for high-volume payment microservices.', status: 'approved' },
  { id: 'opp-3', title: 'Machine Learning Research Intern', company: 'Google', location: 'Hyderabad, Telangana', type: 'Internship', posted_by: 'Rohan Malhotra', alumni_id: 'alumni-2', institution: 'IIT Roorkee', salary_or_stipend: '₹1,40,000/month', deadline: 'Dec 05, 2026', skills_required: ['Python','Machine Learning','PyTorch','Transformers'], description: 'Collaborate with Google Indic language team.', status: 'approved' },
];

// ============================================================
// Insert Functions
// ============================================================

const seedDatabase = async () => {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Hash password once (reuse for all)
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

    // 2. Insert Universities
    console.log('📚 Inserting universities...');
    for (const u of UNIVERSITIES) {
      await query(
        `INSERT INTO universities (id, name, short_name, location, city, state, logo, verified_domains, student_count, alumni_count, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [u.id, u.name, u.short_name, u.location, u.city, u.state, u.logo, JSON.stringify(u.verified_domains), u.student_count, u.alumni_count, u.latitude, u.longitude]
      );
    }
    console.log(`   ✅ ${UNIVERSITIES.length} universities inserted\n`);

    // 3. Insert Student User
    console.log('👤 Inserting student user...');
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, university, avatar, is_email_verified, approval_status, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)`,
      [STUDENT_USER.id, STUDENT_USER.name, STUDENT_USER.email, passwordHash, STUDENT_USER.role, STUDENT_USER.university, STUDENT_USER.avatar, STUDENT_USER.is_email_verified, STUDENT_USER.approval_status, STUDENT_USER.verification_status]
    );

    // Insert student profile
    await query(
      `INSERT INTO student_profiles (user_id, course, department, graduation_year, skills, interests, learning_goals, career_goals, location, bio, profile_completion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE course = VALUES(course)`,
      [STUDENT_USER.id, 'B.Tech Computer Science and Engineering', 'Computer Science', 2026,
       JSON.stringify(['Data Structures','Python','React','PostgreSQL','Machine Learning','Git','Java','Docker']),
       JSON.stringify(['Cloud Computing','Product SDE Roles','System Design','AI Careers']),
       JSON.stringify(['Machine Learning','Python','Data Science']),
       'Aspiring Machine Learning & Software Development Engineer.',
       'Dehradun, Uttarakhand',
       'Pre-final year B.Tech CSE student. Passionate about full-stack web applications and AI.',
       85]
    );
    console.log(`   ✅ Student + profile inserted\n`);

    // 4. Insert Alumni Users + Profiles
    console.log('👥 Inserting alumni...');
    for (const a of ALUMNI_USERS) {
      const p = a.profile;
      await query(
        `INSERT INTO users (id, name, email, password_hash, role, university, avatar, is_email_verified, approval_status, verification_status)
         VALUES (?, ?, ?, ?, 'alumni', ?, ?, TRUE, 'approved', 'verified')
         ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)`,
        [a.id, a.name, a.email, passwordHash, a.university, a.avatar]
      );

      await query(
        `INSERT INTO alumni_profiles (user_id, degree, department, graduation_year, job_title, company, industry, location, city, state, latitude, longitude, skills, expertise, bio, experience_years, career_trajectory, available_for_mentorship, mentorship_topics, mentorship_categories, linkedin_url, rating, reviews_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE job_title = VALUES(job_title)`,
        [a.id, p.degree, p.department, p.graduation_year, p.job_title, p.company, p.industry, p.location, p.city, p.state,
         p.latitude || null, p.longitude || null,
         JSON.stringify(p.skills), JSON.stringify(p.expertise || []), p.bio, p.experience_years,
         JSON.stringify(p.career_trajectory || []),
         p.available_for_mentorship, JSON.stringify(p.mentorship_topics), JSON.stringify(p.mentorship_categories),
         p.linkedin_url, p.rating, p.reviews_count]
      );
    }
    console.log(`   ✅ ${ALUMNI_USERS.length} alumni inserted\n`);

    // 5. Insert Teachers
    console.log('👨‍🏫 Inserting teachers...');
    for (const t of TEACHER_USERS) {
      const p = t.profile;
      await query(
        `INSERT INTO users (id, name, email, password_hash, role, university, avatar, is_email_verified, approval_status, verification_status)
         VALUES (?, ?, ?, ?, 'teacher', ?, ?, TRUE, 'approved', 'verified')
         ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)`,
        [t.id, t.name, t.email, passwordHash, t.university, t.avatar]
      );

      await query(
        `INSERT INTO teacher_profiles (user_id, department, designation, experience_years, skills, expertise, subjects_can_teach, mentorship_topics, office_hours, bio, location, available_for_mentorship)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE designation = VALUES(designation)`,
        [t.id, p.department, p.designation, p.experience_years,
         JSON.stringify(p.skills), JSON.stringify(p.expertise), JSON.stringify(p.subjects_can_teach),
         JSON.stringify(p.mentorship_topics), p.office_hours, p.bio, p.location, p.available_for_mentorship]
      );
    }
    console.log(`   ✅ ${TEACHER_USERS.length} teachers inserted\n`);

    // 6. Insert Achievements
    console.log('🏆 Inserting achievements...');
    for (const ach of ACHIEVEMENTS) {
      await query(
        `INSERT INTO achievements (id, person_id, person_name, person_role, title, category, description, year, institution, badge, avatar, company_or_org)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title)`,
        [ach.id, ach.person_id, ach.person_name, ach.person_role, ach.title, ach.category, ach.description, ach.year, ach.institution, ach.badge, ach.avatar, ach.company_or_org]
      );
    }
    console.log(`   ✅ ${ACHIEVEMENTS.length} achievements inserted\n`);

    // 7. Insert Events
    console.log('📅 Inserting events...');
    for (const e of EVENTS) {
      await query(
        `INSERT INTO events (id, title, event_date, event_time, location, type, organizer, institution, attendees_count, image, description, registration_open, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title)`,
        [e.id, e.title, e.event_date, e.event_time, e.location, e.type, e.organizer, e.institution, e.attendees_count, e.image, e.description, e.registration_open, e.status]
      );
    }
    console.log(`   ✅ ${EVENTS.length} events inserted\n`);

    // 8. Insert Opportunities
    console.log('💼 Inserting opportunities...');
    for (const o of OPPORTUNITIES) {
      await query(
        `INSERT INTO opportunities (id, title, company, location, type, posted_by, alumni_id, institution, salary_or_stipend, deadline, skills_required, description, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title)`,
        [o.id, o.title, o.company, o.location, o.type, o.posted_by, o.alumni_id, o.institution, o.salary_or_stipend, o.deadline, JSON.stringify(o.skills_required), o.description, o.status]
      );
    }
    console.log(`   ✅ ${OPPORTUNITIES.length} opportunities inserted\n`);

    console.log('🎉 Database seeding complete!');
    console.log(`\n📝 Test Login Credentials:`);
    console.log(`   Student:  ayushi.arya@tulas.edu.in / ${SEED_PASSWORD}`);
    console.log(`   Alumni:   priya.patel@microsoft.com / ${SEED_PASSWORD}`);
    console.log(`   Teacher:  sunita.sen@iitr.ac.in / ${SEED_PASSWORD}\n`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    await pool.end();
    process.exit(1);
  }
};

seedDatabase();