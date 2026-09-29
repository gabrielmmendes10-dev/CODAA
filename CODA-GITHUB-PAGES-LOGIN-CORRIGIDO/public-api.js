"use strict";

(function exposeCodaApi(){
  const STATIC_MODE = location.hostname.endsWith(".github.io") || location.protocol === "file:";
  const ACCOUNTS_KEY = "coda-pages-accounts-v1";
  const SESSION_KEY = "coda-pages-session-v1";
  const WORKSPACE_PREFIX = "coda-pages-workspace:";

  async function request(path, options = {}) {
    const config = { credentials: "same-origin", ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) } };
    if (config.body && typeof config.body !== "string") config.body = JSON.stringify(config.body);
    const response = await fetch(path, config);
    const type = response.headers.get("content-type") || "";
    const data = type.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const error = new Error(data?.message || `Erro ${response.status}`);
      error.status = response.status; error.code = data?.error; error.data = data;
      throw error;
    }
    return data;
  }

  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const initialsName = (email, role) => {
    const base = normalizeEmail(email).split("@")[0].replace(/[._-]+/g, " ").trim();
    const readable = base.split(/\s+/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    return readable || (role === "Professor" ? "Professor Coda" : role === "Admin" ? "Administrador Coda" : "Aluno Coda");
  };

  async function hashText(value) {
    if (globalThis.crypto?.subtle) {
      const bytes = new TextEncoder().encode(String(value));
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
    }
    // Fallback apenas para navegadores antigos no modo demonstração local.
    let hash = 2166136261;
    for (const char of String(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return `fallback-${(hash >>> 0).toString(16)}`;
  }

  function loadAccounts() {
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); } catch { return []; }
  }
  function saveAccounts(accounts) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); }
  function publicUser(account) {
    if (!account) return null;
    return { id: account.id, name: account.name, email: account.email, role: account.role, registrationCode: account.registrationCode || null, active: true };
  }
  function readSession() {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const account = loadAccounts().find(item => String(item.id) === String(raw));
    return publicUser(account);
  }
  function writeSession(id, remember = true) {
    localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
    (remember === false ? sessionStorage : localStorage).setItem(SESSION_KEY, String(id));
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); }
  function localError(message, status = 400, code = "demo_error") {
    const error = new Error(message); error.status = status; error.code = code; return error;
  }

  async function ensureDemoAccounts() {
    const accounts = loadAccounts();
    const presets = [
      { id: "demo-student", name: "Aluno Demo", email: "demo@coda.local", password: "Coda2026!", role: "Aluno", registrationCode: "DEMO2026" },
      { id: "demo-teacher", name: "Professor Coda", email: "professor@coda.local", password: "CodaProf2026!", role: "Professor" },
      { id: "demo-admin", name: "Administrador Coda", email: "admin@coda.local", password: "CodaAdmin2026!", role: "Admin" }
    ];
    let changed = false;
    for (const preset of presets) {
      if (accounts.some(item => item.email === preset.email)) continue;
      accounts.push({ ...preset, passwordHash: await hashText(preset.password), createdAt: now() });
      delete accounts[accounts.length - 1].password;
      changed = true;
    }
    if (changed) saveAccounts(accounts);
  }

  async function localMe() { await ensureDemoAccounts(); return { user: readSession() }; }
  async function localRegister(data = {}) {
    await ensureDemoAccounts();
    const name = String(data.name || "").trim();
    const email = normalizeEmail(data.email);
    const password = String(data.password || "");
    const confirmPassword = String(data.confirmPassword || "");
    const registrationCode = String(data.registrationCode || "").trim().replace(/\s+/g, "").toUpperCase();
    if (name.length < 2 || !validEmail(email) || password.length < 6) throw localError("Informe nome, e-mail válido e senha com pelo menos 6 caracteres.", 400, "invalid_registration");
    if (!/^[A-Z0-9._-]{3,30}$/.test(registrationCode)) throw localError("A matrícula deve ter de 3 a 30 letras, números, ponto, traço ou sublinhado.", 400, "invalid_registration_code");
    if (password !== confirmPassword) throw localError("As senhas não coincidem.", 400, "password_mismatch");
    const accounts = loadAccounts();
    if (accounts.some(item => item.email === email)) throw localError("Já existe uma conta com este e-mail. Use a opção Entrar.", 409, "email_in_use");
    if (accounts.some(item => item.registrationCode === registrationCode)) throw localError("Esta matrícula já está cadastrada.", 409, "registration_in_use");
    const account = { id: `student-${Date.now()}`, name, email, passwordHash: await hashText(password), role: "Aluno", registrationCode, createdAt: now() };
    accounts.push(account); saveAccounts(accounts); writeSession(account.id, data.remember !== false);
    return { user: publicUser(account), created: true, demo: true };
  }
  async function localLogin(data = {}) {
    await ensureDemoAccounts();
    const email = normalizeEmail(data.email);
    const password = String(data.password || "");
    const role = ["Aluno", "Professor", "Admin"].includes(data.role) ? data.role : "Aluno";
    if (!validEmail(email) || password.length < 6) throw localError("Informe e-mail válido e senha com pelo menos 6 caracteres.", 400, "invalid_credentials");
    if (role === "Professor" && data.teacherCode !== "PROF-CODA") throw localError("Código de professor incorreto.", 403, "invalid_teacher_code");
    if (role === "Admin" && data.adminCode !== "ADMIN-CODA") throw localError("Código de administrador incorreto.", 403, "invalid_admin_code");
    const accounts = loadAccounts();
    const account = accounts.find(item => item.email === email);
    if (!account) {
      if (role === "Aluno") throw localError("Conta de aluno não encontrada. Use “Criar conta” ou a conta demo.", 401, "invalid_credentials");
      const created = { id: `${role.toLowerCase()}-${Date.now()}`, name: initialsName(email, role), email, passwordHash: await hashText(password), role, createdAt: now() };
      accounts.push(created); saveAccounts(accounts); writeSession(created.id, data.remember !== false);
      return { user: publicUser(created), created: true, demo: true };
    }
    if (account.role !== role) throw localError(`Esta conta pertence ao portal de ${account.role.toLowerCase()}.`, 403, "wrong_portal");
    if (account.passwordHash !== await hashText(password)) throw localError("E-mail ou senha incorretos.", 401, "invalid_credentials");
    writeSession(account.id, data.remember !== false);
    return { user: publicUser(account), created: false, demo: true };
  }
  async function localLogout() { clearSession(); return { ok: true }; }
  function currentWorkspaceKey() { return `${WORKSPACE_PREFIX}${readSession()?.email || "anonymous"}`; }
  async function localWorkspace() {
    try { return { data: JSON.parse(localStorage.getItem(currentWorkspaceKey()) || "{}") }; } catch { return { data: {} }; }
  }
  async function localSaveWorkspace(data) { localStorage.setItem(currentWorkspaceKey(), JSON.stringify(data || {})); return { ok: true, data }; }

  const emptySummary = () => ({ classes: 0, students: 0, assessments: 0, pendingAssessments: 0, unreadNotifications: 0, lessonsEdited: 0, pendingReviews: 0 });
  const ok = async payload => clone(payload);
  const unsupportedWrite = async () => { throw localError("Este recurso precisa do servidor Node. No GitHub Pages, use o modo demonstração para aulas, laboratório e realidade aumentada.", 503, "static_demo_only"); };

  const remoteApi = {
    request,
    me: () => request("/api/auth/me"),
    login: data => request("/api/auth/login", { method: "POST", body: data }),
    registerStudent: data => request("/api/auth/register", { method: "POST", body: data }),
    logout: () => request("/api/auth/logout", { method: "POST", body: {} }),
    adminDashboard: () => request("/api/admin/dashboard"),
    saveInstitution: data => request("/api/admin/institution", { method: "PUT", body: data }),
    setUserActive: (id, active) => request(`/api/admin/users/${id}`, { method: "PATCH", body: { active } }),
    updateUserAccess: (id, data) => request(`/api/admin/users/${id}`, { method: "PATCH", body: data }),
    setPrivacyTask: (id, completed) => request(`/api/admin/privacy/${id}`, { method: "PATCH", body: { completed } }),
    overview: () => request("/api/overview"),
    classes: () => request("/api/classes"), createClass: data => request("/api/classes", { method: "POST", body: data }), updateClass: (id, data) => request(`/api/classes/${id}`, { method: "PATCH", body: data }), joinClass: code => request("/api/classes/join", { method: "POST", body: { code } }),
    students: () => request("/api/students"), classMembers: id => request(`/api/classes/${id}/members`), enrollStudent: (classId, studentId) => request(`/api/classes/${classId}/members`, { method: "POST", body: { studentId } }), setEnrollment: (classId, studentId, status) => request(`/api/classes/${classId}/members/${studentId}`, { method: "PATCH", body: { status } }),
    announcements: classId => request(`/api/announcements${classId ? `?classId=${encodeURIComponent(classId)}` : ""}`), createAnnouncement: data => request("/api/announcements", { method: "POST", body: data }),
    messages: classId => request(`/api/messages${classId ? `?classId=${encodeURIComponent(classId)}` : ""}`), createMessage: data => request("/api/messages", { method: "POST", body: data }),
    chatStatus: () => request("/api/chat/status"), chatConversations: () => request("/api/chat/conversations"), createChatConversation: data => request("/api/chat/conversations", { method: "POST", body: data }), chatMessages: id => request(`/api/chat/conversations/${id}/messages`), deleteChatConversation: id => request(`/api/chat/conversations/${id}`, { method: "DELETE", body: {} }), sendChatMessage: data => request("/api/chat/messages", { method: "POST", body: data }), rateChatMessage: (id, feedback) => request(`/api/chat/messages/${id}/feedback`, { method: "POST", body: { feedback } }),
    notifications: () => request("/api/notifications"), markNotificationsRead: () => request("/api/notifications/read", { method: "POST", body: {} }),
    workspace: () => request("/api/workspace"), saveWorkspace: data => request("/api/workspace", { method: "PUT", body: data }), event: data => request("/api/events", { method: "POST", body: data }), analytics: classId => request(`/api/analytics${classId ? `?classId=${classId}` : ""}`),
    diary: (classId, date) => request(`/api/teacher/diary?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`), saveAttendance: data => request("/api/teacher/attendance", { method: "PUT", body: data }), saveGrade: data => request("/api/teacher/grades", { method: "POST", body: data }), saveRubric: data => request("/api/teacher/rubrics", { method: "POST", body: data }), importStudents: rows => request("/api/teacher/students/import", { method: "POST", body: { rows } }),
    assessments: () => request("/api/assessments"), assessment: id => request(`/api/assessments/${id}`), createAssessment: data => request("/api/assessments", { method: "POST", body: data }), assessmentStatus: (id, status) => request(`/api/assessments/${id}/status`, { method: "PATCH", body: { status } }), submitAssessment: (id, answers) => request(`/api/assessments/${id}/submit`, { method: "POST", body: { answers } }), reviewSubmission: (id, data) => request(`/api/submissions/${id}/review`, { method: "PATCH", body: data }),
    content: () => request("/api/content"), saveLesson: data => request("/api/content/lesson", { method: "PUT", body: data }), addMaterial: data => request("/api/materials", { method: "POST", body: data }), challenges: () => request("/api/challenges"), addChallenge: data => request("/api/challenges", { method: "POST", body: data }), backups: () => request("/api/backups"), createBackup: () => request("/api/backups", { method: "POST", body: {} }), auditLog: () => request("/api/admin/audit-log")
  };

  const localApi = {
    request: unsupportedWrite,
    me: localMe, login: localLogin, registerStudent: localRegister, logout: localLogout,
    adminDashboard: () => ok({ users: [], institution: {}, privacy: [], stats: emptySummary() }), saveInstitution: unsupportedWrite, setUserActive: unsupportedWrite, updateUserAccess: unsupportedWrite, setPrivacyTask: unsupportedWrite,
    overview: async () => emptySummary(),
    classes: () => ok({ classes: [] }), createClass: unsupportedWrite, updateClass: unsupportedWrite, joinClass: unsupportedWrite,
    students: () => ok({ students: [] }), classMembers: () => ok({ members: [] }), enrollStudent: unsupportedWrite, setEnrollment: unsupportedWrite,
    announcements: () => ok({ announcements: [] }), createAnnouncement: unsupportedWrite,
    messages: () => ok({ messages: [] }), createMessage: unsupportedWrite,
    chatStatus: () => ok({ provider: "local", model: "Modo demo GitHub Pages" }), chatConversations: () => ok({ conversations: [] }), createChatConversation: () => ok({ conversation: { id: Date.now() } }), chatMessages: () => ok({ messages: [] }), deleteChatConversation: () => ok({ ok: true }), sendChatMessage: unsupportedWrite, rateChatMessage: () => ok({ ok: true }),
    notifications: () => ok({ notifications: [] }), markNotificationsRead: () => ok({ ok: true }),
    workspace: localWorkspace, saveWorkspace: localSaveWorkspace, event: () => ok({ ok: true }), analytics: () => ok({ users: [], events: [], quizResults: [] }),
    diary: () => ok({ members: [], attendance: [], grades: [], rubrics: [] }), saveAttendance: unsupportedWrite, saveGrade: unsupportedWrite, saveRubric: unsupportedWrite, importStudents: unsupportedWrite,
    assessments: () => ok({ assessments: [] }), assessment: unsupportedWrite, createAssessment: unsupportedWrite, assessmentStatus: unsupportedWrite, submitAssessment: unsupportedWrite, reviewSubmission: unsupportedWrite,
    content: () => ok({ lessons: [], materials: [] }), saveLesson: unsupportedWrite, addMaterial: unsupportedWrite,
    challenges: () => ok({ challenges: [] }), addChallenge: unsupportedWrite,
    backups: () => ok({ backups: [] }), createBackup: unsupportedWrite, auditLog: () => ok({ entries: [] })
  };

  const api = STATIC_MODE ? localApi : remoteApi;
  window.CODA_STATIC_DEMO = STATIC_MODE;
  window.CodaAPI = Object.freeze(api);

  if (STATIC_MODE) {
    ensureDemoAccounts().catch(console.warn);
    document.addEventListener("DOMContentLoaded", () => {
      const help = document.getElementById("loginHelp");
      if (help) help.innerHTML = 'GitHub Pages • modo demonstração local. Conta rápida: <b>demo@coda.local</b> / <b>Coda2026!</b>. Você também pode usar “Criar conta”.';
    }, { once: true });
  }
})();
