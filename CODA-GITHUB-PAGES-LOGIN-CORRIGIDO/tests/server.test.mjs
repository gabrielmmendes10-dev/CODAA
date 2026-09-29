import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "coda-v8-test-"));
process.env.NODE_ENV = "test";
process.env.CODA_DATABASE = join(temporaryDirectory, "coda-test.sqlite");
process.env.CODA_TEACHER_NAME = "Professora Ana";
process.env.CODA_TEACHER_EMAIL = "ana@coda.local";
process.env.CODA_TEACHER_PASSWORD = "segredo123";
process.env.CODA_TEACHER_CODE = "PROF-CODA-TESTE";
process.env.CODA_ADMIN_NAME = "Gestora Coda";
process.env.CODA_ADMIN_EMAIL = "gestora@coda.local";
process.env.CODA_ADMIN_PASSWORD = "segredo123";
process.env.CODA_ADMIN_CODE = "ADMIN-CODA-TESTE";

const { createCodaServer } = await import(`../server.mjs?test=${Date.now()}`);
const { db } = await import("../db.mjs");

let server;
let baseUrl;
let teacherCookie = "";
let studentCookie = "";
let secondStudentCookie = "";
let adminCookie = "";
let classroom;
let assessment;
let studentSubmission;
let studentQuestion;

async function api(path, { method = "GET", body, cookie = "" } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, data, cookie: response.headers.get("set-cookie")?.split(";")[0] || "" };
}

