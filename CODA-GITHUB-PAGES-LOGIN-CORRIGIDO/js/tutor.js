(() => {
  "use strict";
  function ask(message, mode = "code", options = {}) {
    window.CodaCore?.selectTutorMode?.(mode); window.CodaCore?.sendTutorMessage?.(message, options);
  }
  function enhance() {
    const tools = document.querySelector("#chatCodeTools > div"); if (!tools || tools.querySelector("[data-tutor-compare]")) return;
    const compare = document.createElement("button"); compare.type = "button"; compare.dataset.tutorCompare = ""; compare.textContent = "Comparar versões";
    compare.onclick = () => {
      const result = window.CodaLab105?.compare?.();
      if (!result?.before) { window.CodaCore?.showToast?.("Salve uma versão no laboratório primeiro"); return; }
      ask(`Compare estas duas versões. As linhas alteradas são ${result.changed.join(", ") || "nenhuma"}. Explique o efeito de cada mudança e indique exatamente as linhas que devo revisar.\n\nVERSÃO ANTERIOR:\n${result.before}\n\nVERSÃO ATUAL:\n${result.after}`);
    };
    const correct = document.createElement("button"); correct.type = "button"; correct.dataset.tutorCorrect = ""; correct.textContent = "Corrigir atividade";
    correct.onclick = () => ask("Corrija minha atividade atual usando os requisitos da aula. Dê primeiro uma pista, depois liste os erros por número de linha e só então proponha uma correção.", "code", { forceLabCode: true });
    const exercise = document.createElement("button"); exercise.type = "button"; exercise.dataset.tutorExercise = ""; exercise.textContent = "Criar exercício";
    exercise.onclick = () => ask("Crie um exercício personalizado curto sobre a aula atual. Não mostre a resposta; forneça objetivo, entrada esperada, critérios de sucesso e uma primeira pista.", "quiz");
    const lines = document.createElement("button"); lines.type = "button"; lines.dataset.tutorLines = ""; lines.textContent = "Revisar linhas";
    lines.onclick = () => ask("Analise o código atual e mostre exatamente os números das linhas que precisam ser revisadas, explicando um problema por vez e sem entregar tudo de imediato.", "code", { forceLabCode: true });
    tools.append(compare, correct, exercise, lines);
  }
  document.addEventListener("coda:ready", enhance);
  document.addEventListener("coda:user", enhance);
  window.CodaTutor105 = { enhance, ask };
})();
