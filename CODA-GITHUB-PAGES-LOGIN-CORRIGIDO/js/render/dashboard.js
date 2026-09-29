export function createDashboardRenderer({ courses, completedCount }) {
  function metrics(state) {
    const lessons = Object.values(state.completed).filter(Boolean).length;
    const activities = Object.values(state.activities).filter(Boolean).length;
    const checks = Object.values(state.lessonChecks).filter(Boolean).length;
    const tracks = courses.filter(course => completedCount(course.id) > 0).length;
    return { lessons, activities, checks, tracks, xp: lessons * 20 + activities * 10 + checks * 10 };
  }

  function applyProgress(root, selector, value) {
    root.querySelector(selector)?.style.setProperty("width", `${Number(value) || 0}%`);
  }

  return { metrics, applyProgress };
}

globalThis.CodaDashboardRendererModule = { createDashboardRenderer };
