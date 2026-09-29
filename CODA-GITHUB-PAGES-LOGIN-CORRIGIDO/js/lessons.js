(() => {
  "use strict";

  const variants = [
    context => ({ q: `Qual é a melhor forma de confirmar que você entendeu “${context.lessonTitle}”?`, o: ["Explicar a ideia e testar um exemplo", "Só copiar o código", "Ignorar a saída", "Mudar tudo ao mesmo tempo"], a: 0, e: "Explicar e testar cria uma evidência observável de aprendizagem." }),
    context => ({ q: `Ao encontrar um erro em “${context.lessonTitle}”, qual deve ser o primeiro passo?`, o: ["Ler a mensagem e localizar a linha", "Apagar o projeto", "Trocar de linguagem", "Executar sem observar"], a: 0, e: "A mensagem e a linha reduzem o problema antes de qualquer alteração." }),
    context => ({ q: `Como comparar duas soluções para “${context.lessonTitle}”?`, o: ["Usar a mesma entrada e observar a saída", "Comparar apenas as cores", "Misturar requisitos", "Evitar testes"], a: 0, e: "Entradas iguais permitem avaliar o comportamento de cada versão." })
  ];
  const shuffle = values => values.map(value => ({ value, order: Math.random() })).sort((a, b) => a.order - b.order).map(item => item.value);

  function certificateActions(context) {
    const hero = document.querySelector("#courseHero");
    if (!hero || context.progress < 100 || hero.querySelector(".course-certificate-actions")) return;
    const box = document.createElement("div"); box.className = "course-certificate-actions";
    box.innerHTML = '<strong>Trilha concluída</strong><button type="button" data-certificate>Certificado em PDF</button><button type="button" data-final-report>Relatório final</button>';
    const student = context.student?.name || "Aluno";
    box.querySelector("[data-certificate]").onclick = () => window.CodaReports?.downloadPdf({
      title: "CERTIFICADO DE CONCLUSAO", filename: `certificado-${context.courseId}.pdf`,
      lines: ["A Coda certifica que", student.toUpperCase(), `concluiu a trilha ${context.courseName}.`, "Carga pedagogica: 7 aulas, atividades praticas e verificacoes finais.", "Status: 100% concluido."]
    });
    box.querySelector("[data-final-report]").onclick = () => window.CodaReports?.downloadPdf({
      title: `RELATORIO FINAL - ${context.courseName}`, filename: `relatorio-${context.courseId}.pdf`,
      lines: [`Aluno: ${student}`, "Aulas concluidas: 7 de 7", `Atividades praticas: ${Object.keys(context.activities).filter(key => key.startsWith(`${context.courseId}:`) && context.activities[key]).length} de 7`, `Exercicios finais: ${Object.keys(context.lessonChecks).filter(key => key.startsWith(`${context.courseId}:`) && context.lessonChecks[key]).length} de 7`, "Recomendacao: manter um projeto autoral como evidencia da trilha."]
    });
    hero.appendChild(box);
  }

  function renderAdaptive(event) {
    const context = { ...window.CodaCore?.getLearningContext?.(), ...event.detail };
    const anchor = document.querySelector(".lesson-unlock-status");
    if (!anchor || document.querySelector(".adaptive-check")) return;
    const attempt = Number(context.adaptiveResults?.[context.currentKey]?.attempts || 0);
    const model = variants[(attempt + context.lesson) % variants.length](context);
    const choices = shuffle(model.o.map((text, original) => ({ text, original })));
    const section = document.createElement("section"); section.className = "adaptive-check";
    section.innerHTML = `<span class="explainer-kicker">REVISÃO INTELIGENTE • TENTATIVA ${attempt + 1}</span><h3>${model.q}</h3><p>A ordem e o foco mudam a cada tentativa.</p><div class="adaptive-options">${choices.map((choice, index) => `<label><input type="radio" name="adaptive-${context.courseId}-${context.lesson}" value="${choice.original}"><span>${String.fromCharCode(65 + index)}. ${choice.text}</span></label>`).join("")}</div><button type="button" class="primary" data-check-adaptive>Corrigir e explicar</button><button type="button" data-new-adaptive>Outra questão</button><p class="adaptive-feedback" hidden aria-live="polite"></p>`;
    section.querySelector("[data-check-adaptive]").onclick = () => {
      const selected = section.querySelector("input:checked"), feedback = section.querySelector(".adaptive-feedback");
      if (!selected) { window.CodaCore?.showToast?.("Escolha uma alternativa"); return; }
      const correct = Number(selected.value) === model.a;
      feedback.hidden = false; feedback.className = `adaptive-feedback ${correct ? "correct" : "incorrect"}`;
      feedback.textContent = `${correct ? "✓ Correto." : "△ Revise e tente outra vez."} ${model.e}`;
      window.CodaCore?.markAdaptiveResult?.(context.courseId, context.lesson, { correct, question: model.q });
    };
    section.querySelector("[data-new-adaptive]").onclick = () => { section.remove(); renderAdaptive(event); };
    anchor.before(section); certificateActions(context);
  }

  function reviewPanel() {
    const context = window.CodaCore?.getLearningContext?.();
    const root = document.querySelector("#meu-espaco");
    if (!root || !context) return;
    root.querySelector(".student-review-panel")?.remove();
    const weak = window.CodaCore.courses.map(course => {
      const checks = course.topics.filter((_, index) => context.lessonChecks[`${course.id}:${index}`]).length;
      const adaptiveErrors = course.topics.filter((_, index) => context.adaptiveResults[`${course.id}:${index}`]?.correct === false).length;
      return { course, checks, adaptiveErrors, score: checks - adaptiveErrors };
    }).filter(item => item.checks < 7 || item.adaptiveErrors).sort((a, b) => a.score - b.score).slice(0, 3);
    const section = document.createElement("section"); section.className = "student-review-panel";
    section.innerHTML = `<div><span class="kicker">REVISÃO RECOMENDADA</span><h2>Próximos passos personalizados</h2><p>Prioridade calculada pelas verificações e tentativas recentes.</p></div><div class="review-recommendations">${weak.length ? weak.map(item => `<button type="button" data-review-course="${item.course.id}"><strong>${item.course.name}</strong><span>${item.adaptiveErrors ? `${item.adaptiveErrors} tentativa(s) para revisar` : `${7 - item.checks} exercício(s) pendente(s)`}</span><b>Revisar →</b></button>`).join("") : "<p>Você está em dia. Escolha uma trilha nova para continuar.</p>"}</div>`;
    root.querySelector(".student-hub-grid")?.before(section);
    section.querySelectorAll("[data-review-course]").forEach(button => button.onclick = () => window.CodaCore?.openCourse?.(button.dataset.reviewCourse, 0));
  }

  document.addEventListener("coda:lesson", renderAdaptive);
  document.addEventListener("coda:student-hub", reviewPanel);
  window.CodaLessons = { renderAdaptive, reviewPanel };
})();
