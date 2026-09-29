export function createWorkspaceSync({ state, courses, completedCount, saveStudentWorkspaceData, syncStudentSnapshot, showToast }) {
  function serverWorkspacePayload() {
    return {
      completed: state.completed,
      activities: state.activities,
      lessonChecks: state.lessonChecks,
      adaptiveResults: state.adaptiveResults,
      bookmarks: state.bookmarks,
      notes: state.notes,
      studyMinutes: state.studyMinutes,
      dailyGoal: state.dailyGoal,
      labCode: state.labCode,
      summary: {
        lessons: Object.values(state.completed).filter(Boolean).length,
        activities: Object.values(state.activities).filter(Boolean).length,
        checks: Object.values(state.lessonChecks).filter(Boolean).length,
        adaptive: Object.values(state.adaptiveResults).filter(item => item?.correct).length,
        bookmarks: Object.values(state.bookmarks).filter(Boolean).length,
        studyMinutes: Object.values(state.studyMinutes).reduce((sum, value) => sum + Number(value || 0), 0),
        tracks: courses.filter(course => completedCount(course.id) > 0).length
      }
    };
  }

  async function hydrateServerWorkspace() {
    if (state.student?.role !== "Aluno" || !window.CodaAPI) return;
    try {
      const remote = await CodaAPI.workspace();
      const data = remote?.data || {};
      if (Object.keys(data).length) {
        state.completed = data.completed || {};
        state.activities = data.activities || {};
        state.lessonChecks = data.lessonChecks || {};
        state.adaptiveResults = data.adaptiveResults || {};
        state.bookmarks = data.bookmarks || {};
        state.notes = data.notes || {};
        state.studyMinutes = data.studyMinutes || {};
        state.dailyGoal = Number(data.dailyGoal || 30);
        Object.assign(state.labCode, data.labCode || {});
      } else {
        await CodaAPI.saveWorkspace(serverWorkspacePayload());
      }
    } catch (error) {
      console.warn("Falha ao hidratar workspace remoto:", error?.message || error);
      showToast("Servidor temporariamente indisponível; seu progresso continua salvo neste navegador.");
    }
  }

  function queueServerWorkspace() {
    if (state.student?.role !== "Aluno" || !window.CodaAPI) return;
    clearTimeout(queueServerWorkspace.timer);
    queueServerWorkspace.timer = setTimeout(() => {
      const request = CodaAPI.saveWorkspace(serverWorkspacePayload());
      request?.catch?.(error => console.warn("Falha ao sincronizar workspace:", error?.message || error));
    }, 600);
  }

  function saveStudentWorkspace() {
    if (!state.student) return;
    saveStudentWorkspaceData(state);
    syncStudentSnapshot();
    queueServerWorkspace();
  }

  return { serverWorkspacePayload, hydrateServerWorkspace, queueServerWorkspace, saveStudentWorkspace };
}

globalThis.CodaWorkspaceSyncModule = { createWorkspaceSync };
