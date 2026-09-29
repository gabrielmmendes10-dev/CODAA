import http from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import {
  addChallenge, addChatMessage, addLearningEvent, addMaterial, adminDashboard, classMembers, createAnnouncement, createAssessment,
  createBackup, createChatConversation, createClass, createMessage, createSession, createStudentProfile, createUser, databasePath, deleteChatConversation, deleteSession,
  enrollStudent, findStudentByRegistration, findUserByEmail, getAssessment, getChatConversation, getLesson, getWorkspace, joinClass, listAnnouncements,
  listAssessments, listChallenges, listChatConversations, listChatMessages, listClasses, listLessonContent, listMaterials, listMessages,
  latestAutomaticBackup, listAuditLog, listBackupHistory, listNotifications, listRegisteredStudents, markNotificationsRead, overview, publicUser, recordAudit, recordBackupHistory, reviewSubmission, saveWorkspace,
  rateChatMessage, saveAttendance, saveGrade, saveRubric, sessionUser, setEnrollmentStatus, setPrivacyTask, setUserActive, updateUserAccess, submitAssessment, teacherAnalytics, teacherDiary, touchUser, updateAssessmentStatus,
  transaction, updateClass, updateInstitution, upsertLesson
} from "./db.mjs";
import { answerChat, chatModel, chatProviderReady } from "./chat-service.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dataDirectory = dirname(databasePath);
const backupDirectory = databasePath === ":memory:" ? null : join(dataDirectory, "backups");
if (backupDirectory) mkdirSync(backupDirectory, { recursive: true });

const environment = globalThis.process?.env || {};
const teacherCode = environment.CODA_TEACHER_CODE || "PROF-CODA";
const adminCode = environment.CODA_ADMIN_CODE || "ADMIN-CODA";
const sessionCookie = "coda_session";
const sessionDays = 7;
const maxBodyBytes = 1_000_000;
const loginAttempts = new Map();
const publicFiles = new Set(["index.html", "style.css", "public-api.js", "platform.js", "admin.js", "lesson-content.js", "script.js", "dados.json", "banco.json", "manifest.json", "sw.js"]);
const publicDirectories = ["styles/", "themes/", "components/", "pages/", "js/"];

const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json"
};

function json(res, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store", ...extraHeaders });
  res.end(body);
}

function fail(res, status, message, code = "request_error") {
  json(res, status, { error: code, message });
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) throw Object.assign(new Error("Corpo da requisição muito grande."), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("JSON inválido."), { status: 400 }); }
}

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf("="); return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, 210_000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expected) {
  const actual = Buffer.from(hashPassword(password, salt).hash, "hex");
  const stored = Buffer.from(expected, "hex");
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}

function ensureSystemAccount({ name, email, password, role }) {
  if (findUserByEmail(email)) return;
  const passwordData = hashPassword(password);
  createUser({ name, email, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, role });
}

function ensureSystemAccounts() {
  ensureSystemAccount({
    name: environment.CODA_TEACHER_NAME || "Professor Coda",
    email: normalizeEmail(environment.CODA_TEACHER_EMAIL || "professor@coda.local"),
    password: environment.CODA_TEACHER_PASSWORD || "CodaProf2026!",
    role: "Professor"
  });
  ensureSystemAccount({
    name: environment.CODA_ADMIN_NAME || "Administrador Coda",
    email: normalizeEmail(environment.CODA_ADMIN_EMAIL || "admin@coda.local"),
    password: environment.CODA_ADMIN_PASSWORD || "CodaAdmin2026!",
    role: "Admin"
  });
}

ensureSystemAccounts();

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function text(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function managedAccountName(email, role) {
  const localPart = String(email || "").split("@")[0].replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  const formatted = localPart.split(" ").filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return text(formatted || (role === "Professor" ? "Professor Coda" : "Administrador Coda"), 80);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}

function sessionFromRequest(req) {
  const token = cookies(req)[sessionCookie];
  if (!token) return null;
  const row = sessionUser(tokenHash(token));
  return row ? { token, row, user: publicUser(row) } : null;
}

function requireUser(req, res, role = null) {
  const session = sessionFromRequest(req);
  if (!session) { fail(res, 401, "Entre na sua conta para continuar.", "authentication_required"); return null; }
  if (role && session.user.role !== role) { fail(res, 403, "Você não tem permissão para esta ação.", "permission_denied"); return null; }
  return session;
}

function safeMutationOrigin(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.origin;
  if (!origin) return environment.NODE_ENV === "test";
  const host = req.headers.host;
  return origin === `http://${host}` || origin === `https://${host}`;
}

function securityHeaders(res) {
  const nonce = randomBytes(16).toString("base64");
  res.codaCspNonce = nonce;
  res.setHeader("X-Coda-CSP-Nonce", nonce);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://vlibras.gov.br https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com https://vlibras.gov.br; frame-src 'self' https://vlibras.gov.br https://www.youtube-nocookie.com https://unpkg.com; connect-src 'self' https:; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`);
}

function issueSession(res, userId, remember = true) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 86_400_000).toISOString();
  createSession(tokenHash(token), userId, expiresAt);
  const maxAge = remember ? `; Max-Age=${sessionDays * 86_400}` : "";
  res.setHeader("Set-Cookie", `${sessionCookie}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${maxAge}`);
}

