export function createCoursesRenderer({ escapeHtml, coursePercent }) {
  function courseCard(course) {
    const progress = coursePercent(course.id);
    return `<article class="course-card" data-course-color="${escapeHtml(course.color)}" data-progress="${progress}"><div class="course-card-head"><span class="course-symbol">${escapeHtml(course.symbol)}</span><span class="level-pill">${escapeHtml(course.level)}</span></div><h3>${escapeHtml(course.name)}</h3><p>${escapeHtml(course.description)}</p><div class="course-meta"><span>▣ 7 aulas</span><span>◇ 7 atividades</span><span>▶ vídeos</span></div><div class="course-bottom"><span><i data-progress-bar></i></span><small>${progress}%</small><button data-course="${escapeHtml(course.id)}" aria-label="Abrir ${escapeHtml(course.name)}">→</button></div></article>`;
  }

  function applyCourseStyles(root) {
    root.querySelectorAll(".subject-group").forEach(group => group.style.setProperty("--group-color", group.dataset.groupColor));
    root.querySelectorAll(".course-card").forEach(card => {
      card.style.setProperty("--course", card.dataset.courseColor);
      card.querySelector("[data-progress-bar]")?.style.setProperty("width", `${Number(card.dataset.progress) || 0}%`);
    });
  }

  return { courseCard, applyCourseStyles };
}

globalThis.CodaCoursesRendererModule = { createCoursesRenderer };
