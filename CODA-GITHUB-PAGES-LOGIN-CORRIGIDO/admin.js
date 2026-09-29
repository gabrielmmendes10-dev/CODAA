"use strict";

(function createAdminPortal(){
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const safeEsc=window.CodaUtils.escapeHtml;
  const date=value=>value?new Date(value).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"—";
  const toast=message=>window.CodaCore?.showToast?.(message);
  const sectionInfo={
    overview:["GESTÃO INSTITUCIONAL","Visão geral","Acompanhe o ambiente acadêmico e os controles da instituição."],
    institution:["IDENTIDADE INSTITUCIONAL","Instituição","Personalize os dados, a unidade e as cores principais do Coda."],
    users:["CONTROLE DE ACESSO","Usuários e acessos","Consulte administradores, professores e alunos cadastrados."],
    social:["MODERAÇÃO INSTITUCIONAL","Rede social","Acompanhe denúncias, publicações oficiais e regras da comunidade."],
    academics:["GESTÃO ACADÊMICA","Turmas e professores","Acompanhe a estrutura de ensino e as matrículas ativas."],
    content:["CONTEÚDO INSTITUCIONAL","Editor de conteúdo","Revise textos, atividades e vídeos das 98 aulas."],
    indicators:["INDICADORES PEDAGÓGICOS","Competências","Leia participação e progresso por área de conhecimento."],
    privacy:["GOVERNANÇA","Marca e LGPD","Organize os controles institucionais de privacidade e identidade."],
    database:["DADOS LOCAIS","Banco SQLite","Crie cópias de segurança do banco usado pela plataforma."]
  };
  const state={user:null,data:null,section:"overview",bound:false,editorData:null};

  function metric(label,value,text,icon){return `<article><span>${icon}</span><div><small>${safeEsc(label)}</small><strong>${Number(value||0).toLocaleString("pt-BR")}</strong><p>${safeEsc(text)}</p></div></article>`}
  function userRow(user,compact=false){
    const initials=String(user.name||"US").trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase();
    if(compact)return `<div class="admin-list-row"><span>${safeEsc(initials)}</span><div><strong>${safeEsc(user.name)}</strong><small>${safeEsc(user.role)} · ${date(user.last_seen_at)}</small></div><b class="status-pill ${user.active?"active":"paused"}">${user.active?"ATIVO":"PAUSADO"}</b></div>`;
    return "";
  }
  function createUserRow(user){
    const initials=String(user.name||"US").trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase();
    const article=document.createElement("article"),avatar=document.createElement("span"),identity=document.createElement("div"),name=document.createElement("strong"),email=document.createElement("small"),role=document.createElement("select"),seen=document.createElement("time"),action=document.createElement("button");
    const self=Number(user.id)===Number(state.user?.id);
    article.className="admin-user-row";
    article.dataset.userId=String(user.id);
    avatar.textContent=initials;
    name.textContent=String(user.name||"Usuário");
    email.textContent=String(user.email||"—");
    identity.append(name,email);
    role.dataset.adminRole=String(user.id);
    role.setAttribute("aria-label",`Grupo de acesso de ${name.textContent}`);
    ["Aluno","Professor","Admin"].forEach(value=>{const option=document.createElement("option");option.value=value;option.textContent=value;option.selected=value===user.role;role.append(option)});
    if(self){role.disabled=true;role.title="Seu próprio grupo não pode ser alterado"}
    seen.textContent=date(user.last_seen_at);
    seen.dateTime=String(user.last_seen_at||"");
    action.type="button";
    action.dataset.adminUser=String(user.id);
    action.dataset.active=user.active?"0":"1";
    action.textContent=user.active?"Pausar":"Ativar";
    action.setAttribute("aria-label",`${action.textContent} acesso de ${name.textContent}`);
    if(self){action.disabled=true;action.title="Seu próprio acesso não pode ser pausado"}
    article.append(avatar,identity,role,seen,action);
    return article;
  }
  function classRow(item,compact=false){
    const content=`<span>▦</span><div><strong>${safeEsc(item.name)}</strong><small>${safeEsc(item.subject)} · Prof. ${safeEsc(item.teacher_name)}</small></div><b>${item.student_count} aluno(s)</b>`;
    return compact?`<div class="admin-list-row">${content}</div>`:`<article>${content}<em>${item.archived?"ARQUIVADA":"ATIVA"}</em><code>${safeEsc(item.join_code)}</code></article>`;
  }

  function render(){
    if(!state.data)return;
    const {counts,institution,users,classes,competencies,privacyTasks}=state.data;
    const completed=privacyTasks.filter(item=>item.completed).length;
    const privacyPercent=privacyTasks.length?Math.round(completed/privacyTasks.length*100):0;
    $("#adminMetrics").innerHTML=[
      metric("ALUNOS",counts.students,"contas ativas","♙"),metric("PROFESSORES",counts.teachers,"contas ativas","✎"),
      metric("TURMAS",counts.classes,"espaços em andamento","▦"),metric("MATRÍCULAS",counts.enrollments,"vínculos ativos","✓")
    ].join("");
    $("#adminInstitutionSummary").innerHTML=`<div class="institution-hero-mini"><span>${safeEsc(institution.short_name)}</span><div><small>INSTITUIÇÃO ATIVA</small><h2>${safeEsc(institution.name)}</h2><p>${safeEsc(institution.campus)}</p></div></div><button type="button" data-open-admin-section="institution">Editar identidade →</button>`;
    $("#adminRecentUsers").innerHTML=users.slice(0,5).map(item=>userRow(item,true)).join("")||"<p>Nenhum usuário cadastrado.</p>";
    $("#adminRecentClasses").innerHTML=classes.slice(0,5).map(item=>classRow(item,true)).join("")||"<p>Nenhuma turma criada.</p>";
    $("#adminPrivacySummary").innerHTML=`<div class="privacy-ring" style="--privacy:${privacyPercent*3.6}deg"><span><strong>${privacyPercent}%</strong><small>concluído</small></span></div><div><span class="kicker">GOVERNANÇA</span><h2>Preparação LGPD</h2><p>${completed} de ${privacyTasks.length} controles organizados.</p><button type="button" data-open-admin-section="privacy">Continuar configuração →</button></div>`;
    $("#adminUserBadge").textContent=counts.users;
    fillInstitution(institution);
    renderUsers();
    $("#adminAcademicMetrics").innerHTML=[metric("TURMAS",counts.classes,"ativas na instituição","▦"),metric("AVALIAÇÕES",counts.assessments,"criadas no SQLite","?"),metric("AULAS EDITADAS",counts.lessons,"conteúdos personalizados","◎"),metric("MENSAGENS",counts.messages,"dúvidas e respostas","◇")].join("");
    $("#adminClassList").innerHTML=classes.map(item=>classRow(item)).join("")||"<div class=\"admin-empty\">Nenhuma turma criada ainda.</div>";
    $("#adminCompetencies").innerHTML=competencies.map(item=>`<article><header><span>${safeEsc(item.label.slice(0,2).toUpperCase())}</span><div><strong>${safeEsc(item.label)}</strong><small>${item.participants} participante(s)</small></div><b>${item.progress}%</b></header><div class="competency-track"><i style="width:${item.progress}%"></i></div><p>${item.lessonsCompleted} conclusão(ões) de aula registradas.</p></article>`).join("");
    $("#adminPrivacyPercent").textContent=`${privacyPercent}%`;
    $("#adminPrivacyTasks").innerHTML=privacyTasks.map(item=>`<button type="button" data-privacy-task="${safeEsc(item.id)}" data-completed="${item.completed?"0":"1"}" aria-pressed="${item.completed}"><span class="${item.completed?"done":""}">${item.completed?"✓":""}</span><div><strong>${safeEsc(item.label)}</strong><small>${safeEsc(item.description)}</small></div></button>`).join("");
    $("#adminDatabaseFacts").innerHTML=[`<span><small>USUÁRIOS</small><strong>${counts.users}</strong></span>`,`<span><small>TURMAS</small><strong>${counts.classes}</strong></span>`,`<span><small>AVALIAÇÕES</small><strong>${counts.assessments}</strong></span>`,`<span><small>MENSAGENS</small><strong>${counts.messages}</strong></span>`].join("");
    bindRenderedActions();
  }

  function fillInstitution(item){
    $("#institutionName").value=item.name||"";$("#institutionShortName").value=item.short_name||"";$("#institutionCampus").value=item.campus||"";$("#institutionPrivacyEmail").value=item.privacy_email||"";$("#institutionPrimaryColor").value=item.primary_color||"#5b3cc4";$("#institutionAccentColor").value=item.accent_color||"#c4b5fd";$("#institutionPreview").textContent=item.short_name||"CO";
  }

  function renderUsers(){
    if(!state.data)return;const term=$("#adminUserSearch")?.value.trim().toLowerCase()||"";
    const users=state.data.users.filter(item=>`${item.name} ${item.email} ${item.role}`.toLowerCase().includes(term));
    const root=$("#adminUserList");
    root.replaceChildren();
    if(users.length){
      const fragment=document.createDocumentFragment();
      users.forEach(item=>fragment.append(createUserRow(item)));
      root.append(fragment);
    }else{
      const emptyState=document.createElement("div");
      emptyState.className="admin-empty";
      emptyState.textContent="Nenhum usuário encontrado.";
      root.append(emptyState);
    }
    $$('[data-admin-user]').forEach(button=>button.onclick=()=>toggleUser(button));
    $$('[data-admin-role]').forEach(select=>select.onchange=()=>changeUserRole(select));
  }

  async function refresh(){
    state.data=await CodaAPI.adminDashboard();render();
    if(state.section==="database")await refreshBackups();
  }
  async function refreshBackups(){
    const data=await CodaAPI.backups();
    $("#adminBackupList").innerHTML=data.backups?.length?data.backups.map(item=>`<a href="/api/backups/${encodeURIComponent(item.name)}"><span>▣</span><strong>${safeEsc(item.name)}</strong><small>${Math.ceil(item.size/1024)} KB</small></a>`).join(""):"<p>Nenhum backup criado ainda.</p>";
  }

  async function toggleUser(button){
    button.disabled=true;try{await CodaAPI.setUserActive(button.dataset.adminUser,button.dataset.active==="1");toast("Acesso atualizado");await refresh()}catch(error){toast(error.message)}finally{button.disabled=false}
  }
  async function changeUserRole(select){
    const previous=state.data.users.find(item=>String(item.id)===select.dataset.adminRole)?.role;
    select.disabled=true;try{await CodaAPI.updateUserAccess(select.dataset.adminRole,{role:select.value});toast(`Usuário movido para o grupo ${select.value}`);await refresh()}catch(error){select.value=previous||"Aluno";toast(error.message)}finally{select.disabled=false}
  }
  async function togglePrivacy(button){
    button.disabled=true;try{await CodaAPI.setPrivacyTask(button.dataset.privacyTask,button.dataset.completed==="1");toast("Checklist atualizado");await refresh()}catch(error){toast(error.message)}finally{button.disabled=false}
  }
  function bindRenderedActions(){
    $$('[data-open-admin-section]').forEach(button=>button.onclick=()=>showSection(button.dataset.openAdminSection));
    $$('[data-privacy-task]').forEach(button=>button.onclick=()=>togglePrivacy(button));
  }
  function setupContentEditor(){
    const courses=window.CodaCore?.courses||[],course=$("#adminContentCourse"),lesson=$("#adminContentLesson");if(!course||!lesson)return;
    if(!course.options.length)course.innerHTML=courses.map(item=>`<option value="${safeEsc(item.id)}">${safeEsc(item.name)}</option>`).join("");
    const fillLessons=()=>{const selected=courses.find(item=>item.id===course.value)||courses[0];lesson.innerHTML=(selected?.topics||[]).map((topic,index)=>`<option value="${index}">Aula ${index+1} — ${safeEsc(topic)}</option>`).join("");fillContentEditor()};
    course.onchange=fillLessons;lesson.onchange=fillContentEditor;if(!lesson.options.length)fillLessons();else fillContentEditor();
  }
  function fillContentEditor(){
    const data=window.CodaCore?.getLessonEditorData?.($("#adminContentCourse").value,Number($("#adminContentLesson").value));if(!data)return;
    state.editorData=data;
    $("#adminContentStatus").value=data.status;$("#adminContentTitle").value=data.title;$("#adminContentContext").value=data.context;$("#adminContentExplanation").value=data.explanation;$("#adminContentSystem").value=data.system;$("#adminContentError").value=data.commonError;$("#adminContentActivity").value=data.activity;$("#adminContentObjectives").value=(data.objectives||[]).join("\n");$("#adminContentCheckpoints").value=(data.checkpoints||[]).join("\n");$("#adminContentVideo").value=data.videoUrl;$("#adminContentVideoNote").value=data.videoNote;$("#adminLessonSaveStatus").textContent=data.status==="published"?"PUBLICADA":data.status.toUpperCase();
  }
  async function saveAdminContent(event){
    event.preventDefault();const button=event.submitter;button.disabled=true;try{const payload={courseId:$("#adminContentCourse").value,lesson:Number($("#adminContentLesson").value),status:$("#adminContentStatus").value,title:$("#adminContentTitle").value.trim(),context:$("#adminContentContext").value.trim(),explanation:$("#adminContentExplanation").value.trim(),system:$("#adminContentSystem").value.trim(),commonError:$("#adminContentError").value.trim(),activity:$("#adminContentActivity").value.trim(),objectives:$("#adminContentObjectives").value.split("\n").map(item=>item.trim()).filter(Boolean),prerequisites:state.editorData?.prerequisites||[],checkpoints:$("#adminContentCheckpoints").value.split("\n").map(item=>item.trim()).filter(Boolean),videoUrl:$("#adminContentVideo").value.trim(),videoNote:$("#adminContentVideoNote").value.trim()};const result=await CodaAPI.saveLesson(payload);window.CodaCore?.applyServerContent?.({lessons:[result.lesson],materials:[]});state.editorData={...state.editorData,...payload};$("#adminLessonSaveStatus").textContent=payload.status==="published"?"PUBLICADA":payload.status.toUpperCase();toast("Conteúdo salvo no SQLite")}catch(error){toast(error.message)}finally{button.disabled=false}
  }
  function bindOnce(){
    if(state.bound)return;state.bound=true;
    $("#adminUserSearch")?.addEventListener("input",renderUsers);
    $("#institutionForm")?.addEventListener("submit",async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{await CodaAPI.saveInstitution({name:$("#institutionName").value.trim(),shortName:$("#institutionShortName").value.trim(),campus:$("#institutionCampus").value.trim(),privacyEmail:$("#institutionPrivacyEmail").value.trim(),primaryColor:$("#institutionPrimaryColor").value,accentColor:$("#institutionAccentColor").value});toast("Instituição atualizada");await refresh()}catch(error){toast(error.message)}finally{button.disabled=false}});
    $("#adminCreateBackup")?.addEventListener("click",async event=>{event.currentTarget.disabled=true;try{await CodaAPI.createBackup();toast("Backup SQLite criado");await refreshBackups()}catch(error){toast(error.message)}finally{event.currentTarget.disabled=false}});
    $("#adminContentEditor")?.addEventListener("submit",saveAdminContent);
  }
  async function showSection(section="overview"){
    if(state.user?.role!=="Admin")return;
    state.section=sectionInfo[section]?section:"overview";const [kicker,title,description]=sectionInfo[state.section];
    if(state.section==="social"){
      $$(".view").forEach(view=>view.classList.toggle("active",view.id==="comunidade"));
      $$('[data-admin-section]').forEach(button=>button.classList.toggle("active",button.dataset.adminSection===state.section));
      $("#adminPageTitle").textContent=title;window.CodaSocial?.render?.();window.scrollTo({top:0,behavior:"smooth"});
      document.dispatchEvent(new CustomEvent("coda:view",{detail:{view:"comunidade",section:"social",role:"Admin"}}));return;
    }
    $$(".view").forEach(view=>view.classList.toggle("active",view.id==="administrador"));
    $$('[data-admin-section]').forEach(button=>button.classList.toggle("active",button.dataset.adminSection===state.section));
    $$('[data-admin-panel]').forEach(panel=>panel.hidden=panel.dataset.adminPanel!==state.section);
    $("#adminPageTitle").textContent=title;$("#adminWorkspaceKicker").textContent=kicker;$("#adminWorkspaceTitle").textContent=title;$("#adminWorkspaceDescription").textContent=description;
    $("#sidebar").classList.remove("is-open");$("#backdrop").classList.remove("is-open");window.scrollTo({top:0,behavior:"smooth"});
    if(!state.data)await refresh();if(state.section==="content")setupContentEditor();if(state.section==="database")await refreshBackups();
    document.dispatchEvent(new CustomEvent("coda:view",{detail:{view:"administrador",section:state.section,role:"Admin"}}));
  }
  async function boot(user){state.user=user;bindOnce();const content=await CodaAPI.content();window.CodaCore?.applyServerContent?.(content);setupContentEditor();await refresh();await showSection("overview")}
  function reset(){state.user=null;state.data=null;state.section="overview";state.editorData=null}
  window.CodaAdmin={boot,reset,showSection,refresh,getState:()=>({user:state.user,data:state.data,section:state.section})};
})();
