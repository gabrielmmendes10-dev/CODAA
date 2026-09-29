(() => {
  "use strict";
  const esc = window.CodaUtils.escapeHtml;
  const date = value => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Sem registro";
  function parseCsv(text) {
    const rows = []; let row = [], field = "", quoted = false;
    const input = String(text).replace(/^\uFEFF/, "");
    for (let index = 0; index <= input.length; index++) {
      const char = input[index] ?? "\n", next = input[index + 1];
      if (char === '"' && quoted && next === '"') { field += '"'; index++; }
      else if (char === '"') quoted = !quoted;
      else if ((char === "," || char === ";") && !quoted) { row.push(field.trim()); field = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") index++; row.push(field.trim()); field = ""; if (row.some(Boolean)) rows.push(row); row = []; }
      else field += char;
    }
    if (!rows.length) return [];
    const headers = rows.shift().map(item => item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const pick = (values, names) => values[headers.findIndex(header => names.includes(header))] || "";
    return rows.map(values => ({ name: pick(values, ["nome", "name"]), email: pick(values, ["email", "e-mail"]), registrationCode: pick(values, ["matricula", "registration", "registrationcode"]), password: pick(values, ["senha", "password"]) })).filter(item => item.name && item.email);
  }
  function teacherTools() {
    const studentPanel = document.querySelector('[data-teacher-panel="students"]');
    if (studentPanel && !studentPanel.querySelector(".institution-import-card")) {
      const card = document.createElement("section"); card.className = "platform-card institution-import-card";
      card.innerHTML = '<div class="platform-card-head"><div><span class="kicker">IMPORTAÇÃO EM LOTE</span><h2>Adicionar alunos por CSV</h2><p>Colunas aceitas: nome, email, matricula e senha. A senha é gerada quando estiver vazia.</p></div><label class="import-database">Selecionar CSV<input type="file" accept=".csv,text/csv" data-student-csv hidden></label></div><div class="ui-state" data-import-state><strong>Pronto para importar</strong><p>Nenhum arquivo selecionado.</p></div>';
      studentPanel.prepend(card);
      card.querySelector("[data-student-csv]").onchange = async event => {
        const file = event.target.files[0], state = card.querySelector("[data-import-state]"); if (!file) return;
        const rows = parseCsv(await file.text()); state.innerHTML = `<strong>Validando ${rows.length} aluno(s)…</strong><p>O servidor separará os registros desta instituição.</p>`;
        try {
          const result = await CodaAPI.importStudents(rows); state.className = "ui-state success";
          state.innerHTML = `<strong>${result.created.length} conta(s) criada(s)</strong><p>${result.skipped.length} registro(s) ignorado(s). Baixe as credenciais temporárias e oriente a troca de senha.</p>`;
          if (result.created.length) {
            const button = document.createElement("button"); button.type = "button"; button.textContent = "Baixar credenciais CSV";
            button.onclick = () => { const body = ["nome,email,matricula,senha", ...result.created.map(item => [item.name, item.email, item.registrationCode, item.password].map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n"), link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" })); link.download = "credenciais-alunos-coda.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500); }; state.appendChild(button);
          }
          await window.CodaPlatform?.refreshTeacher?.();
        } catch (error) { state.className = "ui-state error"; state.innerHTML = `<strong>Importação não concluída</strong><p>${esc(error.message)}</p>`; }
        event.target.value = "";
      };
    }
    const overview = document.querySelector('[data-teacher-panel="overview"].teacher-dashboard')?.parentElement;
    if (overview && !overview.querySelector(".teacher-intelligence-grid")) {
      const section = document.createElement("section"); section.className = "teacher-intelligence-grid";
      section.innerHTML = '<article class="platform-card"><div class="platform-card-head"><div><span class="kicker">ATENÇÃO PEDAGÓGICA</span><h2>Alunos em risco de atraso</h2></div></div><div data-risk-list class="platform-list"><div class="ui-state loading"><strong>Analisando progresso…</strong></div></div></article><article class="platform-card"><div class="platform-card-head"><div><span class="kicker">CALENDÁRIO</span><h2>Próximas avaliações</h2></div><button type="button" data-teacher-pdf>Relatório PDF</button></div><div data-assessment-calendar class="assessment-calendar"></div></article>';
      document.querySelector("#serverTeacherOverview")?.after(section);
      section.querySelector("[data-teacher-pdf]").onclick = async () => {
        const data = await CodaAPI.analytics();
        const lines = (data.students || []).map(student => { const summary = student.workspace?.summary || {}; return `${student.name} | aulas ${summary.lessons || 0} | atividades ${summary.activities || 0} | estudo ${summary.studyMinutes || 0} min`; });
        window.CodaReports?.downloadPdf({ title: "RELATORIO PEDAGOGICO DA TURMA", filename: "relatorio-pedagogico-coda.pdf", lines: lines.length ? lines : ["Nenhum aluno matriculado."] });
      };
    }
    refreshTeacherIntelligence();
  }
  async function refreshTeacherIntelligence() {
    const riskRoot = document.querySelector("[data-risk-list]"), calendar = document.querySelector("[data-assessment-calendar]"); if (!riskRoot && !calendar) return;
    try {
      const [analytics, assessments] = await Promise.all([CodaAPI.analytics(), CodaAPI.assessments()]);
      const risks = (analytics.students || []).map(student => { const summary = student.workspace?.summary || {}, inactiveDays = student.last_seen_at ? Math.floor((Date.now() - new Date(student.last_seen_at)) / 86400000) : 999, signals = []; if ((summary.lessons || 0) < 2) signals.push("poucas aulas"); if ((summary.studyMinutes || 0) < 30) signals.push("baixo tempo de estudo"); if (inactiveDays >= 7) signals.push(`${inactiveDays} dias sem acesso`); return { ...student, signals }; }).filter(item => item.signals.length >= 2).slice(0, 8);
      if (riskRoot) riskRoot.innerHTML = risks.length ? risks.map(item => `<article class="platform-list-item risk"><span>!</span><div><strong>${esc(item.name)}</strong><p>${esc(item.signals.join(" • "))}</p></div></article>`).join("") : '<div class="ui-state success"><strong>Nenhum risco alto detectado</strong><p>Os indicadores atuais estão dentro do esperado.</p></div>';
      const upcoming = (assessments.assessments || []).filter(item => item.due_at && new Date(item.due_at) >= new Date()).sort((a, b) => new Date(a.due_at) - new Date(b.due_at)).slice(0, 8);
      if (calendar) calendar.innerHTML = upcoming.length ? upcoming.map(item => `<article><time datetime="${esc(item.due_at)}"><b>${new Date(item.due_at).getDate()}</b><span>${new Date(item.due_at).toLocaleDateString("pt-BR", { month: "short" })}</span></time><div><strong>${esc(item.title)}</strong><small>${esc(item.class_name || "Turma")} • ${date(item.due_at)}</small></div></article>`).join("") : '<div class="ui-state empty"><strong>Agenda livre</strong><p>Nenhuma avaliação futura publicada.</p></div>';
    } catch (error) { if (riskRoot) riskRoot.innerHTML = `<div class="ui-state error"><strong>Dados indisponíveis</strong><p>${esc(error.message)}</p></div>`; }
  }
  async function adminTools() {
    const panel = document.querySelector('[data-admin-panel="database"] .database-admin-card'); if (!panel || panel.querySelector(".audit-card")) return;
    const card = document.createElement("section"); card.className = "audit-card";
    card.innerHTML = '<div class="admin-card-head"><div><span class="kicker">HISTÓRICO E AUTOMAÇÃO</span><h2>Registro de alterações</h2><p>Backups automáticos e ações administrativas desta instituição.</p></div><span class="status-pill active">BACKUP AUTOMÁTICO ATIVO</span></div><div class="admin-list" data-audit-list><div class="ui-state loading"><strong>Carregando histórico…</strong></div></div>';
    panel.after(card);
    try { const data = await CodaAPI.auditLog(); card.querySelector("[data-audit-list]").innerHTML = data.entries?.length ? data.entries.map(item => `<div class="admin-list-row"><span>▣</span><div><strong>${esc(item.action_label || item.action)}</strong><small>${esc(item.user_name || "Sistema")} • ${date(item.created_at)}</small></div><b>${esc(item.entity_type || "sistema")}</b></div>`).join("") : '<div class="ui-state empty"><strong>Nenhuma alteração registrada</strong></div>'; }
    catch (error) { card.querySelector("[data-audit-list]").innerHTML = `<div class="ui-state error"><strong>Histórico indisponível</strong><p>${esc(error.message)}</p></div>`; }
  }
  document.addEventListener("coda:user", event => { if (event.detail.user?.role === "Professor") teacherTools(); if (event.detail.user?.role === "Admin") adminTools(); });
  document.addEventListener("coda:view", event => { if (event.detail.role === "Professor") teacherTools(); if (event.detail.role === "Admin" && event.detail.section === "database") adminTools(); });
  window.CodaInstitution = { parseCsv, refreshTeacherIntelligence };
})();