function clearSession(res) {
  res.setHeader("Set-Cookie", `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function limited(ip) {
  const timestamp = Date.now();
  const current = loginAttempts.get(ip) || [];
  const recent = current.filter(item => timestamp - item < 15 * 60_000);
  recent.push(timestamp); loginAttempts.set(ip, recent);
  return recent.length > 12;
}

function randomJoinCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

function publicAssessment(item, includeAnswers = false) {
  if (!item) return null;
  return {
    id: item.id, classId: item.class_id, className: item.class_name, teacherId: item.teacher_id,
    title: item.title, description: item.description, courseId: item.course_id, type: item.assessment_type,
    status: item.status, openAt: item.open_at, dueAt: item.due_at, duration: item.duration_minutes,
    attempts: item.attempts_allowed, minimumScore: item.minimum_score,
    questions: (item.questions || []).map(question => ({
      id: question.id, type: question.question_type, prompt: question.prompt, options: question.options,
      explanation: includeAnswers ? question.explanation : undefined,
      correctAnswer: includeAnswers ? question.correct_answer : undefined, points: question.points
    }))
  };
}

async function handleAuth(req, res, pathname) {
  if (pathname === "/api/auth/me" && req.method === "GET") {
    const session = sessionFromRequest(req);
    return json(res, 200, { user: session?.user || null });
  }
  if (pathname === "/api/auth/register" && req.method === "POST") {
    if (limited(req.socket.remoteAddress || "local")) return fail(res, 429, "Muitas tentativas. Aguarde alguns minutos.", "rate_limited");
    const body = await readJson(req);
    const name = text(body.name, 80); const email = normalizeEmail(body.email);
    const password = String(body.password || ""); const confirmation = String(body.confirmPassword || "");
    const registrationCode = text(body.registrationCode, 30).replace(/\s+/g, "").toUpperCase();
    if (name.length < 2 || !validEmail(email) || password.length < 6) return fail(res, 400, "Informe nome, e-mail válido e senha com pelo menos 6 caracteres.", "invalid_registration");
    if (!/^[A-Z0-9._-]{3,30}$/.test(registrationCode)) return fail(res, 400, "A matrícula deve ter de 3 a 30 letras, números, ponto, traço ou sublinhado.", "invalid_registration_code");
    if (password !== confirmation) return fail(res, 400, "As senhas não coincidem.", "password_mismatch");
    if (findUserByEmail(email)) return fail(res, 409, "Já existe uma conta com este e-mail. Use a opção Entrar.", "email_in_use");
    if (findStudentByRegistration(registrationCode)) return fail(res, 409, "Esta matrícula já está cadastrada.", "registration_in_use");
    const passwordData = hashPassword(password);
    const user = transaction(() => {
      const created = createUser({ name, email, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, role: "Aluno" });
      createStudentProfile(created.id, registrationCode);
      return created;
    });
    issueSession(res, user.id, body.remember !== false);
    return json(res, 201, { user, created: true });
  }
  if (pathname === "/api/auth/login" && req.method === "POST") {
    if (limited(req.socket.remoteAddress || "local")) return fail(res, 429, "Muitas tentativas. Aguarde alguns minutos.", "rate_limited");
    const body = await readJson(req); const email = normalizeEmail(body.email); const password = String(body.password || "");
    const role = ["Aluno", "Professor", "Admin"].includes(body.role) ? body.role : "Aluno";
    if (!validEmail(email) || password.length < 6) return fail(res, 400, "Informe e-mail válido e senha com pelo menos 6 caracteres.", "invalid_credentials");
    if (role === "Professor" && body.teacherCode !== teacherCode) return fail(res, 403, "Código de professor incorreto.", "invalid_teacher_code");
    if (role === "Admin" && body.adminCode !== adminCode) return fail(res, 403, "Código de administrador incorreto.", "invalid_admin_code");
    let row = findUserByEmail(email); let createdAccount = false;
    if (!row) {
      if (role === "Aluno") return fail(res, 401, "Conta de aluno não encontrada. Use a opção Criar conta.", "invalid_credentials");
      const passwordData = hashPassword(password);
      createUser({ name: managedAccountName(email, role), email, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, role });
      row = findUserByEmail(email); createdAccount = true;
    } else {
      if (!verifyPassword(password, row.password_salt, row.password_hash)) return fail(res, 401, "E-mail ou senha incorretos.", "invalid_credentials");
      if (row.role !== role) return fail(res, 403, `Esta conta pertence ao portal de ${row.role.toLowerCase()}.`, "wrong_portal");
    }
    touchUser(row.id); issueSession(res, row.id, body.remember !== false);
    return json(res, 200, { user: publicUser(row), created: createdAccount });
  }
  if (pathname === "/api/auth/logout" && req.method === "POST") {
    const session = sessionFromRequest(req); if (session) deleteSession(tokenHash(session.token)); clearSession(res);
    return json(res, 200, { ok: true });
  }
  return false;
}

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  if (pathname === "/api/health" && req.method === "GET") return json(res, 200, { ok: true, version: "10.9.1" });
  const authResult = await handleAuth(req, res, pathname);
  if (authResult !== false) return;
  const session = requireUser(req, res); if (!session) return;
  const user = session.user;

  if (pathname === "/api/admin/dashboard" && req.method === "GET") {
    if (user.role !== "Admin") return fail(res, 403, "Acesso restrito ao administrador.", "permission_denied");
    return json(res, 200, adminDashboard(user.id));
  }
  if (pathname === "/api/admin/institution" && req.method === "PUT") {
    if (user.role !== "Admin") return fail(res, 403, "Acesso restrito ao administrador.", "permission_denied");
    const body = await readJson(req);
    const color = value => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : null;
    const institution = updateInstitution(user.id, {
      name: text(body.name, 120), shortName: text(body.shortName, 12), campus: text(body.campus, 120),
      privacyEmail: normalizeEmail(body.privacyEmail), primaryColor: color(body.primaryColor), accentColor: color(body.accentColor)
    });
    recordAudit(user.id, "institution_updated", "institution", institution.id);return json(res, 200, { institution });
  }
  let adminMatch = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
  if (adminMatch && req.method === "PATCH") {
    if (user.role !== "Admin") return fail(res, 403, "Acesso restrito ao administrador.", "permission_denied");
    const body = await readJson(req); const updated = updateUserAccess(user.id, Number(adminMatch[1]), { active: body.active, role: text(body.role, 20) });
    if(updated)recordAudit(user.id,"user_access_updated","user",updated.id,{active:Boolean(updated.active),role:updated.role});
    return updated ? json(res, 200, { user: updated }) : fail(res, 400, "Não é possível alterar este usuário.", "invalid_user_change");
  }
  adminMatch = pathname.match(/^\/api\/admin\/privacy\/([a-z0-9_-]+)$/i);
  if (adminMatch && req.method === "PATCH") {
    if (user.role !== "Admin") return fail(res, 403, "Acesso restrito ao administrador.", "permission_denied");
    const body = await readJson(req); const task = setPrivacyTask(adminMatch[1], Boolean(body.completed));
    if(task)recordAudit(user.id,"privacy_updated","privacy",task.id,{completed:Boolean(body.completed)});
    return task ? json(res, 200, { task }) : fail(res, 404, "Controle não encontrado.");
  }
  if (pathname === "/api/admin/audit-log" && req.method === "GET") {
    if (user.role !== "Admin") return fail(res, 403, "Acesso restrito ao administrador.", "permission_denied");
    return json(res, 200, { entries: listAuditLog(user.id) });
  }

  if (pathname === "/api/chat/status" && req.method === "GET") {
    return json(res, 200, { ready: chatProviderReady, provider: "local", model: chatModel, research: "Crossref" });
  }
  if (pathname === "/api/chat/conversations" && req.method === "GET") {
    return json(res, 200, { conversations: listChatConversations(user.id) });
  }
  if (pathname === "/api/chat/conversations" && req.method === "POST") {
    const body = await readJson(req);
    const conversation = createChatConversation(user.id, {
      title: text(body.title, 80) || "Nova conversa", courseId: text(body.courseId, 40),
      lessonIndex: Number.isInteger(body.lessonIndex) ? body.lessonIndex : null,
      mode: ["explain", "hint", "code", "quiz"].includes(body.mode) ? body.mode : "explain"
    });
    return json(res, 201, { conversation });
  }
  let chatMatch = pathname.match(/^\/api\/chat\/conversations\/(\d+)\/messages$/);
  if (chatMatch && req.method === "GET") {
    const messages = listChatMessages(user.id, Number(chatMatch[1]));
    return messages ? json(res, 200, { messages }) : fail(res, 404, "Conversa não encontrada.", "chat_not_found");
  }
  chatMatch = pathname.match(/^\/api\/chat\/conversations\/(\d+)$/);
  if (chatMatch && req.method === "DELETE") {
    return deleteChatConversation(user.id, Number(chatMatch[1])) ? json(res, 200, { ok: true }) : fail(res, 404, "Conversa não encontrada.", "chat_not_found");
  }
  chatMatch = pathname.match(/^\/api\/chat\/messages\/(\d+)\/feedback$/);
  if (chatMatch && req.method === "POST") {
    const body = await readJson(req); const chatMessage = rateChatMessage(user.id, Number(chatMatch[1]), body.feedback);
    return chatMessage ? json(res, 200, { message: chatMessage }) : fail(res, 404, "Resposta não encontrada.", "chat_message_not_found");
  }
  if (pathname === "/api/chat/messages" && req.method === "POST") {
    const body = await readJson(req); const question = text(body.message, 12000);
    if (!question) return fail(res, 400, "Digite uma pergunta para o Tutor Coda.", "empty_chat_message");
    const mode = ["explain", "hint", "code", "quiz", "research"].includes(body.mode) ? body.mode : "explain";
    const context = {
      courseId: text(body.context?.courseId, 40), courseName: text(body.context?.courseName, 100),
      lessonIndex: Number.isInteger(body.context?.lessonIndex) ? body.context.lessonIndex : null,
      language: text(body.context?.language, 40), progress: body.context?.progress && typeof body.context.progress === "object" ? body.context.progress : {}
    };
    const sources = Array.isArray(body.sources) ? body.sources.slice(0, 5).map(source => ({
      courseId: text(source.courseId, 40), courseName: text(source.courseName, 100), title: text(source.title, 180),
      lessonIndex: Number.isInteger(source.lessonIndex) ? source.lessonIndex : null, excerpt: text(source.excerpt, 2400)
    })) : [];
    const codes = Array.isArray(body.codes) ? body.codes.slice(0, 14).map(item => ({
      language: text(item?.language, 30), label: text(item?.label, 100), code: text(item?.code, 12000)
    })).filter(item => item.code.trim()) : [];
    const image = /^data:image\/(png|jpeg|webp);base64,/i.test(String(body.image || "")) ? text(body.image, 700_000) : "";
    let conversation = body.conversationId ? getChatConversation(user.id, Number(body.conversationId)) : null;
    if (body.conversationId && !conversation) return fail(res, 404, "Conversa não encontrada.", "chat_not_found");
    if (!conversation) conversation = createChatConversation(user.id, { mode, courseId: context.courseId, lessonIndex: context.lessonIndex });
    const history = listChatMessages(user.id, conversation.id, 20) || [];
    const userMessage = addChatMessage(user.id, conversation.id, {
      role: "user", content: question, code: text(body.code, 12000),
      conversation: { mode, courseId: context.courseId, lessonIndex: context.lessonIndex }
    });
    const answer = await answerChat({ user, message: question, mode, code: text(body.code, 12000), codes, image, sources, context, history, workspace: getWorkspace(user.id) });
    const responseSources = Array.isArray(answer.sources) && answer.sources.length ? answer.sources : sources;
    const assistantMessage = addChatMessage(user.id, conversation.id, {
      role: "assistant", content: answer.text, sources: responseSources, actions: answer.actions,
      conversation: { mode, courseId: context.courseId, lessonIndex: context.lessonIndex, provider: answer.provider, model: answer.model }
    });
    return json(res, 201, { conversationId: Number(conversation.id), userMessage, message: assistantMessage, provider: answer.provider, model: answer.model });
  }

  if (pathname === "/api/overview" && req.method === "GET") return json(res, 200, overview(user));
  if (pathname === "/api/classes" && req.method === "GET") return json(res, 200, { classes: listClasses(user) });
  if (pathname === "/api/classes" && req.method === "POST") {
    if (user.role !== "Professor") return fail(res, 403, "Apenas professores criam turmas.", "permission_denied");
    const body = await readJson(req); const name = text(body.name, 100);
    if (!name) return fail(res, 400, "Informe o nome da turma.");
    const classroom = createClass(user.id, { name, subject: text(body.subject, 100) || "Tecnologia", description: text(body.description, 1000), joinCode: randomJoinCode() });
    return json(res, 201, { classroom });
  }
  if (pathname === "/api/classes/join" && req.method === "POST") {
    if (user.role !== "Aluno") return fail(res, 403, "Apenas alunos entram em turmas.", "permission_denied");
    const body = await readJson(req); const classroom = joinClass(user.id, text(body.code, 30));
    if (!classroom) return fail(res, 404, "Código de turma não encontrado.", "class_not_found");
    return json(res, 200, { classroom });
  }
  if (pathname === "/api/students" && req.method === "GET") {
    if (!["Professor", "Admin"].includes(user.role)) return fail(res, 403, "Acesso restrito à gestão.", "permission_denied");
    return json(res, 200, { students: listRegisteredStudents(user.id) });
  }
  let match = pathname.match(/^\/api\/classes\/(\d+)$/);
  if (match && req.method === "PATCH") {
    if (user.role !== "Professor") return fail(res, 403, "Apenas professores alteram turmas.", "permission_denied");
    const body = await readJson(req); const classroom = updateClass(user.id, Number(match[1]), { name: text(body.name, 100) || undefined, subject: text(body.subject, 100) || undefined, description: body.description === undefined ? undefined : text(body.description, 1000), archived: body.archived === undefined ? undefined : Number(Boolean(body.archived)) });
    return classroom ? json(res, 200, { classroom }) : fail(res, 404, "Turma não encontrada.");
  }
  match = pathname.match(/^\/api\/classes\/(\d+)\/members$/);
  if (match && req.method === "GET") {
    if (!["Professor", "Admin"].includes(user.role)) return fail(res, 403, "Acesso restrito à gestão.", "permission_denied");
    const members = classMembers(user.id, Number(match[1])); return members ? json(res, 200, { members }) : fail(res, 404, "Turma não encontrada.");
  }
  if (match && req.method === "POST") {
    if (!["Professor", "Admin"].includes(user.role)) return fail(res, 403, "Acesso restrito à gestão.", "permission_denied");
    const body = await readJson(req); const enrollment = enrollStudent(user.id, Number(match[1]), Number(body.studentId));
    return enrollment ? json(res, 201, { enrollment }) : fail(res, 404, "Turma ou aluno não encontrado.");
  }
  match = pathname.match(/^\/api\/classes\/(\d+)\/members\/(\d+)$/);
  if (match && req.method === "PATCH") {
    if (user.role !== "Professor") return fail(res, 403, "Acesso restrito ao professor.", "permission_denied");
    const body = await readJson(req); const ok = setEnrollmentStatus(user.id, Number(match[1]), Number(match[2]), body.status === "paused" ? "paused" : "active");
    return ok ? json(res, 200, { ok: true }) : fail(res, 404, "Matrícula não encontrada.");
  }

  if (pathname === "/api/announcements" && req.method === "GET") return json(res, 200, { announcements: listAnnouncements(user, searchParams.get("classId")) });
  if (pathname === "/api/announcements" && req.method === "POST") {
    if (user.role !== "Professor") return fail(res, 403, "Apenas professores publicam avisos.", "permission_denied");
    const body = await readJson(req); const title = text(body.title, 120); const message = text(body.body, 3000);
    if (!title || !message) return fail(res, 400, "Informe título e mensagem do aviso.");
    const item = createAnnouncement(user, Number(body.classId), title, message);
    return item ? json(res, 201, { announcement: item }) : fail(res, 404, "Turma não encontrada.");
  }
  if (pathname === "/api/messages" && req.method === "GET") {
    const requestedClass = searchParams.get("classId");
    const messages = listMessages(user, requestedClass ? Number(requestedClass) : null); return messages ? json(res, 200, { messages }) : fail(res, 403, "Sem acesso a esta turma.");
  }
  if (pathname === "/api/messages" && req.method === "POST") {
    const body = await readJson(req); const message = text(body.body, 3000); if (!message) return fail(res, 400, "Escreva a mensagem.");
    const item = createMessage(user, { classId: Number(body.classId), parentId: body.parentId ? Number(body.parentId) : null, title: text(body.title, 120), body: message });
    return item ? json(res, 201, { message: item }) : fail(res, 403, "Sem acesso a esta turma.");
  }

  if (pathname === "/api/notifications" && req.method === "GET") return json(res, 200, { notifications: listNotifications(user.id) });
  if (pathname === "/api/notifications/read" && req.method === "POST") { markNotificationsRead(user.id); return json(res, 200, { ok: true }); }
  if (pathname === "/api/workspace" && req.method === "GET") return json(res, 200, getWorkspace(user.id));
  if (pathname === "/api/workspace" && req.method === "PUT") { const body = await readJson(req); return json(res, 200, saveWorkspace(user.id, body)); }
  if (pathname === "/api/events" && req.method === "POST") { const body = await readJson(req); addLearningEvent(user.id, { type: text(body.type, 80), courseId: text(body.courseId, 40), lesson: Number.isInteger(body.lesson) ? body.lesson : null, data: body.data || {} }); return json(res, 201, { ok: true }); }
  if (pathname === "/api/analytics" && req.method === "GET") {
    if (user.role !== "Professor") return fail(res, 403, "Acesso restrito ao professor.", "permission_denied");
    return json(res, 200, teacherAnalytics(user.id, searchParams.get("classId")));
  }
  if (pathname === "/api/teacher/diary" && req.method === "GET") {
    if (user.role !== "Professor") return fail(res, 403, "Acesso restrito ao professor.", "permission_denied");
    const diary = teacherDiary(user.id, Number(searchParams.get("classId")), searchParams.get("date"));
    return diary ? json(res, 200, diary) : fail(res, 404, "Turma não encontrada.");
  }
  if (pathname === "/api/teacher/attendance" && req.method === "PUT") {
    if (user.role !== "Professor") return fail(res, 403, "Acesso restrito ao professor.", "permission_denied");
    const body = await readJson(req), diary = saveAttendance(user.id, body);
    if(diary)recordAudit(user.id,"attendance_saved","class",body.classId,{date:body.date,records:Array.isArray(body.records)?body.records.length:0});
    return diary ? json(res, 200, diary) : fail(res, 404, "Turma não encontrada.");
  }
  if (pathname === "/api/teacher/grades" && req.method === "POST") {
    if (user.role !== "Professor") return fail(res, 403, "Acesso restrito ao professor.", "permission_denied");
    const body = await readJson(req), grade = saveGrade(user.id, body);
    if(grade)recordAudit(user.id,"grade_saved","grade",grade.id,{classId:body.classId,studentId:body.studentId});
    return grade ? json(res, 201, { grade }) : fail(res, 404, "Turma ou aluno não encontrado.");
  }
  if (pathname === "/api/teacher/rubrics" && req.method === "POST") {
    if (user.role !== "Professor") return fail(res, 403, "Acesso restrito ao professor.", "permission_denied");
    const body = await readJson(req), rubric = saveRubric(user.id, body);
    if(rubric)recordAudit(user.id,"rubric_saved","rubric",rubric.id,{classId:body.classId});
    return rubric ? json(res, 201, { rubric }) : fail(res, 404, "Turma não encontrada.");
  }
  if (pathname === "/api/teacher/students/import" && req.method === "POST") {
    if (user.role !== "Professor") return fail(res, 403, "Acesso restrito ao professor.", "permission_denied");
    const body = await readJson(req), rows = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [], created = [], skipped = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index] || {}, name = text(row.name, 80), email = normalizeEmail(row.email);
      const registrationCode = (text(row.registrationCode, 30).replace(/\s+/g, "").toUpperCase() || `IMP-${Date.now().toString(36)}-${index}`).slice(0, 30);
      const password = String(row.password || "").length >= 6 ? String(row.password).slice(0, 80) : `Coda@${randomBytes(5).toString("base64url")}`;
      if (name.length < 2 || !validEmail(email) || !/^[A-Z0-9._-]{3,30}$/.test(registrationCode)) { skipped.push({ row: index + 2, reason: "Dados inválidos" }); continue; }
      if (findUserByEmail(email) || findStudentByRegistration(registrationCode)) { skipped.push({ row: index + 2, reason: "E-mail ou matrícula já cadastrado" }); continue; }
      try {
        const passwordData = hashPassword(password), imported = transaction(() => {
          const account = createUser({ name, email, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, role: "Aluno", institutionId: user.institutionId });
          createStudentProfile(account.id, registrationCode); return account;
        });
        created.push({ id: imported.id, name, email, registrationCode, password });
      } catch { skipped.push({ row: index + 2, reason: "Registro duplicado ou inválido" }); }
    }
    recordAudit(user.id,"students_imported","students","",{created:created.length,skipped:skipped.length});
    return json(res, 201, { created, skipped });
  }

  if (pathname === "/api/assessments" && req.method === "GET") return json(res, 200, { assessments: listAssessments(user) });
  if (pathname === "/api/assessments" && req.method === "POST") {
    if (user.role !== "Professor") return fail(res, 403, "Apenas professores criam avaliações.", "permission_denied");
    const body = await readJson(req); if (!text(body.title, 160)) return fail(res, 400, "Informe o título da avaliação.");
    const assessment = createAssessment(user.id, { classId: body.classId ? Number(body.classId) : null, title: text(body.title, 160), description: text(body.description, 2000), courseId: text(body.courseId, 40), type: body.type, status: body.status, openAt: body.openAt || null, dueAt: body.dueAt || null, duration: Number(body.duration || 20), attempts: Number(body.attempts || 1), minimumScore: Number(body.minimumScore || 60), questions: Array.isArray(body.questions) ? body.questions.slice(0, 100) : [] });
    return assessment ? json(res, 201, { assessment: publicAssessment(assessment, true) }) : fail(res, 404, "Turma não encontrada.");
  }
  match = pathname.match(/^\/api\/assessments\/(\d+)$/);
  if (match && req.method === "GET") {
    const assessment = getAssessment(Number(match[1]), user.id); if (!assessment) return fail(res, 404, "Avaliação não encontrada.");
    return json(res, 200, { assessment: publicAssessment(assessment, user.role === "Professor") });
  }
  match = pathname.match(/^\/api\/assessments\/(\d+)\/status$/);
  if (match && req.method === "PATCH") {
    if (user.role !== "Professor") return fail(res, 403, "Acesso restrito ao professor.", "permission_denied");
    const body = await readJson(req); const status = ["draft", "published", "archived"].includes(body.status) ? body.status : "draft";
    const item = updateAssessmentStatus(user.id, Number(match[1]), status); return item ? json(res, 200, { assessment: publicAssessment(item, true) }) : fail(res, 404, "Avaliação não encontrada.");
  }
  match = pathname.match(/^\/api\/assessments\/(\d+)\/submit$/);
  if (match && req.method === "POST") {
    if (user.role !== "Aluno") return fail(res, 403, "Apenas alunos enviam respostas.", "permission_denied");
    const body = await readJson(req); const submission = submitAssessment(user.id, Number(match[1]), body.answers || {});
    if (!submission) return fail(res, 404, "Avaliação indisponível.");
    if (submission.error === "attempts_exhausted") return fail(res, 409, "Você atingiu o limite de tentativas.", submission.error);
    if (submission.error === "deadline_passed") return fail(res, 409, "O prazo desta avaliação terminou.", submission.error);
    if (submission.error === "not_open") return fail(res, 409, "Esta avaliação ainda não foi aberta.", submission.error);
    return json(res, 201, { submission });
  }
  match = pathname.match(/^\/api\/submissions\/(\d+)\/review$/);
  if (match && req.method === "PATCH") {
    if (user.role !== "Professor") return fail(res, 403, "Acesso restrito ao professor.", "permission_denied");
    const body = await readJson(req); const submission = reviewSubmission(user.id, Number(match[1]), Number(body.score || 0), text(body.feedback, 3000));
    return submission ? json(res, 200, { submission }) : fail(res, 404, "Entrega não encontrada.");
  }

  if (pathname === "/api/content" && req.method === "GET") return json(res, 200, { lessons: listLessonContent(["Professor","Admin"].includes(user.role)), materials: listMaterials(["Professor","Admin"].includes(user.role)) });
  if (pathname === "/api/content/lesson" && req.method === "PUT") {
    if (!["Professor","Admin"].includes(user.role)) return fail(res, 403, "Acesso restrito à gestão de conteúdo.", "permission_denied");
    const body = await readJson(req); const lesson = upsertLesson(user.id, { ...body, courseId: text(body.courseId, 40), lesson: Math.max(0, Math.min(6, Number(body.lesson)||0)), status: ["draft","published","archived"].includes(body.status) ? body.status : "draft", title: text(body.title, 180), context: text(body.context, 8000), explanation: text(body.explanation, 12000), system: text(body.system, 500), commonError: text(body.commonError, 3000), activity: text(body.activity, 5000), videoUrl: text(body.videoUrl, 500), videoNote: text(body.videoNote, 1000), objectives: Array.isArray(body.objectives) ? body.objectives.map(item => text(item, 500)).slice(0, 12) : [], prerequisites: Array.isArray(body.prerequisites) ? body.prerequisites.map(item => text(item, 500)).slice(0, 12) : [], checkpoints: Array.isArray(body.checkpoints) ? body.checkpoints.map(item => text(item, 500)).slice(0, 12) : [] });
    recordAudit(user.id,"lesson_updated","lesson",`${lesson.course_id}:${lesson.lesson_index}`,{status:lesson.status});return json(res, 200, { lesson });
  }
  if (pathname === "/api/materials" && req.method === "POST") {
    if (user.role !== "Professor") return fail(res, 403, "Apenas professores publicam materiais.", "permission_denied");
    const body = await readJson(req); const title = text(body.title, 200); const url = text(body.url, 600); if (!title || !/^https?:\/\//i.test(url)) return fail(res, 400, "Informe título e link público válido.");
    return json(res, 201, { material: addMaterial(user.id, { courseId: text(body.courseId, 40), lesson: Number(body.lesson ?? -1), type: text(body.type, 80), author: text(body.author, 180), title, url, note: text(body.note, 2000), status: ["draft","published","archived"].includes(body.status) ? body.status : "published" }) });
  }
  if (pathname === "/api/challenges" && req.method === "GET") return json(res, 200, { challenges: listChallenges(user) });
  if (pathname === "/api/challenges" && req.method === "POST") {
    if (user.role !== "Professor") return fail(res, 403, "Apenas professores criam desafios.", "permission_denied");
    const body = await readJson(req); const challenge = addChallenge(user.id, { classId: body.classId ? Number(body.classId) : null, courseId: text(body.courseId, 40), title: text(body.title, 160), instruction: text(body.instruction, 5000), code: String(body.code || "").slice(0, 20000), status: ["draft","published","archived"].includes(body.status) ? body.status : "draft", dueAt: body.dueAt || null });
    return challenge ? json(res, 201, { challenge }) : fail(res, 404, "Turma não encontrada.");
  }

  if (pathname === "/api/backups" && req.method === "GET") {
    if (!["Professor", "Admin"].includes(user.role)) return fail(res, 403, "Acesso restrito à gestão.", "permission_denied");
    if (!backupDirectory) return json(res, 200, { database: databasePath, backups: [] });
    const backups = readdirSync(backupDirectory).filter(name => /^coda-backup-[\w.-]+\.sqlite$/.test(name)).map(name => ({ name, size: statSync(join(backupDirectory, name)).size }));
    return json(res, 200, { database: databasePath, backups, history:listBackupHistory(user.id) });
  }
  if (pathname === "/api/backups" && req.method === "POST") {
    if (!["Professor", "Admin"].includes(user.role)) return fail(res, 403, "Acesso restrito à gestão.", "permission_denied");
    if (!backupDirectory) return fail(res, 503, "Backups não estão disponíveis neste modo de prévia.", "preview_only");
    const filename = `coda-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,target=join(backupDirectory, filename); await createBackup(target);recordBackupHistory(user.id,filename,"manual",statSync(target).size);
    return json(res, 201, { filename });
  }
  match = pathname.match(/^\/api\/backups\/(coda-backup-[\w.-]+\.sqlite)$/);
  if (match && req.method === "GET") {
    if (!["Professor", "Admin"].includes(user.role)) return fail(res, 403, "Acesso restrito à gestão.", "permission_denied");
    if (!backupDirectory) return fail(res, 404, "Backup não encontrado.");
    const file = join(backupDirectory, match[1]); if (!existsSync(file)) return fail(res, 404, "Backup não encontrado.");
    res.writeHead(200, { "Content-Type": "application/vnd.sqlite3", "Content-Disposition": `attachment; filename="${match[1]}"`, "Content-Length": statSync(file).size }); return createReadStream(file).pipe(res);
  }

  return fail(res, 404, "Rota não encontrada.", "not_found");
}

