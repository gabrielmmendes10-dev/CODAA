export function createAnalytics({ state, courses, loadJSON, completedCount, coursePercent }) {
  const learningAnalytics = loadJSON("nexo-learning-analytics", { users: {}, events: [], quizResults: [] });
  const analyticsEmail = () => state.student?.email?.trim().toLowerCase() || "";
  const saveLearningAnalytics = () => localStorage.setItem("nexo-learning-analytics", JSON.stringify(learningAnalytics));

  function registerLearningUser(student) {
    if (!student?.email || student.role !== "Aluno") return;
    const email = student.email.trim().toLowerCase();
    const existing = learningAnalytics.users[email] || {};
    learningAnalytics.users[email] = { ...existing, name: student.name, email, role: "Aluno", firstSeen: existing.firstSeen || new Date().toISOString(), lastSeen: new Date().toISOString(), snapshot: existing.snapshot || {} };
    saveLearningAnalytics();
  }

  function syncStudentSnapshot() {
    const email = analyticsEmail();
    if (!email || state.student?.role !== "Aluno") return;
    const user = learningAnalytics.users[email] || { name: state.student.name, email };
    user.lastSeen = new Date().toISOString();
    user.snapshot = {
      lessons: Object.values(state.completed).filter(Boolean).length,
      activities: Object.values(state.activities).filter(Boolean).length,
      checks: Object.values(state.lessonChecks).filter(Boolean).length,
      bookmarks: Object.values(state.bookmarks).filter(Boolean).length,
      studyMinutes: Object.values(state.studyMinutes).reduce((sum, value) => sum + Number(value || 0), 0),
      tracks: courses.filter(course => completedCount(course.id) > 0).length,
      courses: Object.fromEntries(courses.map(course => [course.id, {
        lessons: completedCount(course.id),
        activities: Object.entries(state.activities).filter(([key, value]) => key.startsWith(`${course.id}:`) && value).length,
        checks: Object.entries(state.lessonChecks).filter(([key, value]) => key.startsWith(`${course.id}:`) && value).length,
        percent: coursePercent(course.id)
      }]))
    };
    learningAnalytics.users[email] = user;
    saveLearningAnalytics();
  }

  function trackLearningEvent(type, data = {}) {
    const email = analyticsEmail();
    if (!email || state.student?.role !== "Aluno") return;
    learningAnalytics.events.unshift({ id: Date.now() + Math.random(), email, name: state.student.name, type, data, createdAt: new Date().toISOString() });
    learningAnalytics.events = learningAnalytics.events.slice(0, 2000);
    syncStudentSnapshot();
    saveLearningAnalytics();
    const request = window.CodaAPI?.event?.({ type, courseId: data.courseId || "", lesson: Number.isInteger(data.lesson) ? data.lesson : null, data });
    request?.catch?.(error => console.warn("Falha ao registrar evento de aprendizagem:", error?.message || error));
  }

  function recordQuizResult(result) {
    const email = analyticsEmail();
    if (!email || state.student?.role !== "Aluno") return;
    learningAnalytics.quizResults.unshift({ id: Date.now(), email, name: state.student.name, ...result, createdAt: new Date().toISOString() });
    learningAnalytics.quizResults = learningAnalytics.quizResults.slice(0, 500);
    trackLearningEvent("avaliacao_concluida", { title: result.title, score: result.score, total: result.total, courseId: result.courseId });
    saveLearningAnalytics();
  }

  return { learningAnalytics, analyticsEmail, saveLearningAnalytics, registerLearningUser, syncStudentSnapshot, trackLearningEvent, recordQuizResult };
}

globalThis.CodaAnalyticsModule = { createAnalytics };