before(async () => {
  server = createCodaServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  db.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("entrega somente os arquivos públicos", async () => {
  const health = await api("/api/health");
  assert.equal(health.response.status, 200);
  assert.deepEqual(health.data, { ok: true, version: "10.9.1" });
  const home = await api("/");
  assert.equal(home.response.status, 200);
  assert.match(home.data, /coda/i);
  const csp = home.response.headers.get("content-security-policy") || "";
  const scriptPolicy = csp.match(/script-src[^;]+/)?.[0] || "";
  assert.doesNotMatch(scriptPolicy, /unsafe-inline/);
  assert.match(csp, /script-src[^;]*nonce-/);
  assert.match(csp, /style-src 'self' 'unsafe-inline' https:\/\/fonts\.googleapis\.com/);
  assert.match(csp, /font-src[^;]*https:\/\/vlibras\.gov\.br/);
  assert.match(csp, /frame-src[^;]*https:\/\/vlibras\.gov\.br/);
  assert.match(home.data, /<meta name="csp-nonce" content="[^"]+">/);
  const privateFile = await api("/server.mjs");
  assert.equal(privateFile.response.status, 404);
  const privateChatService = await api("/chat-service.mjs");
  assert.equal(privateChatService.response.status, 404);
  assert.match(home.data, /data-teacher-section="questions"/);
  assert.match(home.data, /data-teacher-section="diary"/);
  assert.match(home.data, /data-admin-section="content"/);
  assert.match(home.data, /id="teacherEnrollForm"/);
  assert.match(home.data, /<div vw class="enabled" aria-label="Tradutor de Libras"><div vw-access-button/);
  assert.match(home.data, /id="readCurrentPage"/);
  assert.match(home.data, /data-component-type="motor"/);
  const loaderScript = await api("/script.js");
  assert.match(loaderScript.data, /js\/core\.js/);
  const clientScript = await api("/js/core.js");
  assert.match(clientScript.data, /function set3DSimulation/);
  assert.match(clientScript.data, /nexo-3d-prototype/);
  assert.match(clientScript.data, /function microVideoSlides/);
  assert.match(clientScript.data, /lessonChecks/);
  const adminScript = await api("/admin.js");
  assert.match(adminScript.data, /function createUserRow\(user\)/);
  assert.match(adminScript.data, /document\.createDocumentFragment\(\)/);
  assert.match(adminScript.data, /root\.replaceChildren\(\)/);
  assert.doesNotMatch(adminScript.data, /adminUserList"\)\.innerHTML=users\.map/);
  const cssManifest = await api("/style.css");
  assert.match(cssManifest.data, /themes\/light\.css/);
  const legacyStyles = await api("/styles/legacy.css");
  const baseStyles = await api("/styles/base.css");
  const lightThemeStyles = await api("/themes/light.css");
  const orbitStyles = await api("/components/orbitals.css");
  const loginStyles = await api("/components/login.css");
  const stylesheet = { data: `${legacyStyles.data}\n${baseStyles.data}\n${orbitStyles.data}` };
  assert.doesNotMatch(stylesheet.data, /\[vw-access-button\]:empty::after/);
  assert.match(stylesheet.data, /div\[vw\]\.enabled\{right:0!important;bottom:0!important/);
  assert.match(stylesheet.data, /\.admin-content-editor \.admin-form-grid\{grid-template-columns:repeat\(12/);
  assert.match(stylesheet.data, /\.admin-view form :is\(input,select,textarea\),\.admin-search input/);
  assert.match(stylesheet.data, /\.admin-content-editor \.admin-form-grid>label:nth-child\(3\)\{grid-column:span 3\}/);
  assert.match(stylesheet.data, /\.login-screen \.login-orbit\{animation:loginOrbitSlowStable 42s linear infinite!important/);
  assert.match(stylesheet.data, /\.orbit-runner\{[^}]*animation:orbitRunner var\(--orbit-duration\) linear infinite/);
  assert.match(stylesheet.data, /\.login-screen \.login-visual,/);
  assert.match(lightThemeStyles.data, /\[data-theme="light"\] \.login-screen \.login-copy h1\{color:#f7f8fc/);
  assert.match(lightThemeStyles.data, /\[data-theme="light"\] \.login-screen \.login-card\{background:var\(--surface\)/);
  assert.doesNotMatch(loginStyles.data, /\[data-theme="light"\]/);
  assert.match(stylesheet.data, /\.login-screen \.portal-switch button\.active,/);
  const html = await api("/index.html");
  assert.match(html.data, /id="chatModes"/);
  assert.match(html.data, /id="chatHistory"/);
  assert.match(html.data, /id="chatAnalyzeCurrent"/);
  assert.match(html.data, /id="chatAnalyzeAll"/);
  assert.match(html.data, /data-chat-mode="research"/);
  assert.match(html.data, /id="loginModeSwitch"/);
  assert.match(html.data, /id="studentRegistration"/);
  assert.match(html.data, /id="teacherCode"/);
  assert.doesNotMatch(html.data, /<span>(?:AL|PR|AD)<\/span>/);
  assert.doesNotMatch(html.data, /<script[^>]+src="https:\/\/vlibras\.gov\.br\/app\/vlibras-plugin\.js"/);
  assert.match(clientScript.data, /function loadVLibrasWhenIdle/);
  assert.match(clientScript.data, /plugin\.async=true/);
  assert.match(clientScript.data, /requestIdleCallback/);
  assert.match(clientScript.data, /new window\.VLibras\.Widget\("https:\/\/vlibras\.gov\.br\/app"\)/);
  assert.match(html.data, /governodigital\/pt-br\/acessibilidade-e-usuario\/vlibras/);
  assert.doesNotMatch(html.data, /src="vlibras\.js/);
});

test("cria contas de professor e administrador somente com o código correto", async () => {
  const invalidCode = await api("/api/auth/login", { method: "POST", body: { email: "ana@coda.local", password: "segredo123", role: "Professor", teacherCode: "ERRADO" } });
  assert.equal(invalidCode.response.status, 403);
  assert.equal(invalidCode.data.error, "invalid_teacher_code");
  const result = await api("/api/auth/login", { method: "POST", body: { email: "professor.novo@example.com", password: "minhasenha123", role: "Professor", teacherCode: "PROF-CODA-TESTE" } });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.created, true);
  assert.equal(result.data.user.role, "Professor");
  const invalidStudent = await api("/api/auth/register", { method: "POST", body: { name: "Aluno Teste", email: "aluno@example.com", registrationCode: "MAT-1", password: "segredo123", confirmPassword: "outrasenha" } });
  assert.equal(invalidStudent.response.status, 400);
});

test("professor interno entra, cria turma, conteúdo e avaliação", async () => {
  const login = await api("/api/auth/login", { method: "POST", body: { email: "ana@coda.local", password: "segredo123", role: "Professor", teacherCode: "PROF-CODA-TESTE" } });
  assert.equal(login.response.status, 200);
  assert.equal(login.data.user.role, "Professor");
  assert.equal(login.data.created, false);
  teacherCookie = login.cookie;

  const createdClass = await api("/api/classes", { method: "POST", cookie: teacherCookie, body: { name: "Turma Web A", subject: "Desenvolvimento Web", description: "Semestre integrado" } });
  assert.equal(createdClass.response.status, 201);
  classroom = createdClass.data.classroom;
  assert.match(classroom.join_code, /^[A-F0-9]{8}$/);

  const announcement = await api("/api/announcements", { method: "POST", cookie: teacherCookie, body: { classId: classroom.id, title: "Boas-vindas", body: "Começaremos pela trilha de HTML." } });
  assert.equal(announcement.response.status, 201);

  const lesson = await api("/api/content/lesson", { method: "PUT", cookie: teacherCookie, body: {
    courseId: "html", lesson: 0, status: "published", title: "Como a Web e o HTML funcionam",
    context: "Do navegador ao servidor.", explanation: "A requisição HTTP retorna um documento que o navegador interpreta.",
    system: "página institucional", commonError: "Ignorar a semântica.", activity: "Inspecione a resposta e identifique a estrutura.",
    videoUrl: "https://www.youtube.com/watch?v=UB1O30fR-EE", videoNote: "Observe a estrutura.",
    objectives: ["Explicar o fluxo cliente-servidor."], prerequisites: ["Usar o navegador."], checkpoints: ["Distinguir HTML de HTTP."]
  } });
  assert.equal(lesson.response.status, 200);
  assert.equal(lesson.data.lesson.status, "published");

  const material = await api("/api/materials", { method: "POST", cookie: teacherCookie, body: { courseId: "html", lesson: 0, type: "Documentação", author: "MDN", title: "Introdução ao HTML", url: "https://developer.mozilla.org/pt-BR/docs/Learn/HTML", note: "Leia após a aula.", status: "published" } });
  assert.equal(material.response.status, 201);

  const challenge = await api("/api/challenges", { method: "POST", cookie: teacherCookie, body: { classId: classroom.id, courseId: "html", title: "Página semântica", instruction: "Crie a estrutura de uma notícia.", code: "<main></main>", status: "published" } });
  assert.equal(challenge.response.status, 201);

  const createdAssessment = await api("/api/assessments", { method: "POST", cookie: teacherCookie, body: {
    classId: classroom.id, courseId: "html", type: "atividade", status: "published", title: "Diagnóstico HTML",
    description: "Questões objetiva e discursiva.", duration: 20, attempts: 1, minimumScore: 60,
    questions: [
      { type: "multiple_choice", prompt: "Qual elemento representa o conteúdo principal?", options: ["main", "style", "script", "meta"], correctAnswer: "0", explanation: "main identifica o conteúdo principal.", points: 1 },
      { type: "essay", prompt: "Explique por que usar semântica.", options: [], correctAnswer: "", explanation: "Correção manual.", points: 2 }
    ]
  } });
  assert.equal(createdAssessment.response.status, 201);
  assessment = createdAssessment.data.assessment;
  assert.equal(assessment.questions.length, 2);
});

test("aluno tem portal, dados e permissões separados", async () => {
  const registration = await api("/api/auth/register", { method: "POST", body: { name: "João Aluno", email: "joao@example.com", registrationCode: "DS2026-001", password: "segredo123", confirmPassword: "segredo123" } });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.data.user.role, "Aluno");
  studentCookie = registration.cookie;

  const forbidden = await api("/api/classes", { method: "POST", cookie: studentCookie, body: { name: "Turma indevida" } });
  assert.equal(forbidden.response.status, 403);
  const forbiddenDirectory = await api("/api/students", { cookie: studentCookie });
  assert.equal(forbiddenDirectory.response.status, 403);

  const joined = await api("/api/classes/join", { method: "POST", cookie: studentCookie, body: { code: classroom.join_code } });
  assert.equal(joined.response.status, 200);

  const content = await api("/api/content", { cookie: studentCookie });
  assert.equal(content.response.status, 200);
  assert.equal(content.data.lessons.length, 1);
  assert.equal(content.data.materials.length, 1);

  const challenges = await api("/api/challenges", { cookie: studentCookie });
  assert.equal(challenges.data.challenges.length, 1);

  const assigned = await api("/api/assessments", { cookie: studentCookie });
  assert.equal(assigned.data.assessments.length, 1);
  assert.equal(assigned.data.assessments[0].title, "Diagnóstico HTML");
});

test("Tutor Coda mantém contexto, analisa código e salva o histórico", async () => {
  const status = await api("/api/chat/status", { cookie: studentCookie });
  assert.equal(status.response.status, 200);
  assert.equal(status.data.provider, "local");

  const response = await api("/api/chat/messages", { method: "POST", cookie: studentCookie, body: {
    message: "Por que meu laço não termina?", mode: "code",
    code: "for (let i = 0; i < 10; i--) { console.log(i); }",
    context: { courseId: "javascript", courseName: "JavaScript", lessonIndex: 2, language: "javascript", progress: { lessons: 3 } },
    sources: [{ courseId: "javascript", courseName: "JavaScript", lessonIndex: 2, title: "Repetições", excerpt: "Laços repetem instruções enquanto uma condição continua verdadeira." }]
  } });
  assert.equal(response.response.status, 201);
  assert.equal(response.data.provider, "local");
  assert.match(response.data.message.content, /laço|contador|repetição/i);
  assert.equal(response.data.message.sources[0].courseId, "javascript");
  const conversationId = response.data.conversationId;

  const batch = await api("/api/chat/messages", { method: "POST", cookie: studentCookie, body: {
    message: "Analise todos os códigos do laboratório.", mode: "code",
    codes: [
      { language: "html", label: "HTML • index.html", code: "<main><h1>Ok</h1></main>" },
      { language: "python", label: "Python • main.py", code: "if ativo\n    print(ativo)" }
    ],
    context: { courseId: "html", courseName: "HTML", lessonIndex: 0, language: "html" }
  } });
  assert.equal(batch.response.status, 201);
  assert.match(batch.data.message.content, /2 código\(s\) analisado\(s\)/i);
  assert.match(batch.data.message.content, /Python • main\.py.*alerta/s);

  const followUp = await api("/api/chat/messages", { method: "POST", cookie: studentCookie, body: {
    conversationId, message: "Pode me dar só uma pista?", mode: "hint",
    context: { courseId: "javascript", courseName: "JavaScript", lessonIndex: 2, language: "javascript" },
    sources: [{ courseId: "javascript", courseName: "JavaScript", lessonIndex: 2, title: "Repetições", excerpt: "A atualização precisa aproximar o contador da condição de parada." }]
  } });
  assert.equal(followUp.response.status, 201);
  assert.equal(followUp.data.conversationId, conversationId);

  const conversations = await api("/api/chat/conversations", { cookie: studentCookie });
  assert.ok(conversations.data.conversations.some(item => item.id === conversationId && item.message_count === 4));
  const messages = await api(`/api/chat/conversations/${conversationId}/messages`, { cookie: studentCookie });
  assert.equal(messages.data.messages.length, 4);

  const rated = await api(`/api/chat/messages/${followUp.data.message.id}/feedback`, { method: "POST", cookie: studentCookie, body: { feedback: 1 } });
  assert.equal(rated.response.status, 200);
  assert.equal(rated.data.message.feedback, 1);

  const otherUser = await api(`/api/chat/conversations/${conversationId}/messages`, { cookie: teacherCookie });
  assert.equal(otherUser.response.status, 404);
  const removed = await api(`/api/chat/conversations/${conversationId}`, { method: "DELETE", cookie: studentCookie, body: {} });
  assert.equal(removed.response.status, 200);
  const removedBatch = await api(`/api/chat/conversations/${batch.data.conversationId}`, { method: "DELETE", cookie: studentCookie, body: {} });
  assert.equal(removedBatch.response.status, 200);
});

test("salva progresso, eventos, dúvidas e entrega de avaliação", async () => {
  const workspace = await api("/api/workspace", { method: "PUT", cookie: studentCookie, body: { summary: { lessons: 3, activities: 2, studyMinutes: 45 }, completed: { "html:0": true }, notes: { "html:0": "Resumo próprio" } } });
  assert.equal(workspace.response.status, 200);

  const event = await api("/api/events", { method: "POST", cookie: studentCookie, body: { type: "aula_concluida", courseId: "html", lesson: 0, data: { title: "Introdução" } } });
  assert.equal(event.response.status, 201);

  const question = await api("/api/messages", { method: "POST", cookie: studentCookie, body: { classId: classroom.id, title: "Dúvida sobre main", body: "Posso ter mais de um main na página?" } });
  assert.equal(question.response.status, 201);
  studentQuestion = question.data.message;

  const detail = await api(`/api/assessments/${assessment.id}`, { cookie: studentCookie });
  assert.equal(detail.response.status, 200);
  assert.equal(detail.data.assessment.questions[0].correctAnswer, undefined);
  const [objective, essay] = detail.data.assessment.questions;
  const submitted = await api(`/api/assessments/${assessment.id}/submit`, { method: "POST", cookie: studentCookie, body: { answers: { [objective.id]: "0", [essay.id]: "A semântica comunica a função de cada parte." } } });
  assert.equal(submitted.response.status, 201);
  assert.equal(submitted.data.submission.status, "submitted");
  assert.equal(submitted.data.submission.score, 1);
  studentSubmission = submitted.data.submission;
});

test("professor acompanha, responde e corrige", async () => {
  const analytics = await api(`/api/analytics?classId=${classroom.id}`, { cookie: teacherCookie });
  assert.equal(analytics.response.status, 200);
  assert.equal(analytics.data.students.length, 1);
  assert.equal(analytics.data.students[0].workspace.summary.studyMinutes, 45);
  assert.equal(analytics.data.events.length, 1);
  assert.equal(analytics.data.submissions[0].status, "submitted");

  const inbox = await api("/api/messages", { cookie: teacherCookie });
  assert.equal(inbox.response.status, 200);
  assert.ok(inbox.data.messages.some(item => item.id === studentQuestion.id && item.class_name === classroom.name));

  const answer = await api("/api/messages", { method: "POST", cookie: teacherCookie, body: { classId: classroom.id, parentId: studentQuestion.id, title: "Resposta sobre main", body: "Use apenas um elemento main visível por documento." } });
  assert.equal(answer.response.status, 201);
  assert.equal(answer.data.message.author_role, "Professor");

  const reviewed = await api(`/api/submissions/${studentSubmission.id}/review`, { method: "PATCH", cookie: teacherCookie, body: { score: 2.5, feedback: "Boa justificativa; acrescente acessibilidade." } });
  assert.equal(reviewed.response.status, 200);
  assert.equal(reviewed.data.submission.status, "reviewed");
  assert.equal(reviewed.data.submission.score, 2.5);
});

test("professor vê todos os alunos e faz matrícula direta sem código", async () => {
  const secondLogin = await api("/api/auth/register", { method: "POST", body: { name: "Maria Estudante", email: "maria@example.com", registrationCode: "DS2026-002", password: "segredo123", confirmPassword: "segredo123" } });
  assert.equal(secondLogin.response.status, 201);
  secondStudentCookie = secondLogin.cookie;

  const directory = await api("/api/students", { cookie: teacherCookie });
  assert.equal(directory.response.status, 200);
  assert.ok(directory.data.students.some(student => student.email === "joao@example.com" && student.registrationCode === "DS2026-001"));
  const maria = directory.data.students.find(student => student.email === "maria@example.com");
  assert.ok(maria);
  assert.equal(maria.classes.length, 0);

  const enrolled = await api(`/api/classes/${classroom.id}/members`, { method: "POST", cookie: teacherCookie, body: { studentId: maria.id } });
  assert.equal(enrolled.response.status, 201);

  const studentClasses = await api("/api/classes", { cookie: secondStudentCookie });
  assert.equal(studentClasses.response.status, 200);
  assert.ok(studentClasses.data.classes.some(item => item.id === classroom.id));

  const refreshedDirectory = await api("/api/students", { cookie: teacherCookie });
  const refreshedMaria = refreshedDirectory.data.students.find(student => student.id === maria.id);
  assert.ok(refreshedMaria.classes.some(item => item.id === classroom.id && item.status === "active"));
});

test("professor registra frequência, notas e rubricas no diário", async () => {
  const directory = await api("/api/students", { cookie: teacherCookie });
  const joao = directory.data.students.find(student => student.email === "joao@example.com");
  const maria = directory.data.students.find(student => student.email === "maria@example.com");
  assert.ok(joao && maria);

  const attendance = await api("/api/teacher/attendance", { method: "PUT", cookie: teacherCookie, body: {
    classId: classroom.id, date: "2026-08-18", records: [
      { studentId: joao.id, status: "present", note: "Participou do laboratório." },
      { studentId: maria.id, status: "late", note: "Chegou após a chamada." }
    ]
  } });
  assert.equal(attendance.response.status, 200);
  assert.equal(attendance.data.attendance.length, 2);

  const grade = await api("/api/teacher/grades", { method: "POST", cookie: teacherCookie, body: {
    classId: classroom.id, studentId: joao.id, title: "Projeto HTML semântico", competency: "Base da Web", score: 8.5, maxScore: 10, feedback: "Boa estrutura e descrições acessíveis."
  } });
  assert.equal(grade.response.status, 201);
  assert.equal(grade.data.grade.score, 8.5);

  const rubric = await api("/api/teacher/rubrics", { method: "POST", cookie: teacherCookie, body: {
    classId: classroom.id, courseId: "html", title: "Rubrica do projeto", criteria: ["Semântica", "Acessibilidade", "Organização do código"]
  } });
  assert.equal(rubric.response.status, 201);
  assert.deepEqual(rubric.data.rubric.criteria, ["Semântica", "Acessibilidade", "Organização do código"]);

  const diary = await api(`/api/teacher/diary?classId=${classroom.id}&date=2026-08-18`, { cookie: teacherCookie });
  assert.equal(diary.response.status, 200);
  assert.equal(diary.data.members.length, 2);
  assert.equal(diary.data.grades[0].title, "Projeto HTML semântico");
  assert.equal(diary.data.rubrics[0].criteria.length, 3);
  assert.equal(diary.data.attendanceHistory[0].present_count, 1);
  assert.equal(diary.data.attendanceHistory[0].late_count, 1);
});

test("professor importa alunos por CSV normalizado no mesmo ambiente institucional", async () => {
  const imported = await api("/api/teacher/students/import", { method: "POST", cookie: teacherCookie, body: { rows: [
    { name: "Aluno Importado", email: "importado@example.com", registrationCode: "CSV-2026-01", password: "temporaria123" },
    { name: "Registro Inválido", email: "email-invalido", registrationCode: "X" }
  ] } });
  assert.equal(imported.response.status, 201);
  assert.equal(imported.data.created.length, 1);
  assert.equal(imported.data.skipped.length, 1);
  assert.equal(imported.data.created[0].registrationCode, "CSV-2026-01");
  const directory = await api("/api/students", { cookie: teacherCookie });
  assert.ok(directory.data.students.some(student => student.email === "importado@example.com"));
});

test("gera backup SQLite e notifica o aluno", async () => {
  const backup = await api("/api/backups", { method: "POST", cookie: teacherCookie, body: {} });
  assert.equal(backup.response.status, 201);
  assert.match(backup.data.filename, /^coda-backup-.*\.sqlite$/);
  const backups = await api("/api/backups", { cookie: teacherCookie });
  assert.ok(backups.data.backups.some(item => item.name === backup.data.filename && item.size > 0));

  const notifications = await api("/api/notifications", { cookie: studentCookie });
  assert.ok(notifications.data.notifications.some(item => item.type === "teacher_reply"));
  assert.ok(notifications.data.notifications.some(item => item.type === "assessment_review"));
});

test("administrador gerencia instituição, usuários, LGPD e backups", async () => {
  const invalidCode = await api("/api/auth/login", { method: "POST", body: { email: "gestora@coda.local", password: "segredo123", role: "Admin", adminCode: "ERRADO" } });
  assert.equal(invalidCode.response.status, 403);
  assert.equal(invalidCode.data.error, "invalid_admin_code");
  const created = await api("/api/auth/login", { method: "POST", body: { email: "gestor.novo@example.com", password: "minhasenha123", role: "Admin", adminCode: "ADMIN-CODA-TESTE" } });
  assert.equal(created.response.status, 200);
  assert.equal(created.data.created, true);
  assert.equal(created.data.user.role, "Admin");

  const login = await api("/api/auth/login", { method: "POST", body: { email: "gestora@coda.local", password: "segredo123", role: "Admin", adminCode: "ADMIN-CODA-TESTE" } });
  assert.equal(login.response.status, 200);
  assert.equal(login.data.user.role, "Admin");
  adminCookie = login.cookie;

  const dashboard = await api("/api/admin/dashboard", { cookie: adminCookie });
  assert.equal(dashboard.response.status, 200);
  assert.ok(dashboard.data.counts.students >= 2);
  assert.ok(dashboard.data.counts.teachers >= 1);
  assert.ok(dashboard.data.classes.some(item => item.id === classroom.id));
  assert.equal(dashboard.data.privacyTasks.length, 5);

  const institution = await api("/api/admin/institution", { method: "PUT", cookie: adminCookie, body: { name: "Instituto Coda", shortName: "IC", campus: "Unidade Centro", privacyEmail: "privacidade@instituto.local", primaryColor: "#5b3cc4", accentColor: "#c4b5fd" } });
  assert.equal(institution.response.status, 200);
  assert.equal(institution.data.institution.name, "Instituto Coda");

  const privacy = await api("/api/admin/privacy/inventario", { method: "PATCH", cookie: adminCookie, body: { completed: true } });
  assert.equal(privacy.response.status, 200);
  assert.equal(privacy.data.task.completed, true);

  const maria = dashboard.data.users.find(user => user.email === "maria@example.com");
  const paused = await api(`/api/admin/users/${maria.id}`, { method: "PATCH", cookie: adminCookie, body: { active: false } });
  assert.equal(paused.response.status, 200);
  assert.equal(Boolean(paused.data.user.active), false);
  const restored = await api(`/api/admin/users/${maria.id}`, { method: "PATCH", cookie: adminCookie, body: { active: true } });
  assert.equal(restored.response.status, 200);

  const backup = await api("/api/backups", { method: "POST", cookie: adminCookie, body: {} });
  assert.equal(backup.response.status, 201);

  const editedLesson = await api("/api/content/lesson", { method: "PUT", cookie: adminCookie, body: {
    courseId: "css", lesson: 0, status: "published", title: "Cascata e seletores revisados",
    context: "O administrador mantém a sequência pedagógica.", explanation: "A cascata combina origem, especificidade e ordem.",
    system: "folha de estilo institucional", commonError: "Aumentar a especificidade sem necessidade.", activity: "Compare três seletores no laboratório.",
    videoUrl: "https://www.youtube.com/watch?v=1PnVor36_40", videoNote: "Vídeo complementar do curso.",
    objectives: ["Prever qual regra vence."], prerequisites: ["Conhecer HTML."], checkpoints: ["Calcular especificidade."]
  } });
  assert.equal(editedLesson.response.status, 200);
  const adminContent = await api("/api/content", { cookie: adminCookie });
  assert.ok(adminContent.data.lessons.some(item => item.course_id === "css" && item.title === "Cascata e seletores revisados"));

  const audit = await api("/api/admin/audit-log", { cookie: adminCookie });
  assert.equal(audit.response.status, 200);
  assert.ok(audit.data.entries.some(item => item.action === "students_imported"));
  assert.ok(audit.data.entries.some(item => item.action === "lesson_updated"));
  assert.ok(audit.data.entries.some(item => item.action === "backup_created"));
  const backups = await api("/api/backups", { cookie: adminCookie });
  assert.ok(backups.data.history.some(item => item.kind === "manual" && item.size_bytes > 0));
});