function serveStatic(req, res, pathname) {
  let requested = pathname === "/" ? "/index.html" : pathname;
  try { requested = decodeURIComponent(requested); } catch { return fail(res, 400, "Caminho inválido."); }
  const safe = normalize(requested).replace(/^([/\\])+/, "");
  const file = resolve(root, safe);
  const publicPath=safe.replaceAll("\\", "/"),allowed=publicFiles.has(publicPath)||publicDirectories.some(directory=>publicPath.startsWith(directory));
  if (!allowed || !file.startsWith(root + sep) || file.startsWith(dataDirectory + sep) || !existsSync(file) || !statSync(file).isFile()) {
    const fallback = join(root, "index.html");
    if (!extname(requested) && existsSync(fallback)) return streamFile(res, fallback, res.codaCspNonce);
    return fail(res, 404, "Arquivo não encontrado.", "not_found");
  }
  return streamFile(res, file, res.codaCspNonce);
}

function streamFile(res, file, nonce = "") {
  const extension = extname(file).toLowerCase();
  const cache = [".html", ".json", ".js", ".css"].includes(extension) ? "no-cache" : "public, max-age=3600";
  if (extension === ".html" && nonce) {
    const body = readFileSync(file, "utf8").replace('name="csp-nonce" content=""', `name="csp-nonce" content="${nonce}"`);
    res.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream", "Content-Length": Buffer.byteLength(body), "Cache-Control": cache });
    return res.end(body);
  }
  res.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream", "Content-Length": statSync(file).size, "Cache-Control": cache });
  createReadStream(file).pipe(res);
}

