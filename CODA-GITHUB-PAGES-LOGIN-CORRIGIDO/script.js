"use strict";

(function loadCodaModules(){
  const modules=[
    "js/utils.js","js/state.js","js/analytics.js","js/workspace-sync.js","js/render/courses.js","js/render/dashboard.js","js/login.js","js/pdf-reports.js","js/lessons.js","js/laboratory.js","js/esp32.js","js/esp32-circuit-logic.js","js/esp32-ar.js","js/tutor.js","js/institution.js","js/core.js"
  ];
  const esModules=new Set(["js/state.js","js/analytics.js","js/workspace-sync.js","js/render/courses.js","js/render/dashboard.js","js/esp32-circuit-logic.js"]);
  const load=src=>src==="js/utils.js"&&window.CodaUtils?Promise.resolve():new Promise((resolve,reject)=>{const node=document.createElement("script");if(esModules.has(src))node.type="module";node.src=`${src}?v=10.5.4`;node.onload=resolve;node.onerror=()=>reject(new Error(`Falha ao carregar ${src}`));document.body.appendChild(node)});
  (async()=>{for(const src of modules)await load(src)})().catch(error=>{console.error(error);const toast=document.getElementById("toast");if(toast){toast.textContent="Não foi possível iniciar todos os módulos da Coda.";toast.classList.add("show")}});
})();
