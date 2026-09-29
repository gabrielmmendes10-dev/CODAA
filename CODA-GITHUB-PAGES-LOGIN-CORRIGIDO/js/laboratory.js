(() => {
  "use strict";

  const key = language => `coda-code-versions:${language}`;
  const current = () => window.CodaCore?.getLabSnapshot?.() || { language: "", code: "" };
  function versions(language = current().language) {
    try { return JSON.parse(localStorage.getItem(key(language)) || "[]"); } catch { return []; }
  }
  function snapshot() {
    const data = current(), rows = versions(data.language);
    rows.unshift({ code: data.code, createdAt: new Date().toISOString() });
    localStorage.setItem(key(data.language), JSON.stringify(rows.slice(0, 12)));
    window.CodaCore?.showToast?.("Versão do código salva");
    return rows[0];
  }
  function lineDiff(before = "", after = "") {
    const a = String(before).split("\n"), b = String(after).split("\n"), size = Math.max(a.length, b.length), changed = [];
    for (let index = 0; index < size; index++) if (a[index] !== b[index]) changed.push(index + 1);
    return { changed, before, after };
  }
  function compare() {
    const data = current(), saved = versions(data.language)[0];
    return lineDiff(saved?.code || "", data.code);
  }
  function showComparison() {
    const result = compare();
    const existing = document.querySelector(".lab-version-result"); existing?.remove();
    const box = document.createElement("div"); box.className = "lab-version-result ui-state";
    box.innerHTML = result.before ? `<strong>${result.changed.length ? `${result.changed.length} linha(s) alterada(s)` : "Nenhuma mudança"}</strong><p>${result.changed.length ? `Linhas: ${result.changed.slice(0, 30).join(", ")}` : "O editor está igual à última versão salva."}</p>` : "<strong>Nenhuma versão anterior</strong><p>Salve uma versão antes de comparar.</p>";
    document.querySelector("#laboratorio .lab-toolbox")?.after(box);
  }
  function setMobilePane(pane) {
    const app = document.querySelector(".lab-app"); if (!app) return;
    app.dataset.mobilePane = pane;
    app.querySelectorAll(".lab-mobile-tabs button").forEach(button => button.classList.toggle("active", button.dataset.labPane === pane));
  }
  function enhance() {
    const app = document.querySelector(".lab-app"), actions = document.querySelector("#laboratorio .lab-top-actions");
    if (!app || !actions) return;
    if (!app.querySelector(".lab-mobile-tabs")) {
      const tabs = document.createElement("div"); tabs.className = "lab-mobile-tabs";
      tabs.innerHTML = '<button type="button" class="active" data-lab-pane="editor">Editor</button><button type="button" data-lab-pane="output">Resultado</button>';
      tabs.querySelectorAll("button").forEach(button => button.onclick = () => setMobilePane(button.dataset.labPane)); app.prepend(tabs);
    }
    if (!actions.querySelector("[data-save-version]")) {
      const save = document.createElement("button"); save.type = "button"; save.dataset.saveVersion = ""; save.textContent = "▣ Salvar versão"; save.onclick = snapshot;
      const diff = document.createElement("button"); diff.type = "button"; diff.dataset.compareVersion = ""; diff.textContent = "⇄ Comparar"; diff.onclick = showComparison;
      actions.prepend(save, diff);
    }
  }
  document.addEventListener("coda:lab", enhance);
  window.CodaLab105 = { snapshot, compare, current, versions, lineDiff };
})();
