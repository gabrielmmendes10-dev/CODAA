export function loadJSON(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

export function createInitialState(initialPosts) {
  const state = {
    category: "Todas", currentCourse: "html", currentLesson: 0, currentVideo: 0, videoCategory: "Todas", videoCourse: "Todas", videoSearch: "", videoLength: "short",
    labLanguage: "html", labCode: {}, labMode: "free", activity: null, activityCourse: "html", activityLesson: 0, espProject: 0,
    espMode: "model", wiringContext: "wires", wiringSelected: null, wiringByProject: loadJSON("nexo-wiring", {}), student: null, teacherSection: "overview", adminSection: "overview",
    quizLevel: "Iniciante", quizIndex: 0, quizScore: 0, quizAnswer: null, quizMode: "subjects", quizSubject: null, quizQuestions: [], quizId: null, quizStartedAt: null, quizAnswers: [], mockRemaining: 0, mockTimer: null,
    communityTopic: "Todos", completed: loadJSON("nexo-completed", {}), activities: loadJSON("nexo-activities", {}), posts: loadJSON("nexo-posts", initialPosts),
    bookmarks: {}, notes: {}, lessonChecks: {}, adaptiveResults: {}, studyMinutes: {}, dailyGoal: 30, dashboardCards: loadJSON("nexo-dashboard-cards", { goals: true, timer: true, week: true, achievements: true }), accessibility: loadJSON("nexo-accessibility", { fontSize: "normal", colorVision: "default", highContrast: false, reduceMotion: false }), timerSeconds: 1500, timerRunning: false, timerId: null,
    tutor: { conversationId: null, mode: "explain", busy: false, booted: false, provider: "local", model: "Base local + pesquisa Crossref", image: null }
  };
  state.threeDComponents = loadJSON("nexo-3d-prototype", []);
  if (!Array.isArray(state.threeDComponents)) state.threeDComponents = [];
  state.threeDWires = loadJSON("nexo-3d-wires", []);
  if (!Array.isArray(state.threeDWires)) state.threeDWires = [];
  state.threeDSelected = state.threeDComponents[0]?.id || null;
  state.threeDWireSelection = null;
  state.threeDTemplateCode = "";
  state.threeDSimulating = false;
  state.threeDTimer = null;
  return state;
}

export function studentStorageKey(base, student) {
  return student?.email ? `${base}:${encodeURIComponent(student.email.toLowerCase())}` : base;
}

export function loadStudentWorkspace(state) {
  const owner = localStorage.getItem("nexo-progress-owner");
  const firstMigration = !owner;
  const studentEmail = state.student?.email?.toLowerCase();
  const fallback = firstMigration ? loadJSON("nexo-completed", {}) : {};
  const activityFallback = firstMigration ? loadJSON("nexo-activities", {}) : {};
  state.completed = loadJSON(studentStorageKey("nexo-completed", state.student), fallback);
  state.activities = loadJSON(studentStorageKey("nexo-activities", state.student), activityFallback);
  state.bookmarks = loadJSON(studentStorageKey("nexo-bookmarks", state.student), {});
  state.notes = loadJSON(studentStorageKey("nexo-notes", state.student), {});
  state.lessonChecks = loadJSON(studentStorageKey("nexo-lesson-checks", state.student), {});
  state.adaptiveResults = loadJSON(studentStorageKey("nexo-adaptive-results", state.student), {});
  state.studyMinutes = loadJSON(studentStorageKey("nexo-study-minutes", state.student), {});
  state.dailyGoal = Number(localStorage.getItem(studentStorageKey("nexo-daily-goal", state.student)) || 30);
  Object.assign(state.labCode, loadJSON(studentStorageKey("nexo-lab-code", state.student), {}));
  if (firstMigration && studentEmail) localStorage.setItem("nexo-progress-owner", studentEmail);
}

export function saveStudentWorkspace(state) {
  if (!state.student) return false;
  localStorage.setItem(studentStorageKey("nexo-completed", state.student), JSON.stringify(state.completed));
  localStorage.setItem(studentStorageKey("nexo-activities", state.student), JSON.stringify(state.activities));
  localStorage.setItem(studentStorageKey("nexo-lesson-checks", state.student), JSON.stringify(state.lessonChecks));
  localStorage.setItem(studentStorageKey("nexo-adaptive-results", state.student), JSON.stringify(state.adaptiveResults));
  localStorage.setItem(studentStorageKey("nexo-bookmarks", state.student), JSON.stringify(state.bookmarks));
  localStorage.setItem(studentStorageKey("nexo-notes", state.student), JSON.stringify(state.notes));
  localStorage.setItem(studentStorageKey("nexo-study-minutes", state.student), JSON.stringify(state.studyMinutes));
  localStorage.setItem(studentStorageKey("nexo-daily-goal", state.student), String(state.dailyGoal));
  localStorage.setItem(studentStorageKey("nexo-lab-code", state.student), JSON.stringify(state.labCode));
  return true;
}

globalThis.CodaStateModule = { createInitialState, loadJSON, loadStudentWorkspace, saveStudentWorkspace, studentStorageKey };
