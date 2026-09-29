import { DatabaseSync } from "node:sqlite";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultPath = resolve(dirname(fileURLToPath(import.meta.url)), "data", "coda.sqlite");
const environment = globalThis.process?.env || {};
const previewInMemory = globalThis.process?.argv?.includes("--strictPort");
const configuredDatabase = environment.CODA_DATABASE || (previewInMemory ? ":memory:" : defaultPath);
const databasePath = configuredDatabase === ":memory:" ? ":memory:" : resolve(configuredDatabase);
if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");

export function now() {
  return new Date().toISOString();
}

function migrateUsersForAdminRole() {
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get()?.sql || "";
  if (!schema || schema.includes("'Admin'")) return;
  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN IMMEDIATE;
    CREATE TABLE users_v10 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Aluno','Professor','Admin')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );
    INSERT INTO users_v10(id,name,email,password_hash,password_salt,role,active,created_at,last_seen_at)
      SELECT id,name,email,password_hash,password_salt,role,active,created_at,last_seen_at FROM users;
    DROP TABLE users;
    ALTER TABLE users_v10 RENAME TO users;
    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

export function initDatabase() {
  migrateUsersForAdminRole();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Aluno','Professor','Admin')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS student_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      registration_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT 'Tecnologia',
      description TEXT NOT NULL DEFAULT '',
      join_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS enrollments (
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused')),
      enrolled_at TEXT NOT NULL,
      PRIMARY KEY(class_id, student_id)
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'question' CHECK(kind IN ('question','reply','comment')),
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT NOT NULL DEFAULT '',
      read_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspaces (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learning_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      course_id TEXT NOT NULL DEFAULT '',
      lesson_index INTEGER,
      data_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      course_id TEXT NOT NULL DEFAULT 'integrado',
      assessment_type TEXT NOT NULL DEFAULT 'quiz' CHECK(assessment_type IN ('quiz','simulado','atividade')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
      open_at TEXT,
      due_at TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 20,
      attempts_allowed INTEGER NOT NULL DEFAULT 1,
      minimum_score INTEGER NOT NULL DEFAULT 60,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assessment_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK(question_type IN ('multiple_choice','true_false','essay')),
      prompt TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]',
      correct_answer TEXT NOT NULL DEFAULT '',
      explanation TEXT NOT NULL DEFAULT '',
      points REAL NOT NULL DEFAULT 1,
      position INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attempt INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','reviewed')),
      answers_json TEXT NOT NULL DEFAULT '{}',
      score REAL NOT NULL DEFAULT 0,
      max_score REAL NOT NULL DEFAULT 0,
      feedback TEXT NOT NULL DEFAULT '',
      submitted_at TEXT NOT NULL,
      reviewed_at TEXT,
      UNIQUE(assessment_id, student_id, attempt)
    );
    CREATE TABLE IF NOT EXISTS attendance (
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present','absent','late','excused')),
      note TEXT NOT NULL DEFAULT '',
      recorded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(class_id, student_id, lesson_date)
    );
    CREATE TABLE IF NOT EXISTS gradebook (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      competency TEXT NOT NULL DEFAULT 'Fundamentos',
      score REAL NOT NULL,
      max_score REAL NOT NULL DEFAULT 100,
      feedback TEXT NOT NULL DEFAULT '',
      recorded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rubrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      criteria_json TEXT NOT NULL DEFAULT '[]',
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lesson_content (
      course_id TEXT NOT NULL,
      lesson_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
      context TEXT NOT NULL DEFAULT '',
      explanation TEXT NOT NULL DEFAULT '',
      system_example TEXT NOT NULL DEFAULT '',
      common_error TEXT NOT NULL DEFAULT '',
      activity TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL DEFAULT '',
      video_note TEXT NOT NULL DEFAULT '',
      objectives_json TEXT NOT NULL DEFAULT '[]',
      prerequisites_json TEXT NOT NULL DEFAULT '[]',
      checkpoints_json TEXT NOT NULL DEFAULT '[]',
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(course_id, lesson_index)
    );
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id TEXT NOT NULL,
      lesson_index INTEGER NOT NULL DEFAULT -1,
      material_type TEXT NOT NULL,
      author TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      instruction TEXT NOT NULL,
      starter_code TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
      due_at TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS institution_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      campus TEXT NOT NULL,
      privacy_email TEXT NOT NULL,
      primary_color TEXT NOT NULL,
      accent_color TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS privacy_tasks (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Nova conversa',
      course_id TEXT NOT NULL DEFAULT '',
      lesson_index INTEGER,
      mode TEXT NOT NULL DEFAULT 'explain' CHECK(mode IN ('explain','hint','code','quiz')),
      provider TEXT NOT NULL DEFAULT 'local',
      model TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      sources_json TEXT NOT NULL DEFAULT '[]',
      actions_json TEXT NOT NULL DEFAULT '[]',
      feedback INTEGER CHECK(feedback IN (-1,1)),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS institutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      campus TEXT NOT NULL,
      privacy_email TEXT NOT NULL,
      primary_color TEXT NOT NULL,
      accent_color TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL DEFAULT 'sistema',
      entity_id TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS backup_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      filename TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('manual','automatic')),
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lesson_content_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution_id INTEGER NOT NULL DEFAULT 1,
      course_id TEXT NOT NULL,
      lesson_index INTEGER NOT NULL,
      content_json TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_events_user_date ON learning_events(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id, submitted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, lesson_date DESC);
    CREATE INDEX IF NOT EXISTS idx_gradebook_class_student ON gradebook(class_id, student_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_rubrics_class ON rubrics(class_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at, id);
    CREATE INDEX IF NOT EXISTS idx_audit_institution_date ON audit_logs(institution_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_backup_institution_date ON backup_history(institution_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_lesson_versions ON lesson_content_versions(institution_id, course_id, lesson_index, created_at DESC);
  `);
  const addColumn = (table, column, definition) => {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(item => item.name);
    if (!columns.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  };
  addColumn("users", "institution_id", "INTEGER NOT NULL DEFAULT 1");
  addColumn("classes", "institution_id", "INTEGER NOT NULL DEFAULT 1");
  const timestamp = now();
  db.prepare(`INSERT OR IGNORE INTO institution_settings(id,name,short_name,campus,privacy_email,primary_color,accent_color,updated_at)
    VALUES(1,?,?,?,?,?,?,?)`).run("Instituição Coda", "CO", "Unidade principal", "privacidade@coda.local", "#5b3cc4", "#c4b5fd", timestamp);
  const legacyInstitution = db.prepare("SELECT * FROM institution_settings WHERE id=1").get();
  db.prepare(`INSERT OR IGNORE INTO institutions(id,name,short_name,campus,privacy_email,primary_color,accent_color,active,created_at,updated_at)
    VALUES(1,?,?,?,?,?,?,1,?,?)`).run(legacyInstitution.name, legacyInstitution.short_name, legacyInstitution.campus, legacyInstitution.privacy_email, legacyInstitution.primary_color, legacyInstitution.accent_color, timestamp, timestamp);
  const privacySeed = [
    ["inventario", "Inventário de dados", "Mapear quais dados pessoais são armazenados e por qual finalidade."],
    ["permissoes", "Revisão de permissões", "Revisar periodicamente os acessos administrativos e pedagógicos."],
    ["retencao", "Política de retenção", "Definir prazos para conservar ou remover registros que não são mais necessários."],
    ["backup", "Rotina de backups", "Manter cópias controladas e testar a restauração do banco SQLite."],
    ["transparencia", "Aviso de privacidade", "Informar de forma clara como os dados da plataforma são utilizados."]
  ];
  const insertPrivacy = db.prepare("INSERT OR IGNORE INTO privacy_tasks(id,label,description,completed,updated_at) VALUES(?,?,?,0,?)");
  privacySeed.forEach(([id, label, description]) => insertPrivacy.run(id, label, description, timestamp));
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now());
}

export function transaction(callback) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function publicUser(row) {
  if (!row) return null;
  return { id: Number(row.id), name: row.name, email: row.email, role: row.role, institutionId: Number(row.institution_id || 1), createdAt: row.created_at };
}

export function findUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE AND active = 1").get(email);
}

export function findUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ? AND active = 1").get(id);
}

export function createUser({ name, email, passwordHash, passwordSalt, role, institutionId = 1 }) {
  const timestamp = now();
  const result = db.prepare(`INSERT INTO users(name,email,password_hash,password_salt,role,institution_id,created_at,last_seen_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(name, email.toLowerCase(), passwordHash, passwordSalt, role, Number(institutionId) || 1, timestamp, timestamp);
  return publicUser(findUserById(result.lastInsertRowid));
}

export function findStudentByRegistration(registrationCode) {
  return db.prepare(`SELECT u.id,u.name,u.email,p.registration_code FROM student_profiles p
    JOIN users u ON u.id=p.user_id WHERE p.registration_code=? COLLATE NOCASE`).get(registrationCode) || null;
}

export function createStudentProfile(userId, registrationCode) {
  db.prepare("INSERT INTO student_profiles(user_id,registration_code,created_at) VALUES(?,?,?)")
    .run(userId, registrationCode.toUpperCase(), now());
  return db.prepare("SELECT user_id,registration_code,created_at FROM student_profiles WHERE user_id=?").get(userId);
}

export function touchUser(id) {
  db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").run(now(), id);
}

export function adminDashboard(adminId) {
  const institutionId = Number(db.prepare("SELECT institution_id FROM users WHERE id=?").get(adminId)?.institution_id || 1);
  const counts = {
    users: Number(db.prepare("SELECT COUNT(*) total FROM users WHERE institution_id=?").get(institutionId).total),
    students: Number(db.prepare("SELECT COUNT(*) total FROM users WHERE institution_id=? AND role='Aluno' AND active=1").get(institutionId).total),
    teachers: Number(db.prepare("SELECT COUNT(*) total FROM users WHERE institution_id=? AND role='Professor' AND active=1").get(institutionId).total),
    admins: Number(db.prepare("SELECT COUNT(*) total FROM users WHERE institution_id=? AND role='Admin' AND active=1").get(institutionId).total),
    classes: Number(db.prepare("SELECT COUNT(*) total FROM classes WHERE institution_id=? AND archived=0").get(institutionId).total),
    enrollments: Number(db.prepare("SELECT COUNT(*) total FROM enrollments e JOIN classes c ON c.id=e.class_id WHERE c.institution_id=? AND e.status='active'").get(institutionId).total),
    assessments: Number(db.prepare("SELECT COUNT(*) total FROM assessments a JOIN users u ON u.id=a.teacher_id WHERE u.institution_id=?").get(institutionId).total),
    lessons: Number(db.prepare("SELECT COUNT(*) total FROM lesson_content lc JOIN users u ON u.id=lc.updated_by WHERE u.institution_id=?").get(institutionId).total),
    messages: Number(db.prepare("SELECT COUNT(*) total FROM messages m JOIN classes c ON c.id=m.class_id WHERE c.institution_id=?").get(institutionId).total)
  };
  const users = db.prepare(`SELECT id,name,email,role,active,created_at,last_seen_at
    FROM users WHERE institution_id=? ORDER BY last_seen_at DESC,name LIMIT 500`).all(institutionId).map(row => ({ ...row, id: Number(row.id), active: Boolean(row.active) }));
  const classes = db.prepare(`SELECT c.id,c.name,c.subject,c.description,c.join_code,c.archived,c.created_at,
    u.id teacher_id,u.name teacher_name,u.email teacher_email,COUNT(CASE WHEN e.status='active' THEN 1 END) student_count
    FROM classes c JOIN users u ON u.id=c.teacher_id LEFT JOIN enrollments e ON e.class_id=c.id
    WHERE c.institution_id=? GROUP BY c.id ORDER BY c.archived,c.created_at DESC`).all(institutionId).map(row => ({ ...row, id: Number(row.id), student_count: Number(row.student_count), archived: Boolean(row.archived) }));
  const categoryMap = {
    "Web e front-end": ["html", "css", "javascript", "typescript"],
    "Sistemas e dados": ["python", "c", "cplus", "cpp", "sql"],
    "Aplicações": ["csharp", "java", "react", "reactnative"],
    "Hardware e IoT": ["esp32"]
  };
  const completedRows = db.prepare("SELECT e.course_id,COUNT(*) total,COUNT(DISTINCT e.user_id) participants FROM learning_events e JOIN users u ON u.id=e.user_id WHERE u.institution_id=? AND e.event_type IN ('lesson_complete','aula_concluida') GROUP BY e.course_id").all(institutionId);
  const completedByCourse = new Map(completedRows.map(row => [row.course_id, row]));
  const denominator = Math.max(1, counts.students);
  const competencies = Object.entries(categoryMap).map(([label, courseIds]) => {
    const lessonsCompleted = courseIds.reduce((sum, id) => sum + Number(completedByCourse.get(id)?.total || 0), 0);
    const participants = new Set(db.prepare(`SELECT DISTINCT e.user_id FROM learning_events e JOIN users u ON u.id=e.user_id WHERE u.institution_id=? AND e.event_type IN ('lesson_complete','aula_concluida') AND e.course_id IN (${courseIds.map(() => "?").join(",")})`).all(institutionId, ...courseIds).map(row => Number(row.user_id))).size;
    const expected = denominator * courseIds.length * 7;
    return { label, lessonsCompleted, participants, progress: Math.min(100, Math.round(lessonsCompleted / expected * 100)) };
  });
  const institution = db.prepare("SELECT * FROM institutions WHERE id=?").get(institutionId) || db.prepare("SELECT * FROM institutions WHERE id=1").get();
  const privacyTasks = db.prepare("SELECT * FROM privacy_tasks ORDER BY rowid").all().map(row => ({ ...row, completed: Boolean(row.completed) }));
  return { counts, users, classes, competencies, institution, privacyTasks };
}

export function updateInstitution(adminId, data) {
  const institutionId = Number(db.prepare("SELECT institution_id FROM users WHERE id=?").get(adminId)?.institution_id || 1);
  const current = db.prepare("SELECT * FROM institutions WHERE id=?").get(institutionId);
  const timestamp = now();
  db.prepare(`UPDATE institutions SET name=?,short_name=?,campus=?,privacy_email=?,primary_color=?,accent_color=?,updated_at=? WHERE id=?`)
    .run(data.name || current.name, data.shortName || current.short_name, data.campus || current.campus, data.privacyEmail || current.privacy_email, data.primaryColor || current.primary_color, data.accentColor || current.accent_color, timestamp, institutionId);
  if (institutionId === 1) db.prepare(`UPDATE institution_settings SET name=?,short_name=?,campus=?,privacy_email=?,primary_color=?,accent_color=?,updated_at=? WHERE id=1`)
    .run(data.name || current.name, data.shortName || current.short_name, data.campus || current.campus, data.privacyEmail || current.privacy_email, data.primaryColor || current.primary_color, data.accentColor || current.accent_color, timestamp);
  return db.prepare("SELECT * FROM institutions WHERE id=?").get(institutionId);
}

export function setUserActive(adminId, userId, active) {
  if (Number(adminId) === Number(userId)) return null;
  const result = db.prepare("UPDATE users SET active=? WHERE id=? AND institution_id=(SELECT institution_id FROM users WHERE id=?)").run(active ? 1 : 0, userId, adminId);
  return result.changes ? db.prepare("SELECT id,name,email,role,active,created_at,last_seen_at FROM users WHERE id=?").get(userId) : null;
}

export function updateUserAccess(adminId, userId, data = {}) {
  if (Number(adminId) === Number(userId)) return null;
  const allowedRoles = new Set(["Aluno", "Professor", "Admin"]);
  const current = db.prepare("SELECT id,name,email,role,active FROM users WHERE id=? AND institution_id=(SELECT institution_id FROM users WHERE id=?)").get(userId, adminId);
  if (!current) return null;
  const role = allowedRoles.has(data.role) ? data.role : current.role;
  const active = data.active === undefined ? Boolean(current.active) : Boolean(data.active);
  db.prepare("UPDATE users SET role=?,active=? WHERE id=?").run(role, active ? 1 : 0, userId);
  if (role !== "Aluno") db.prepare("UPDATE enrollments SET status='inactive' WHERE student_id=?").run(userId);
  return db.prepare("SELECT id,name,email,role,active,created_at,last_seen_at FROM users WHERE id=?").get(userId);
}

export function setPrivacyTask(id, completed) {
  const result = db.prepare("UPDATE privacy_tasks SET completed=?,updated_at=? WHERE id=?").run(completed ? 1 : 0, now(), id);
  const row = result.changes ? db.prepare("SELECT * FROM privacy_tasks WHERE id=?").get(id) : null;
  return row ? { ...row, completed: Boolean(row.completed) } : null;
}

export function createSession(tokenHash, userId, expiresAt) {
  db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)")
    .run(tokenHash, userId, expiresAt, now());
}

export function sessionUser(tokenHash) {
  return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`).get(tokenHash, now());
}

export function deleteSession(tokenHash) {
  db.prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash);
}

function classAccess(userId, classId) {
  return db.prepare(`SELECT c.*, CASE WHEN c.teacher_id=? THEN 'teacher' ELSE 'student' END access_role
    FROM classes c LEFT JOIN enrollments e ON e.class_id=c.id AND e.student_id=? AND e.status='active'
    WHERE c.id=? AND (c.teacher_id=? OR e.student_id=?)`).get(userId, userId, classId, userId, userId);
}

export function listClasses(user) {
  if (user.role === "Professor") {
    return db.prepare(`SELECT c.*, COUNT(e.student_id) student_count FROM classes c
      LEFT JOIN enrollments e ON e.class_id=c.id AND e.status='active'
      WHERE c.teacher_id=? GROUP BY c.id ORDER BY c.archived,c.created_at DESC`).all(user.id);
  }
  return db.prepare(`SELECT c.*,u.name teacher_name,e.enrolled_at FROM enrollments e
    JOIN classes c ON c.id=e.class_id JOIN users u ON u.id=c.teacher_id
    WHERE e.student_id=? AND e.status='active' AND c.archived=0 ORDER BY e.enrolled_at DESC`).all(user.id);
}

export function createClass(userId, data) {
  const institutionId = Number(db.prepare("SELECT institution_id FROM users WHERE id=?").get(userId)?.institution_id || 1);
  const result = db.prepare(`INSERT INTO classes(teacher_id,name,subject,description,join_code,institution_id,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(userId, data.name, data.subject, data.description, data.joinCode, institutionId, now());
  return db.prepare("SELECT * FROM classes WHERE id=?").get(result.lastInsertRowid);
}

export function updateClass(userId, classId, data) {
  const current = db.prepare("SELECT * FROM classes WHERE id=? AND teacher_id=?").get(classId, userId);
  if (!current) return null;
  db.prepare("UPDATE classes SET name=?,subject=?,description=?,archived=? WHERE id=?")
    .run(data.name ?? current.name, data.subject ?? current.subject, data.description ?? current.description, data.archived ?? current.archived, classId);
  return db.prepare("SELECT * FROM classes WHERE id=?").get(classId);
}

export function joinClass(studentId, joinCode) {
  const classroom = db.prepare("SELECT c.* FROM classes c JOIN users u ON u.id=? WHERE c.join_code=? COLLATE NOCASE AND c.archived=0 AND c.institution_id=u.institution_id").get(studentId, joinCode);
  if (!classroom) return null;
  db.prepare(`INSERT INTO enrollments(class_id,student_id,status,enrolled_at) VALUES(?,?, 'active',?)
    ON CONFLICT(class_id,student_id) DO UPDATE SET status='active'`).run(classroom.id, studentId, now());
  return classroom;
}

export function listRegisteredStudents(teacherId) {
  const rows = db.prepare(`SELECT u.id,u.name,u.email,u.created_at,u.last_seen_at,p.registration_code,
    c.id class_id,c.name class_name,e.status enrollment_status,e.enrolled_at
    FROM users u
    LEFT JOIN student_profiles p ON p.user_id=u.id
    LEFT JOIN enrollments e ON e.student_id=u.id
      AND e.class_id IN (SELECT id FROM classes WHERE teacher_id=?)
    LEFT JOIN classes c ON c.id=e.class_id
    WHERE u.role='Aluno' AND u.active=1 AND u.institution_id=(SELECT institution_id FROM users WHERE id=?)
    ORDER BY u.name,c.name`).all(teacherId, teacherId);
  const students = new Map();
  rows.forEach(row => {
    if (!students.has(row.id)) students.set(row.id, {
      id: Number(row.id), name: row.name, email: row.email,
      registrationCode: row.registration_code || "", createdAt: row.created_at, lastSeenAt: row.last_seen_at, classes: []
    });
    if (row.class_id) students.get(row.id).classes.push({
      id: Number(row.class_id), name: row.class_name,
      status: row.enrollment_status, enrolledAt: row.enrolled_at
    });
  });
  return [...students.values()];
}

export function enrollStudent(teacherId, classId, studentId) {
  const classroom = db.prepare("SELECT id,name FROM classes WHERE id=? AND teacher_id=? AND archived=0").get(classId, teacherId);
  const student = db.prepare("SELECT id,name,email FROM users WHERE id=? AND role='Aluno' AND active=1 AND institution_id=(SELECT institution_id FROM users WHERE id=?)").get(studentId, teacherId);
  if (!classroom || !student) return null;
  db.prepare(`INSERT INTO enrollments(class_id,student_id,status,enrolled_at) VALUES(?,?, 'active',?)
    ON CONFLICT(class_id,student_id) DO UPDATE SET status='active',enrolled_at=excluded.enrolled_at`).run(classId, studentId, now());
  db.prepare("INSERT INTO notifications(user_id,type,title,body,link,created_at) VALUES(?,?,?,?,?,?)")
    .run(studentId, "teacher_enrollment", `Você entrou em ${classroom.name}`, "O professor adicionou você diretamente à turma.", "classes", now());
  return { classroom, student };
}

export function classMembers(teacherId, classId) {
  const classroom = db.prepare("SELECT id FROM classes WHERE id=? AND teacher_id=?").get(classId, teacherId);
  if (!classroom) return null;
  return db.prepare(`SELECT u.id,u.name,u.email,u.last_seen_at,e.enrolled_at,e.status,
    COALESCE(json_extract(w.data_json,'$.summary.lessons'),0) lessons,
    COALESCE(json_extract(w.data_json,'$.summary.activities'),0) activities,
    COALESCE(json_extract(w.data_json,'$.summary.studyMinutes'),0) study_minutes,
    COALESCE((SELECT AVG(CASE WHEN s.max_score>0 THEN s.score*100.0/s.max_score END) FROM submissions s WHERE s.student_id=u.id),0) assessment_average
    FROM enrollments e JOIN users u ON u.id=e.student_id LEFT JOIN workspaces w ON w.user_id=u.id
    WHERE e.class_id=? ORDER BY u.name`).all(classId);
}

export function setEnrollmentStatus(teacherId, classId, studentId, status) {
  if (!db.prepare("SELECT 1 FROM classes WHERE id=? AND teacher_id=?").get(classId, teacherId)) return false;
  return db.prepare("UPDATE enrollments SET status=? WHERE class_id=? AND student_id=?").run(status, classId, studentId).changes > 0;
}

export function createAnnouncement(user, classId, title, body) {
  const access = classAccess(user.id, classId);
  if (!access || access.access_role !== "teacher") return null;
  const result = db.prepare("INSERT INTO announcements(class_id,author_id,title,body,created_at) VALUES(?,?,?,?,?)")
    .run(classId, user.id, title, body, now());
  const students = db.prepare("SELECT student_id FROM enrollments WHERE class_id=? AND status='active'").all(classId);
  const notification = db.prepare("INSERT INTO notifications(user_id,type,title,body,link,created_at) VALUES(?,?,?,?,?,?)");
  students.forEach(row => notification.run(row.student_id, "announcement", title, body.slice(0, 180), "classes", now()));
  return db.prepare("SELECT * FROM announcements WHERE id=?").get(result.lastInsertRowid);
}

export function listAnnouncements(user, classId = null) {
  const params = [user.id, user.id];
  let filter = "";
  if (classId) { filter = " AND a.class_id=?"; params.push(classId); }
  return db.prepare(`SELECT a.*,u.name author_name,c.name class_name FROM announcements a
    JOIN users u ON u.id=a.author_id JOIN classes c ON c.id=a.class_id
    LEFT JOIN enrollments e ON e.class_id=c.id AND e.student_id=? AND e.status='active'
    WHERE (c.teacher_id=? OR e.student_id IS NOT NULL)${filter} ORDER BY a.created_at DESC LIMIT 100`).all(...params);
}

export function createMessage(user, data) {
  if (!classAccess(user.id, data.classId)) return null;
  const result = db.prepare("INSERT INTO messages(class_id,author_id,parent_id,kind,title,body,created_at) VALUES(?,?,?,?,?,?,?)")
    .run(data.classId, user.id, data.parentId || null, data.parentId ? "reply" : "question", data.title || "", data.body, now());
  const classroom = db.prepare("SELECT teacher_id,name FROM classes WHERE id=?").get(data.classId);
  if (user.id !== classroom.teacher_id) {
    db.prepare("INSERT INTO notifications(user_id,type,title,body,link,created_at) VALUES(?,?,?,?,?,?)")
      .run(classroom.teacher_id, "question", `Nova dúvida em ${classroom.name}`, data.body.slice(0, 180), "messages", now());
  } else {
    const recipients = data.parentId
      ? db.prepare("SELECT DISTINCT author_id user_id FROM messages WHERE id=? AND class_id=? AND author_id<>?").all(data.parentId, data.classId, user.id)
      : db.prepare("SELECT student_id user_id FROM enrollments WHERE class_id=? AND status='active'").all(data.classId);
    const notify = db.prepare("INSERT INTO notifications(user_id,type,title,body,link,created_at) VALUES(?,?,?,?,?,?)");
    recipients.forEach(row => notify.run(row.user_id, "teacher_reply", `Resposta do professor em ${classroom.name}`, data.body.slice(0, 180), "classes", now()));
  }
  return db.prepare(`SELECT m.*,u.name author_name,u.role author_role FROM messages m JOIN users u ON u.id=m.author_id WHERE m.id=?`).get(result.lastInsertRowid);
}

export function listMessages(user, classId) {
  if (classId) {
    if (!classAccess(user.id, classId)) return null;
    return db.prepare(`SELECT m.*,u.name author_name,u.role author_role,c.name class_name,
      EXISTS(SELECT 1 FROM messages r JOIN users ru ON ru.id=r.author_id WHERE r.parent_id=m.id AND ru.role='Professor') answered
      FROM messages m JOIN users u ON u.id=m.author_id JOIN classes c ON c.id=m.class_id
      WHERE m.class_id=? ORDER BY m.created_at DESC LIMIT 200`).all(classId);
  }
  if (user.role !== "Professor") return null;
  return db.prepare(`SELECT m.*,u.name author_name,u.role author_role,c.name class_name,
    EXISTS(SELECT 1 FROM messages r JOIN users ru ON ru.id=r.author_id WHERE r.parent_id=m.id AND ru.role='Professor') answered
    FROM messages m JOIN users u ON u.id=m.author_id JOIN classes c ON c.id=m.class_id
    WHERE c.teacher_id=? ORDER BY m.created_at DESC LIMIT 300`).all(user.id);
}

export function listNotifications(userId) {
  return db.prepare("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100").all(userId);
}

export function markNotificationsRead(userId) {
  db.prepare("UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL").run(now(), userId);
}

export function getWorkspace(userId) {
  const row = db.prepare("SELECT data_json,updated_at FROM workspaces WHERE user_id=?").get(userId);
  return row ? { data: JSON.parse(row.data_json), updatedAt: row.updated_at } : { data: {}, updatedAt: null };
}

export function saveWorkspace(userId, data) {
  const timestamp = now();
  db.prepare(`INSERT INTO workspaces(user_id,data_json,updated_at) VALUES(?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`)
    .run(userId, JSON.stringify(data), timestamp);
  return { updatedAt: timestamp };
}

function publicChatMessage(row) {
  if (!row) return null;
  let sources = [], actions = [];
  try { sources = JSON.parse(row.sources_json || "[]"); } catch {}
  try { actions = JSON.parse(row.actions_json || "[]"); } catch {}
  return {
    id: Number(row.id), conversationId: Number(row.conversation_id), role: row.role,
    content: row.content, code: row.code || "", sources, actions,
    feedback: row.feedback == null ? null : Number(row.feedback), createdAt: row.created_at
  };
}

export function createChatConversation(userId, data = {}) {
  const timestamp = now();
  const result = db.prepare(`INSERT INTO chat_conversations(user_id,title,course_id,lesson_index,mode,provider,model,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(userId, data.title || "Nova conversa", data.courseId || "", Number.isInteger(data.lessonIndex) ? data.lessonIndex : null,
    ["explain", "hint", "code", "quiz"].includes(data.mode) ? data.mode : "explain", data.provider || "local", data.model || "", timestamp, timestamp);
  return db.prepare("SELECT * FROM chat_conversations WHERE id=?").get(result.lastInsertRowid);
}

export function listChatConversations(userId) {
  return db.prepare(`SELECT c.*,COUNT(m.id) message_count FROM chat_conversations c
    LEFT JOIN chat_messages m ON m.conversation_id=c.id WHERE c.user_id=?
    GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 40`).all(userId).map(row => ({ ...row, id: Number(row.id), message_count: Number(row.message_count) }));
}

export function getChatConversation(userId, conversationId) {
  return db.prepare("SELECT * FROM chat_conversations WHERE id=? AND user_id=?").get(conversationId, userId) || null;
}

export function listChatMessages(userId, conversationId, limit = 80) {
  if (!getChatConversation(userId, conversationId)) return null;
  const rows = db.prepare(`SELECT * FROM (SELECT * FROM chat_messages WHERE conversation_id=? ORDER BY id DESC LIMIT ?)
    ORDER BY id`).all(conversationId, Math.max(1, Math.min(200, Number(limit) || 80)));
  return rows.map(publicChatMessage);
}

export function addChatMessage(userId, conversationId, data) {
  const conversation = getChatConversation(userId, conversationId);
  if (!conversation) return null;
  const timestamp = now();
  const result = db.prepare(`INSERT INTO chat_messages(conversation_id,role,content,code,sources_json,actions_json,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(conversationId, data.role === "assistant" ? "assistant" : "user", data.content, data.code || "",
    JSON.stringify(data.sources || []), JSON.stringify(data.actions || []), timestamp);
  const update = data.conversation || {};
  const title = conversation.title === "Nova conversa" && data.role === "user"
    ? String(data.content).replace(/\s+/g, " ").slice(0, 58) : conversation.title;
  db.prepare(`UPDATE chat_conversations SET title=?,course_id=?,lesson_index=?,mode=?,provider=?,model=?,updated_at=? WHERE id=?`)
    .run(title || "Nova conversa", update.courseId ?? conversation.course_id,
      Number.isInteger(update.lessonIndex) ? update.lessonIndex : conversation.lesson_index,
      ["explain", "hint", "code", "quiz"].includes(update.mode) ? update.mode : conversation.mode,
      update.provider ?? conversation.provider, update.model ?? conversation.model, timestamp, conversationId);
  return publicChatMessage(db.prepare("SELECT * FROM chat_messages WHERE id=?").get(result.lastInsertRowid));
}

export function deleteChatConversation(userId, conversationId) {
  return db.prepare("DELETE FROM chat_conversations WHERE id=? AND user_id=?").run(conversationId, userId).changes > 0;
}

export function rateChatMessage(userId, messageId, feedback) {
  const value = Number(feedback) === -1 ? -1 : 1;
  const result = db.prepare(`UPDATE chat_messages SET feedback=? WHERE id=? AND role='assistant'
    AND conversation_id IN (SELECT id FROM chat_conversations WHERE user_id=?)`).run(value, messageId, userId);
  return result.changes ? publicChatMessage(db.prepare("SELECT * FROM chat_messages WHERE id=?").get(messageId)) : null;
}

export function addLearningEvent(userId, event) {
  db.prepare("INSERT INTO learning_events(user_id,event_type,course_id,lesson_index,data_json,created_at) VALUES(?,?,?,?,?,?)")
    .run(userId, event.type, event.courseId || "", Number.isInteger(event.lesson) ? event.lesson : null, JSON.stringify(event.data || {}), now());
}

export function teacherAnalytics(teacherId, classId = null) {
  const classes = db.prepare("SELECT id FROM classes WHERE teacher_id=?").all(teacherId).map(row => row.id);
  if (!classes.length) return { students: [], events: [], submissions: [] };
  const selected = classId && classes.includes(Number(classId)) ? [Number(classId)] : classes;
  const marks = selected.map(() => "?").join(",");
  const students = db.prepare(`SELECT DISTINCT u.id,u.name,u.email,u.last_seen_at,w.data_json,w.updated_at
    FROM enrollments e JOIN users u ON u.id=e.student_id LEFT JOIN workspaces w ON w.user_id=u.id
    WHERE e.class_id IN (${marks}) AND e.status='active' ORDER BY u.name`).all(...selected).map(row => ({ ...row, workspace: row.data_json ? JSON.parse(row.data_json) : {} }));
  const studentIds = students.map(row => row.id);
  if (!studentIds.length) return { students, events: [], submissions: [] };
  const studentMarks = studentIds.map(() => "?").join(",");
  const events = db.prepare(`SELECT e.*,u.name FROM learning_events e JOIN users u ON u.id=e.user_id
    WHERE e.user_id IN (${studentMarks}) ORDER BY e.created_at DESC LIMIT 500`).all(...studentIds);
  const submissions = db.prepare(`SELECT s.*,a.title,a.course_id,u.name FROM submissions s JOIN assessments a ON a.id=s.assessment_id
    JOIN users u ON u.id=s.student_id WHERE s.student_id IN (${studentMarks}) ORDER BY s.submitted_at DESC LIMIT 300`).all(...studentIds);
  return { students, events, submissions };
}

export function createAssessment(teacherId, data) {
  if (data.classId && !db.prepare("SELECT 1 FROM classes WHERE id=? AND teacher_id=?").get(data.classId, teacherId)) return null;
  return transaction(() => {
    const timestamp = now();
    const result = db.prepare(`INSERT INTO assessments(class_id,teacher_id,title,description,course_id,assessment_type,status,open_at,due_at,duration_minutes,attempts_allowed,minimum_score,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(data.classId || null, teacherId, data.title, data.description || "", data.courseId || "integrado", data.type || "quiz", data.status || "draft", data.openAt || null, data.dueAt || null, data.duration || 20, data.attempts || 1, data.minimumScore || 60, timestamp, timestamp);
    const assessmentId = Number(result.lastInsertRowid);
    const insertQuestion = db.prepare(`INSERT INTO assessment_questions(assessment_id,question_type,prompt,options_json,correct_answer,explanation,points,position)
      VALUES(?,?,?,?,?,?,?,?)`);
    (data.questions || []).forEach((question, index) => insertQuestion.run(assessmentId, question.type || "multiple_choice", question.prompt, JSON.stringify(question.options || []), String(question.correctAnswer ?? ""), question.explanation || "", Number(question.points || 1), index));
    if ((data.status || "draft") === "published" && data.classId) notifyAssessment(data.classId, data.title, assessmentId);
    return getAssessment(assessmentId, teacherId);
  });
}

function notifyAssessment(classId, title, assessmentId) {
  const students = db.prepare("SELECT student_id FROM enrollments WHERE class_id=? AND status='active'").all(classId);
  const insert = db.prepare("INSERT INTO notifications(user_id,type,title,body,link,created_at) VALUES(?,?,?,?,?,?)");
  students.forEach(row => insert.run(row.student_id, "assessment", "Nova avaliação", title, `assessment:${assessmentId}`, now()));
}

export function getAssessment(id, requesterId = null) {
  const item = db.prepare("SELECT a.*,c.name class_name FROM assessments a LEFT JOIN classes c ON c.id=a.class_id WHERE a.id=?").get(id);
  if (!item) return null;
  if (requesterId && item.teacher_id !== requesterId && !db.prepare("SELECT 1 FROM enrollments WHERE class_id=? AND student_id=? AND status='active'").get(item.class_id, requesterId)) return null;
  item.questions = db.prepare("SELECT * FROM assessment_questions WHERE assessment_id=? ORDER BY position,id").all(id).map(row => ({ ...row, options: JSON.parse(row.options_json) }));
  return item;
}

export function listAssessments(user) {
  if (user.role === "Professor") {
    return db.prepare(`SELECT a.*,c.name class_name,COUNT(q.id) question_count FROM assessments a
      LEFT JOIN classes c ON c.id=a.class_id LEFT JOIN assessment_questions q ON q.assessment_id=a.id
      WHERE a.teacher_id=? GROUP BY a.id ORDER BY a.updated_at DESC`).all(user.id);
  }
  return db.prepare(`SELECT DISTINCT a.*,c.name class_name,COUNT(q.id) question_count,
    (SELECT COUNT(*) FROM submissions s WHERE s.assessment_id=a.id AND s.student_id=?) attempts_used
    FROM assessments a JOIN classes c ON c.id=a.class_id JOIN enrollments e ON e.class_id=c.id
    LEFT JOIN assessment_questions q ON q.assessment_id=a.id
    WHERE e.student_id=? AND e.status='active' AND a.status='published' AND (a.open_at IS NULL OR a.open_at<=?)
    GROUP BY a.id ORDER BY COALESCE(a.due_at,'9999')`).all(user.id, user.id, now());
}

export function updateAssessmentStatus(teacherId, id, status) {
  const item = db.prepare("SELECT * FROM assessments WHERE id=? AND teacher_id=?").get(id, teacherId);
  if (!item) return null;
  db.prepare("UPDATE assessments SET status=?,updated_at=? WHERE id=?").run(status, now(), id);
  if (status === "published" && item.class_id) notifyAssessment(item.class_id, item.title, id);
  return getAssessment(id, teacherId);
}

export function submitAssessment(studentId, assessmentId, answers) {
  const assessment = getAssessment(assessmentId, studentId);
  if (!assessment || assessment.status !== "published") return null;
  if (assessment.open_at && assessment.open_at > now()) return { error: "not_open" };
  if (assessment.due_at && assessment.due_at < now()) return { error: "deadline_passed" };
  const attempts = db.prepare("SELECT COUNT(*) total FROM submissions WHERE assessment_id=? AND student_id=?").get(assessmentId, studentId).total;
  if (attempts >= assessment.attempts_allowed) return { error: "attempts_exhausted" };
  let score = 0, maxScore = 0, needsReview = false;
  assessment.questions.forEach(question => {
    const points = Number(question.points || 1); maxScore += points;
    if (question.question_type === "essay") needsReview = true;
    else if (String(answers[question.id] ?? "").trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase()) score += points;
  });
  const result = db.prepare(`INSERT INTO submissions(assessment_id,student_id,attempt,status,answers_json,score,max_score,submitted_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(assessmentId, studentId, attempts + 1, needsReview ? "submitted" : "reviewed", JSON.stringify(answers), score, maxScore, now());
  const submission = db.prepare("SELECT * FROM submissions WHERE id=?").get(result.lastInsertRowid);
  if (!needsReview) db.prepare("INSERT INTO notifications(user_id,type,title,body,link,created_at) VALUES(?,?,?,?,?,?)")
    .run(studentId, "assessment_result", "Avaliação corrigida", `${assessment.title}: ${maxScore ? Math.round(score / maxScore * 100) : 0}%`, `assessment:${assessmentId}`, now());
  return submission;
}

export function reviewSubmission(teacherId, submissionId, score, feedback) {
  const submission = db.prepare(`SELECT s.* FROM submissions s JOIN assessments a ON a.id=s.assessment_id
    WHERE s.id=? AND a.teacher_id=?`).get(submissionId, teacherId);
  if (!submission) return null;
  db.prepare("UPDATE submissions SET score=?,feedback=?,status='reviewed',reviewed_at=? WHERE id=?")
    .run(score, feedback, now(), submissionId);
  db.prepare("INSERT INTO notifications(user_id,type,title,body,link,created_at) VALUES(?,?,?,?,?,?)")
    .run(submission.student_id, "assessment_review", "Correção do professor disponível", feedback || "Sua atividade discursiva foi corrigida.", `assessment:${submission.assessment_id}`, now());
  return db.prepare("SELECT * FROM submissions WHERE id=?").get(submissionId);
}

export function upsertLesson(userId, data) {
  const timestamp = now();
  db.prepare(`INSERT INTO lesson_content(course_id,lesson_index,title,status,context,explanation,system_example,common_error,activity,video_url,video_note,objectives_json,prerequisites_json,checkpoints_json,updated_by,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(course_id,lesson_index) DO UPDATE SET
    title=excluded.title,status=excluded.status,context=excluded.context,explanation=excluded.explanation,system_example=excluded.system_example,common_error=excluded.common_error,activity=excluded.activity,video_url=excluded.video_url,video_note=excluded.video_note,objectives_json=excluded.objectives_json,prerequisites_json=excluded.prerequisites_json,checkpoints_json=excluded.checkpoints_json,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
    .run(data.courseId, data.lesson, data.title, data.status || "published", data.context || "", data.explanation || "", data.system || "", data.commonError || "", data.activity || "", data.videoUrl || "", data.videoNote || "", JSON.stringify(data.objectives || []), JSON.stringify(data.prerequisites || []), JSON.stringify(data.checkpoints || []), userId, timestamp);
  const lesson = getLesson(data.courseId, data.lesson, true);
  const institutionId = Number(db.prepare("SELECT institution_id FROM users WHERE id=?").get(userId)?.institution_id || 1);
  db.prepare("INSERT INTO lesson_content_versions(institution_id,course_id,lesson_index,content_json,created_by,created_at) VALUES(?,?,?,?,?,?)")
    .run(institutionId, data.courseId, data.lesson, JSON.stringify(lesson), userId, timestamp);
  return lesson;
}

export function getLesson(courseId, lessonIndex, includeDraft = false) {
  const row = db.prepare(`SELECT * FROM lesson_content WHERE course_id=? AND lesson_index=? ${includeDraft ? "" : "AND status='published'"}`).get(courseId, lessonIndex);
  if (!row) return null;
  return { ...row, objectives: JSON.parse(row.objectives_json), prerequisites: JSON.parse(row.prerequisites_json), checkpoints: JSON.parse(row.checkpoints_json) };
}

export function listLessonContent(includeDraft = false) {
  return db.prepare(`SELECT * FROM lesson_content ${includeDraft ? "" : "WHERE status='published'"} ORDER BY course_id,lesson_index`).all().map(row => ({ ...row, objectives: JSON.parse(row.objectives_json), prerequisites: JSON.parse(row.prerequisites_json), checkpoints: JSON.parse(row.checkpoints_json) }));
}

export function addMaterial(userId, data) {
  const result = db.prepare(`INSERT INTO materials(course_id,lesson_index,material_type,author,title,url,note,status,created_by,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(data.courseId, data.lesson ?? -1, data.type, data.author, data.title, data.url, data.note || "", data.status || "published", userId, now());
  return db.prepare("SELECT * FROM materials WHERE id=?").get(result.lastInsertRowid);
}

export function listMaterials(includeDraft = false) {
  return db.prepare(`SELECT * FROM materials ${includeDraft ? "" : "WHERE status='published'"} ORDER BY created_at DESC`).all();
}

export function addChallenge(userId, data) {
  if (data.classId && !db.prepare("SELECT 1 FROM classes WHERE id=? AND teacher_id=?").get(data.classId, userId)) return null;
  const result = db.prepare(`INSERT INTO challenges(class_id,course_id,title,instruction,starter_code,status,due_at,created_by,created_at)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(data.classId || null, data.courseId, data.title, data.instruction, data.code || "", data.status || "published", data.dueAt || null, userId, now());
  return db.prepare("SELECT * FROM challenges WHERE id=?").get(result.lastInsertRowid);
}

export function listChallenges(user) {
  if (user.role === "Professor") return db.prepare("SELECT * FROM challenges WHERE created_by=? ORDER BY created_at DESC").all(user.id);
  return db.prepare(`SELECT DISTINCT ch.* FROM challenges ch LEFT JOIN enrollments e ON e.class_id=ch.class_id AND e.student_id=?
    WHERE ch.status='published' AND (ch.class_id IS NULL OR e.student_id IS NOT NULL) ORDER BY ch.created_at DESC`).all(user.id);
}

function teacherOwnsClass(teacherId, classId) {
  return Boolean(db.prepare("SELECT 1 FROM classes WHERE id=? AND teacher_id=? AND archived=0").get(classId, teacherId));
}

export function teacherDiary(teacherId, classId, lessonDate) {
  const id = Number(classId);
  if (!teacherOwnsClass(teacherId, id)) return null;
  const date = String(lessonDate || now().slice(0, 10)).slice(0, 10);
  const members = classMembers(teacherId, id) || [];
  const attendance = db.prepare("SELECT * FROM attendance WHERE class_id=? AND lesson_date=? ORDER BY student_id").all(id, date);
  const grades = db.prepare(`SELECT g.*,u.name student_name FROM gradebook g JOIN users u ON u.id=g.student_id
    WHERE g.class_id=? ORDER BY g.created_at DESC LIMIT 200`).all(id);
  const rubrics = db.prepare("SELECT * FROM rubrics WHERE class_id=? ORDER BY updated_at DESC").all(id)
    .map(row => ({ ...row, criteria: JSON.parse(row.criteria_json || "[]") }));
  const attendanceHistory = db.prepare(`SELECT lesson_date,
    SUM(status='present') present_count,SUM(status='late') late_count,SUM(status='absent') absent_count,SUM(status='excused') excused_count
    FROM attendance WHERE class_id=? GROUP BY lesson_date ORDER BY lesson_date DESC LIMIT 30`).all(id);
  return { classId: id, date, members, attendance, grades, rubrics, attendanceHistory };
}

export function saveAttendance(teacherId, data) {
  const classId = Number(data.classId);
  if (!teacherOwnsClass(teacherId, classId)) return null;
  const date = String(data.date || now().slice(0, 10)).slice(0, 10);
  const allowed = new Set(["present", "absent", "late", "excused"]);
  const memberIds = new Set(classMembers(teacherId, classId).map(item => Number(item.id)));
  const upsert = db.prepare(`INSERT INTO attendance(class_id,student_id,lesson_date,status,note,recorded_by,updated_at)
    VALUES(?,?,?,?,?,?,?) ON CONFLICT(class_id,student_id,lesson_date) DO UPDATE SET status=excluded.status,note=excluded.note,recorded_by=excluded.recorded_by,updated_at=excluded.updated_at`);
  transaction(() => (Array.isArray(data.records) ? data.records : []).forEach(item => {
    const studentId = Number(item.studentId); if (!memberIds.has(studentId)) return;
    upsert.run(classId, studentId, date, allowed.has(item.status) ? item.status : "present", String(item.note || "").slice(0, 500), teacherId, now());
  }));
  return teacherDiary(teacherId, classId, date);
}

export function saveGrade(teacherId, data) {
  const classId = Number(data.classId), studentId = Number(data.studentId);
  if (!teacherOwnsClass(teacherId, classId) || !db.prepare("SELECT 1 FROM enrollments WHERE class_id=? AND student_id=? AND status='active'").get(classId, studentId)) return null;
  const timestamp = now(), maxScore = Math.max(1, Number(data.maxScore || 100)), score = Math.max(0, Math.min(maxScore, Number(data.score || 0)));
  const result = db.prepare(`INSERT INTO gradebook(class_id,student_id,title,competency,score,max_score,feedback,recorded_by,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(classId, studentId, String(data.title || "Atividade").slice(0, 160), String(data.competency || "Fundamentos").slice(0, 120), score, maxScore, String(data.feedback || "").slice(0, 2000), teacherId, timestamp, timestamp);
  db.prepare("INSERT INTO notifications(user_id,type,title,body,link,created_at) VALUES(?,?,?,?,?,?)")
    .run(studentId, "grade", "Nova nota no diário", `${String(data.title || "Atividade").slice(0, 120)}: ${score}/${maxScore}`, "classes", timestamp);
  return db.prepare("SELECT * FROM gradebook WHERE id=?").get(result.lastInsertRowid);
}

export function saveRubric(teacherId, data) {
  const classId = Number(data.classId);
  if (!teacherOwnsClass(teacherId, classId)) return null;
  const criteria = (Array.isArray(data.criteria) ? data.criteria : []).map(item => String(item).trim().slice(0, 500)).filter(Boolean).slice(0, 20);
  const timestamp = now();
  const result = db.prepare(`INSERT INTO rubrics(class_id,course_id,title,criteria_json,created_by,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?)`).run(classId, String(data.courseId || "integrado").slice(0, 40), String(data.title || "Rubrica").slice(0, 160), JSON.stringify(criteria), teacherId, timestamp, timestamp);
  return { ...db.prepare("SELECT * FROM rubrics WHERE id=?").get(result.lastInsertRowid), criteria };
}

export function overview(user) {
  if (user.role === "Professor") {
    return {
      classes: db.prepare("SELECT COUNT(*) total FROM classes WHERE teacher_id=? AND archived=0").get(user.id).total,
      students: db.prepare("SELECT COUNT(DISTINCT e.student_id) total FROM enrollments e JOIN classes c ON c.id=e.class_id WHERE c.teacher_id=? AND e.status='active'").get(user.id).total,
      assessments: db.prepare("SELECT COUNT(*) total FROM assessments WHERE teacher_id=?").get(user.id).total,
      pendingReviews: db.prepare("SELECT COUNT(*) total FROM submissions s JOIN assessments a ON a.id=s.assessment_id WHERE a.teacher_id=? AND s.status='submitted'").get(user.id).total,
      lessonsEdited: db.prepare("SELECT COUNT(*) total FROM lesson_content WHERE updated_by=?").get(user.id).total
    };
  }
  return {
    classes: db.prepare("SELECT COUNT(*) total FROM enrollments WHERE student_id=? AND status='active'").get(user.id).total,
    pendingAssessments: listAssessments(user).filter(item => item.attempts_used < item.attempts_allowed).length,
    unreadNotifications: db.prepare("SELECT COUNT(*) total FROM notifications WHERE user_id=? AND read_at IS NULL").get(user.id).total,
    workspace: getWorkspace(user.id).data.summary || {}
  };
}

export function recordAudit(userId, action, entityType = "sistema", entityId = "", metadata = {}, institutionId = null) {
  const tenantId = Number(institutionId || db.prepare("SELECT institution_id FROM users WHERE id=?").get(userId)?.institution_id || 1);
  const result = db.prepare("INSERT INTO audit_logs(institution_id,user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)")
    .run(tenantId, userId || null, String(action).slice(0, 100), String(entityType).slice(0, 80), String(entityId || "").slice(0, 120), JSON.stringify(metadata || {}), now());
  return Number(result.lastInsertRowid);
}

export function listAuditLog(userId, limit = 120) {
  const institutionId = Number(db.prepare("SELECT institution_id FROM users WHERE id=?").get(userId)?.institution_id || 1);
  const labels = { institution_updated: "Instituição atualizada", user_access_updated: "Acesso de usuário alterado", privacy_updated: "Checklist de privacidade alterado", students_imported: "Alunos importados", backup_created: "Backup criado", lesson_updated: "Conteúdo de aula atualizado", attendance_saved: "Chamada salva", grade_saved: "Nota registrada", rubric_saved: "Rubrica criada" };
  return db.prepare(`SELECT a.*,u.name user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
    WHERE a.institution_id=? ORDER BY a.created_at DESC,a.id DESC LIMIT ?`).all(institutionId, Math.max(1, Math.min(500, Number(limit) || 120))).map(row => ({ ...row, action_label: labels[row.action] || row.action, metadata: JSON.parse(row.metadata_json || "{}") }));
}

export function recordBackupHistory(userId, filename, kind = "manual", sizeBytes = 0, institutionId = null) {
  const tenantId = Number(institutionId || db.prepare("SELECT institution_id FROM users WHERE id=?").get(userId)?.institution_id || 1);
  db.prepare("INSERT INTO backup_history(institution_id,user_id,filename,kind,size_bytes,created_at) VALUES(?,?,?,?,?,?)")
    .run(tenantId, userId || null, filename, kind === "automatic" ? "automatic" : "manual", Number(sizeBytes) || 0, now());
  recordAudit(userId, "backup_created", "backup", filename, { kind }, tenantId);
}

export function listBackupHistory(userId) {
  const institutionId = Number(db.prepare("SELECT institution_id FROM users WHERE id=?").get(userId)?.institution_id || 1);
  return db.prepare("SELECT * FROM backup_history WHERE institution_id=? ORDER BY created_at DESC,id DESC LIMIT 120").all(institutionId);
}

export function latestAutomaticBackup() {
  return db.prepare("SELECT * FROM backup_history WHERE kind='automatic' ORDER BY created_at DESC,id DESC LIMIT 1").get() || null;
}

export async function createBackup(targetPath) {
  mkdirSync(dirname(targetPath), { recursive: true });
  if (databasePath === ":memory:") {
    const safeTarget = String(targetPath).replaceAll("'", "''");
    db.exec(`VACUUM INTO '${safeTarget}'`);
  } else {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    copyFileSync(databasePath, targetPath);
  }
  return targetPath;
}

export { databasePath };

initDatabase();
