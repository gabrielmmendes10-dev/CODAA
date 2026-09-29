import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [html, manifest, light, dark, base, responsive, orbitals, programmer3D, adminStyles, login, lessons, lab, esp32, tutor, institution, database, script, core, stateModule, analyticsModule, workspaceModule, coursesModule, dashboardModule] = await Promise.all([
  read("index.html"), read("style.css"), read("themes/light.css"), read("themes/dark.css"), read("styles/base.css"),
  read("styles/responsive.css"), read("components/orbitals.css"), read("components/three-d-programmer.css"), read("pages/admin.css"), read("js/login.js"), read("js/lessons.js"),
  read("js/laboratory.js"), read("js/esp32.js"), read("js/tutor.js"), read("js/institution.js"), read("db.mjs"), read("script.js"), read("js/core.js"), read("js/state.js"), read("js/analytics.js"), read("js/workspace-sync.js"), read("js/render/courses.js"), read("js/render/dashboard.js")
]);

test("CSS e JavaScript estão divididos por tema, componente, página e domínio", () => {
  ["themes/light.css", "themes/dark.css", "components/login.css", "components/orbitals.css", "components/cards.css", "pages/student.css", "pages/teacher.css", "pages/admin.css"].forEach(file => assert.match(manifest, new RegExp(file.replace("/", "\\/"))));
  ["login", "lessons", "laboratory", "esp32", "tutor", "institution", "core"].forEach(module => assert.match(readFileSource("script.js"), new RegExp(`js/${module}\\.js`)));
});

test("estado, analytics, sincronização e renderização são módulos ES carregados antes do core", () => {
  ["js/state.js", "js/analytics.js", "js/workspace-sync.js", "js/render/courses.js", "js/render/dashboard.js"].forEach(file => assert.match(script, new RegExp(file.replaceAll("/", "\\/"))));
  assert.match(script, /node\.type="module"/);
  assert.match(stateModule, /export function createInitialState/);
  assert.match(analyticsModule, /export function createAnalytics/);
  assert.match(workspaceModule, /export function createWorkspaceSync/);
  assert.match(coursesModule, /function courseCard/);
  assert.match(dashboardModule, /function metrics/);
  assert.doesNotMatch(core, /function courseCard\(/);
  assert.doesNotMatch(core, /function trackLearningEvent\(/);
});

function readFileSource(name) {
  if (name === "script.js") return login + lessons + lab + esp32 + tutor + institution + '"js/login.js","js/lessons.js","js/laboratory.js","js/esp32.js","js/tutor.js","js/institution.js","js/core.js"';
  return "";
}

test("modo claro e escuro possuem tokens próprios e contraste textual mínimo", () => {
  assert.match(light, /--bg:#ede9e2/); assert.match(light, /--surface:#f7f4ee/); assert.match(light, /--text:#17171b/); assert.match(light, /\.sidebar\{background:#ffffff/); assert.match(light, /--muted:#3f3b43/); assert.match(dark, /--bg:#15111e/); assert.match(dark, /--text:#f8f5ff/);
  assert.match(base, /font-size:16px/); assert.match(base, /font-size:max\(\.875rem/); assert.doesNotMatch(base, /font-size:\s*(?:8|9|10)px/);
});

test("computador, tablet e celular têm layouts e navegação responsivos", () => {
  assert.match(responsive, /@media\(max-width:900px\)/); assert.match(responsive, /@media\(max-width:560px\)/); assert.match(responsive, /\.mobile-nav\{position:fixed/);
  assert.match(responsive, /lab-app\[data-mobile-pane="editor"\]/); assert.match(responsive, /\.diary-student-list>article\{display:grid/);
});

test("diretório administrativo mantém cada usuário em uma linha estável e legível", () => {
  assert.match(adminStyles, /\.admin-view \.admin-user-list>\.admin-user-row\{/);
  assert.match(adminStyles, /grid-template-areas:"avatar identity role seen action"/);
  assert.match(adminStyles, /min-height:76px/);
  assert.match(adminStyles, /font-size:max\(\.875rem/);
  assert.match(adminStyles, /text-overflow:ellipsis/);
  assert.match(adminStyles, /@media\(max-width:520px\)/);
  assert.match(html, /style\.css\?v=\d+\.\d+\.\d+/);
});

test("login cobre os três perfis e navegação móvel específica", () => {
  ["Aluno", "Professor", "Admin"].forEach(role => assert.match(html, new RegExp(`<option value="${role}"|data-login-portal="${role}"`)));
  assert.match(login, /studentItems/); assert.match(login, /teacherItems/); assert.match(login, /adminItems/);
});

test("orbitais têm velocidades controladas, posições estáveis e redução de movimento", () => {
  assert.match(orbitals, /42s linear infinite!important/); assert.match(orbitals, /--orbit-duration:64s;--orbit-half-delay:-32s/); assert.match(orbitals, /--orbit-duration:48s;--orbit-half-delay:-24s/);
  assert.match(orbitals, /orbitRunnerStable/); assert.match(orbitals, /orbitCounterStable/); assert.match(orbitals, /translate3d\(-50%,-50%,0\)/);
  assert.match(orbitals, /animation-play-state:running!important/); assert.match(orbitals, /backface-visibility:hidden/); assert.match(orbitals, /will-change:transform/); assert.match(orbitals, /animation:none!important/);
});

test("navegação por teclado e controles de toque estão cobertos", () => {
  assert.match(base, /:focus-visible/); assert.match(base, /outline:3px/); assert.match(esp32, /ArrowLeft/); assert.match(esp32, /ArrowRight/); assert.match(responsive, /min-width:48px;min-height:48px/);
});

test("programador 3D mostra uma placa ESP32 completa, legível e manipulável", () => {
  assert.match(manifest, /components\/three-d-programmer\.css/);
  assert.match(html, /prototype-radio-module/); assert.match(html, /ESP-WROOM-32/); assert.match(html, /prototype-pin-bank-left/); assert.match(html, /prototypeViewToggle/);
  assert.match(programmer3D, /width:\s*168px/); assert.match(programmer3D, /prototype-usb-port/); assert.match(programmer3D, /prototype-main-chip/); assert.match(programmer3D, /\.prototype-stage\.top-view/);
  assert.match(esp32, /ArrowLeft/);
});

test("aprendizagem, Tutor, professor, administrador e instituição têm recursos integrados", () => {
  assert.match(lessons, /REVISÃO INTELIGENTE/); assert.match(lessons, /CERTIFICADO DE CONCLUSAO/); assert.match(lab, /lineDiff/); assert.match(tutor, /números das linhas/);
  assert.match(institution, /IMPORTAÇÃO EM LOTE/); assert.match(institution, /Alunos em risco de atraso/); assert.match(institution, /Registro de alterações/);
  assert.match(database, /institution_id/); assert.match(database, /audit_logs/); assert.match(database, /backup_history/); assert.match(database, /lesson_content_versions/);
});
