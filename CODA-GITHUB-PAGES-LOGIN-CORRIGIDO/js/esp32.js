(() => {
  "use strict";
  const labels = { left: "Girar placa para a esquerda", right: "Girar placa para a direita", up: "Inclinar placa para cima", down: "Inclinar placa para baixo", reset: "Restaurar posição da placa" };
  function enhance() {
    document.querySelectorAll("[data-rotate]").forEach(button => {
      button.setAttribute("aria-label", labels[button.dataset.rotate] || "Controlar placa");
      button.title = labels[button.dataset.rotate] || "Controlar placa";
    });
    const heading = document.querySelector("#esp32 .page-heading");
    if (heading && !heading.querySelector(".esp-touch-hint")) {
      const hint = document.createElement("p"); hint.className = "esp-touch-hint"; hint.textContent = "Arraste para girar; use os botões maiores para ajustes precisos."; heading.appendChild(hint);
    }
  }
  document.addEventListener("coda:esp32", enhance);
  document.addEventListener("keydown", event => {
    if (!document.querySelector("#esp32.view.active") || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) return;
    const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", Home: "reset" }, action = map[event.key];
    if (!action) return; event.preventDefault(); document.querySelector(`[data-rotate="${action}"]`)?.click();
  });
  window.CodaESP32 = { enhance };
})();