async function runAutomaticBackup(){
  if(!backupDirectory||environment.NODE_ENV==="test")return;
  const latest=latestAutomaticBackup(),elapsed=latest?Date.now()-new Date(latest.created_at).getTime():Infinity;
  if(elapsed<24*60*60*1000)return;
  const filename=`coda-backup-auto-${new Date().toISOString().replace(/[:.]/g,"-")}.sqlite`,target=join(backupDirectory,filename);
  await createBackup(target);recordBackupHistory(null,filename,"automatic",statSync(target).size,1);
}

export function createCodaServer() {
  const server=http.createServer(async (req, res) => {
    securityHeaders(res);
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      if (!safeMutationOrigin(req)) return fail(res, 403, "Origem da requisição não permitida.", "invalid_origin");
      if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
      if (!["GET", "HEAD"].includes(req.method)) return fail(res, 405, "Método não permitido.", "method_not_allowed");
      return serveStatic(req, res, url.pathname);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) return fail(res, error.status || 500, error.status ? error.message : "O servidor encontrou um erro.", error.status ? "invalid_request" : "server_error");
      res.end();
    }
  });
  let backupTimer=null;
  server.on("listening",()=>{if(!backupDirectory||environment.NODE_ENV==="test")return;runAutomaticBackup().catch(error=>console.error("Backup automático:",error.message));backupTimer=setInterval(()=>runAutomaticBackup().catch(error=>console.error("Backup automático:",error.message)),60*60*1000);backupTimer.unref?.()});
  server.on("close",()=>{if(backupTimer)clearInterval(backupTimer)});
  return server;
}

const entryArgument = globalThis.process?.argv?.[1];
if (entryArgument && import.meta.url === pathToFileURL(entryArgument).href) {
  const argumentValue = name => { const index = globalThis.process.argv.indexOf(name); return index >= 0 ? globalThis.process.argv[index + 1] : ""; };
  const port = Number(environment.PORT || argumentValue("--port") || 8080);
  const host = environment.HOST || argumentValue("--host") || "127.0.0.1";
  const server = createCodaServer();
  server.listen(port, host, () => {
    console.log(`Coda v10.5.0 Institucional disponível em http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
    console.log(`Banco de dados: ${databasePath}`);
    console.log(`Professor interno: ${environment.CODA_TEACHER_EMAIL || "professor@coda.local"}`);
    console.log(`Administrador interno: ${environment.CODA_ADMIN_EMAIL || "admin@coda.local"}`);
    if (!environment.CODA_TEACHER_CODE) console.log("Código inicial do professor: PROF-CODA (altere com CODA_TEACHER_CODE)");
    if (!environment.CODA_ADMIN_CODE) console.log("Código inicial do administrador: ADMIN-CODA (altere com CODA_ADMIN_CODE)");
  });
}
