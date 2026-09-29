"use strict";

(function createPlatform(){
  const state={user:null,classes:[],students:[],assessments:[],announcements:[],notifications:[],challenges:[],diary:null,bound:false};
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const esc=window.CodaUtils.escapeHtml;
  const date=value=>value?new Date(value).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"Sem prazo";
  const empty=message=>`<div class="platform-empty"><span>◇</span><p>${esc(message)}</p></div>`;
  const toast=message=>window.CodaCore?.showToast?.(message);

  function courseOptions(selected=""){
    return (window.CodaCore?.courses||[]).map(course=>`<option value="${course.id}" ${course.id===selected?"selected":""}>${esc(course.name)}</option>`).join("");
  }

  function classOptions({includeAll=false,selected=""}={}){
    const first=includeAll?`<option value="">Todas as turmas</option>`:"";
    return first+state.classes.filter(item=>!item.archived).map(item=>`<option value="${item.id}" ${String(item.id)===String(selected)?"selected":""}>${esc(item.name)}</option>`).join("");
  }

  async function boot(user){
    state.user=user;
    bindOnce();
    try{
      if(user.role==="Professor")await refreshTeacher();else await refreshStudent();
    }catch(error){toast(error.message||"Não foi possível sincronizar os dados.")}
  }

  function reset(){state.user=null;state.classes=[];state.students=[];state.assessments=[];state.announcements=[];state.notifications=[];state.challenges=[]}

  function bindOnce(){
    if(state.bound)return;state.bound=true;
    $("#joinClassForm")?.addEventListener("submit",async event=>{event.preventDefault();try{await CodaAPI.joinClass($("#joinClassCode").value.trim());event.target.reset();toast("Você entrou na turma");await refreshStudent()}catch(error){toast(error.message)}});
    $("#studentMessageForm")?.addEventListener("submit",async event=>{event.preventDefault();try{await CodaAPI.createMessage({classId:Number($("#studentMessageClass").value),title:$("#studentMessageTitle").value.trim(),body:$("#studentMessageBody").value.trim()});event.target.reset();populateClassSelects();toast("Dúvida enviada ao professor");await refreshMessages()}catch(error){toast(error.message)}});
    $("#studentMessageClass")?.addEventListener("change",refreshMessages);
    $("#markNotificationsRead")?.addEventListener("click",async()=>{try{await CodaAPI.markNotificationsRead();await refreshNotifications();toast("Notificações marcadas como lidas")}catch(error){toast(error.message)}});
    $("#teacherClassForm")?.addEventListener("submit",async event=>{event.preventDefault();try{await CodaAPI.createClass({name:$("#teacherClassName").value.trim(),subject:$("#teacherClassSubject").value.trim(),description:$("#teacherClassDescription").value.trim()});event.target.reset();$("#teacherClassSubject").value="Tecnologia";toast("Turma criada com código de matrícula");await refreshTeacher()}catch(error){toast(error.message)}});
    $("#teacherAnnouncementForm")?.addEventListener("submit",async event=>{event.preventDefault();try{await CodaAPI.createAnnouncement({classId:Number($("#teacherAnnouncementClass").value),title:$("#teacherAnnouncementTitle").value.trim(),body:$("#teacherAnnouncementBody").value.trim()});event.target.reset();populateClassSelects();toast("Aviso enviado à turma");await refreshAnnouncements()}catch(error){toast(error.message)}});
    $("#teacherMessageClass")?.addEventListener("change",refreshTeacherMessages);
    $("#teacherMessageForm")?.addEventListener("submit",async event=>{event.preventDefault();const classId=Number($("#teacherMessageClass").value);if(!classId){toast("Crie uma turma antes de enviar mensagens");return}try{await CodaAPI.createMessage({classId,parentId:Number($("#teacherMessageParent").value)||null,title:$("#teacherMessageTitle").value.trim(),body:$("#teacherMessageBody").value.trim()});event.target.reset();toast("Resposta enviada à turma");await refreshTeacherMessages()}catch(error){toast(error.message)}});
    $("#serverAnalyticsClass")?.addEventListener("change",refreshTeacherAnalytics);
    $("#teacherStudentSearch")?.addEventListener("input",renderTeacherStudentDirectory);
    $("#teacherEnrollForm")?.addEventListener("submit",async event=>{event.preventDefault();const classId=Number($("#teacherEnrollClass").value),studentId=Number($("#teacherEnrollStudent").value);if(!classId||!studentId){toast("Selecione o aluno e a turma");return}const button=event.submitter;button.disabled=true;try{await CodaAPI.enrollStudent(classId,studentId);toast("Aluno adicionado diretamente à turma");await refreshTeacher()}catch(error){toast(error.message)}finally{button.disabled=false}});
    $("#addAssessmentQuestion")?.addEventListener("click",()=>addQuestion());
    $("#serverAssessmentEditor")?.addEventListener("submit",saveAssessment);
    $("#createServerBackup")?.addEventListener("click",async()=>{try{await CodaAPI.createBackup();toast("Backup SQLite criado");await refreshBackups()}catch(error){toast(error.message)}});
    $("#loadDiary")?.addEventListener("click",refreshDiary);
    $("#diaryClass")?.addEventListener("change",refreshDiary);
    $("#diaryDate")?.addEventListener("change",refreshDiary);
    $("#attendanceForm")?.addEventListener("submit",saveAttendanceRegister);
    $("#gradeForm")?.addEventListener("submit",saveGradeRegister);
    $("#rubricForm")?.addEventListener("submit",saveRubricRegister);
  }

  async function refreshTeacher(){
    if(state.user?.role!=="Professor")return;
    const [summary,classData,studentData,assessmentData,contentData,challengeData]=await Promise.all([CodaAPI.overview(),CodaAPI.classes(),CodaAPI.students(),CodaAPI.assessments(),CodaAPI.content(),CodaAPI.challenges()]);
    state.classes=classData.classes||[];state.students=studentData.students||[];state.assessments=assessmentData.assessments||[];state.challenges=challengeData.challenges||[];
    populateClassSelects();renderTeacherClasses();renderTeacherStudentDirectory();renderTeacherAssessments();window.CodaCore?.applyServerContent?.(contentData);window.CodaCore?.applyServerChallenges?.(state.challenges);renderChallenges();updateTeacherSummary(summary);
    await Promise.all([refreshAnnouncements(),refreshTeacherAnalytics(),refreshBackups(),refreshTeacherMessages()]);
    if(!$(".assessment-question"))addQuestion();
    if($("#diaryDate")&&!$("#diaryDate").value)$("#diaryDate").value=new Date().toISOString().slice(0,10);
    const rubricCourse=$("#rubricCourse");if(rubricCourse&&!rubricCourse.options.length)rubricCourse.innerHTML=courseOptions();
  }

  function updateTeacherSummary(summary){
    const values={teacherStudentCount:summary.students,teacherQuizCount:summary.assessments,teacherEditCount:summary.lessonsEdited,teacherChallengeCount:state.challenges.length,teacherReplyCount:summary.pendingReviews};
    Object.entries(values).forEach(([id,value])=>{const item=$("#"+id);if(item)item.textContent=value??0});
    const sync=$("#serverLastSync");if(sync)sync.textContent=new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  }

  function populateClassSelects(){
    ["teacherAnnouncementClass","serverAssessmentClass","teacherEnrollClass","diaryClass"].forEach(id=>{const select=$("#"+id);if(!select)return;const current=select.value;select.innerHTML=classOptions({selected:current});if([...select.options].some(option=>option.value===current))select.value=current});
    ["serverAnalyticsClass","teacherMessageClass"].forEach(id=>{const select=$("#"+id);if(!select)return;const current=select.value;select.innerHTML=classOptions({includeAll:true,selected:current});if([...select.options].some(option=>option.value===current))select.value=current});
    const enrollStudent=$("#teacherEnrollStudent");if(enrollStudent){const current=enrollStudent.value;enrollStudent.innerHTML=state.students.length?`<option value="">Selecione um aluno</option>${state.students.map(item=>`<option value="${item.id}">${esc(item.name)} — ${esc(item.registrationCode||item.email)}</option>`).join("")}`:'<option value="">Nenhum aluno cadastrado</option>';if([...enrollStudent.options].some(option=>option.value===current))enrollStudent.value=current}
    const challenge=$("#challengeClass");if(challenge){const current=challenge.value;challenge.innerHTML=classOptions({includeAll:true,selected:current})}
    const student=$("#studentMessageClass");if(student){const current=student.value;student.innerHTML=classOptions({selected:current})}
    const assessmentCourse=$("#serverAssessmentCourse");if(assessmentCourse&&!assessmentCourse.options.length)assessmentCourse.innerHTML=courseOptions();
  }

  function renderTeacherClasses(){
    const root=$("#teacherClassList");if(!root)return;
    root.innerHTML=state.classes.length?state.classes.map(item=>`<article class="teacher-class-card ${item.archived?"archived":""}"><div><small>${esc(item.subject)} • ${item.student_count||0} alunos</small><h3>${esc(item.name)}</h3><p>${esc(item.description||"Sem descrição")}</p></div><div class="class-code"><small>CÓDIGO DE MATRÍCULA</small><strong>${esc(item.join_code)}</strong><button type="button" data-copy-class-code="${esc(item.join_code)}">Copiar código</button></div><button type="button" data-archive-class="${item.id}" data-archived="${item.archived?0:1}">${item.archived?"Reabrir":"Arquivar"}</button></article>`).join(""):empty("Crie sua primeira turma para começar a matricular alunos.");
    $$('[data-copy-class-code]',root).forEach(button=>button.onclick=async()=>{try{await navigator.clipboard.writeText(button.dataset.copyClassCode);toast("Código copiado")}catch{toast(`Código: ${button.dataset.copyClassCode}`)}});
    $$('[data-archive-class]',root).forEach(button=>button.onclick=async()=>{try{await CodaAPI.updateClass(button.dataset.archiveClass,{archived:Number(button.dataset.archived)});await refreshTeacher();toast("Turma atualizada")}catch(error){toast(error.message)}});
  }

  function renderTeacherStudentDirectory(){
    const root=$("#teacherStudentDirectory");if(!root)return;const term=$("#teacherStudentSearch")?.value.trim().toLowerCase()||"";
    const students=state.students.filter(item=>`${item.name} ${item.email} ${item.registrationCode||""}`.toLowerCase().includes(term));
    root.innerHTML=students.length?students.map(student=>`<article class="student-directory-card"><div class="student-identity"><span>${esc(initials(student.name))}</span><div><strong>${esc(student.name)}</strong><small>${esc(student.email)}${student.registrationCode?` • Matrícula ${esc(student.registrationCode)}`:""}</small></div></div><div class="student-class-tags">${student.classes?.length?student.classes.map(item=>`<span class="${item.status}">${esc(item.name)}</span>`).join(""):'<span class="available">Disponível para matrícula</span>'}</div><button type="button" data-prepare-enrollment="${student.id}">Adicionar à turma</button></article>`).join(""):empty(term?"Nenhum aluno corresponde à busca.":"Nenhum aluno cadastrado no sistema.");
    $$('[data-prepare-enrollment]',root).forEach(button=>button.onclick=()=>{$("#teacherEnrollStudent").value=button.dataset.prepareEnrollment;$("#teacherEnrollClass").focus();toast("Agora escolha a turma")});
    const count=$("#teacherStudentDirectoryCount");if(count)count.textContent=`${students.length} de ${state.students.length}`;
  }

  async function refreshDiary(){
    if(state.user?.role!=="Professor")return;
    const classId=Number($("#diaryClass")?.value),dateValue=$("#diaryDate")?.value||new Date().toISOString().slice(0,10);
    if(!classId){state.diary=null;renderDiary();return}
    try{state.diary=await CodaAPI.diary(classId,dateValue);renderDiary()}catch(error){toast(error.message)}
  }

  function renderDiary(){
    const data=state.diary,members=data?.members||[],attendance=data?.attendance||[],grades=data?.grades||[],rubrics=data?.rubrics||[];
    const byStudent=new Map(attendance.map(item=>[Number(item.student_id),item]));
    if($("#diarySummary"))$("#diarySummary").innerHTML=[
      ["ALUNOS",members.length,"matriculados"],["PRESENTES",attendance.filter(item=>item.status==="present").length,"na data selecionada"],["NOTAS",grades.length,"lançamentos"],["RUBRICAS",rubrics.length,"modelos ativos"]
    ].map(([label,value,note])=>`<article><small>${label}</small><strong>${value}</strong><span>${note}</span></article>`).join("");
    if($("#attendanceList"))$("#attendanceList").innerHTML=members.length?members.map(student=>{const record=byStudent.get(Number(student.id))||{status:"present",note:""};return `<article data-attendance-student="${student.id}"><div class="student-identity"><span>${esc(initials(student.name))}</span><div><strong>${esc(student.name)}</strong><small>${esc(student.email)}</small></div></div><label>Situação<select data-attendance-status><option value="present" ${record.status==="present"?"selected":""}>Presente</option><option value="late" ${record.status==="late"?"selected":""}>Atraso</option><option value="absent" ${record.status==="absent"?"selected":""}>Falta</option><option value="excused" ${record.status==="excused"?"selected":""}>Justificada</option></select></label><label>Observação<input data-attendance-note maxlength="500" value="${esc(record.note||"")}"></label></article>`}).join(""):empty("Selecione uma turma com alunos matriculados.");
    if($("#gradeStudent"))$("#gradeStudent").innerHTML=members.length?members.map(student=>`<option value="${student.id}">${esc(student.name)}</option>`).join(""):'<option value="">Nenhum aluno</option>';
    if($("#gradeList"))$("#gradeList").innerHTML=grades.length?grades.map(item=>`<article class="platform-list-item"><span>◎</span><div><small>${esc(item.student_name)} • ${date(item.created_at)}</small><strong>${esc(item.title)}</strong><p>${esc(item.competency)} • ${Number(item.score).toFixed(1)}/${Number(item.max_score).toFixed(1)}${item.feedback?` • ${esc(item.feedback)}`:""}</p></div></article>`).join(""):empty("Nenhuma nota lançada nesta turma.");
    if($("#rubricList"))$("#rubricList").innerHTML=rubrics.length?rubrics.map(item=>`<article class="platform-list-item"><span>✓</span><div><small>${esc(item.course_id.toUpperCase())}</small><strong>${esc(item.title)}</strong><p>${(item.criteria||[]).map(esc).join(" • ")}</p></div></article>`).join(""):empty("Nenhuma rubrica criada nesta turma.");
  }

  async function saveAttendanceRegister(event){
    event.preventDefault();const classId=Number($("#diaryClass").value);if(!classId){toast("Selecione uma turma");return}
    const records=$$("[data-attendance-student]",event.currentTarget).map(row=>({studentId:Number(row.dataset.attendanceStudent),status:$("[data-attendance-status]",row).value,note:$("[data-attendance-note]",row).value.trim()}));
    try{state.diary=await CodaAPI.saveAttendance({classId,date:$("#diaryDate").value,records});renderDiary();toast("Chamada salva no SQLite")}catch(error){toast(error.message)}
  }

  async function saveGradeRegister(event){
    event.preventDefault();const classId=Number($("#diaryClass").value);if(!classId){toast("Selecione uma turma");return}
    try{await CodaAPI.saveGrade({classId,studentId:Number($("#gradeStudent").value),title:$("#gradeTitle").value.trim(),competency:$("#gradeCompetency").value,score:Number($("#gradeScore").value),maxScore:Number($("#gradeMax").value),feedback:$("#gradeFeedback").value.trim()});event.currentTarget.reset();$("#gradeMax").value="100";toast("Nota salva e aluno notificado");await refreshDiary()}catch(error){toast(error.message)}
  }

  async function saveRubricRegister(event){
    event.preventDefault();const classId=Number($("#diaryClass").value);if(!classId){toast("Selecione uma turma");return}
    try{await CodaAPI.saveRubric({classId,courseId:$("#rubricCourse").value,title:$("#rubricTitle").value.trim(),criteria:$("#rubricCriteria").value.split("\n").map(item=>item.trim()).filter(Boolean)});event.currentTarget.reset();toast("Rubrica salva");await refreshDiary()}catch(error){toast(error.message)}
  }

  async function refreshAnnouncements(){
    if(!state.user)return;const data=await CodaAPI.announcements();state.announcements=data.announcements||[];
    const teacherRoot=$("#teacherAnnouncementHistory");if(teacherRoot)teacherRoot.innerHTML=announcementMarkup(state.announcements);
    const studentRoot=$("#studentAnnouncementList");if(studentRoot)studentRoot.innerHTML=announcementMarkup(state.announcements);
  }

  function announcementMarkup(items){return items.length?items.slice(0,12).map(item=>`<article class="platform-list-item"><span>♢</span><div><small>${esc(item.class_name)} • ${date(item.created_at)}</small><strong>${esc(item.title)}</strong><p>${esc(item.body)}</p></div></article>`).join(""):empty("Nenhum aviso publicado ainda.")}

  async function refreshTeacherMessages(){
    if(state.user?.role!=="Professor")return;const root=$("#teacherMessageList"),select=$("#teacherMessageClass"),classId=select?select.value:(state.classes[0]?.id||"");if(!root)return;
    if(!state.classes.length){root.innerHTML=empty("Crie uma turma para receber dúvidas dos alunos.");return}
    const data=await CodaAPI.messages(classId);const messages=data.messages||[];const questions=messages.filter(item=>item.author_role==="Aluno"&&!item.parent_id),replies=messages.filter(item=>item.parent_id);
    root.innerHTML=questions.length?questions.map(item=>`<article class="platform-list-item question-item ${item.answered?"answered":"pending"}"><span>${esc(initials(item.author_name))}</span><div><small>${esc(item.class_name||"")} • ${esc(item.author_name)} • ${date(item.created_at)}</small><strong>${esc(item.title||"Dúvida")}</strong><p>${esc(item.body)}</p>${replies.filter(reply=>Number(reply.parent_id)===Number(item.id)).map(reply=>`<div class="teacher-reply"><small>Resposta • ${date(reply.created_at)}</small><p>${esc(reply.body)}</p></div>`).join("")}</div><div class="question-actions"><b>${item.answered?"RESPONDIDA":"PENDENTE"}</b><button type="button" data-reply-message="${item.id}" data-reply-class="${item.class_id}" data-reply-name="${esc(item.author_name)}">${item.answered?"Responder novamente":"Responder"}</button></div></article>`).join(""):empty(classId?"Nenhuma dúvida nesta turma.":"Nenhuma dúvida recebida nas suas turmas.");
    $$('[data-reply-message]',root).forEach(button=>button.onclick=()=>{$("#teacherMessageClass").value=button.dataset.replyClass;$("#teacherMessageParent").value=button.dataset.replyMessage;$("#teacherMessageTitle").value=`Resposta para ${button.dataset.replyName}`;$("#teacherMessageBody").focus()});
    const pending=$("#teacherPendingQuestionCount");if(pending)pending.textContent=questions.filter(item=>!item.answered).length;
  }

  async function refreshTeacherAnalytics(){
    if(state.user?.role!=="Professor")return;const classId=$("#serverAnalyticsClass")?.value||"";const data=await CodaAPI.analytics(classId);const root=$("#serverStudentList");if(!root)return;
    root.innerHTML=data.students?.length?data.students.map(student=>{const summary=student.workspace?.summary||{};const submissions=(data.submissions||[]).filter(item=>item.student_id===student.id);const average=submissions.length?Math.round(submissions.reduce((sum,item)=>sum+(item.max_score?item.score/item.max_score*100:0),0)/submissions.length):0;return `<article><div class="student-identity"><span>${esc(initials(student.name))}</span><div><strong>${esc(student.name)}</strong><small>${esc(student.email)}</small></div></div><div class="student-data"><span><small>AULAS</small><b>${summary.lessons||0}</b></span><span><small>ATIVIDADES</small><b>${summary.activities||0}</b></span><span><small>ESTUDO</small><b>${summary.studyMinutes||0} min</b></span><span><small>MÉDIA</small><b>${average}%</b></span></div>${classId?`<button class="pause-enrollment" type="button" data-pause-enrollment="${student.id}">Pausar matrícula</button>`:""}</article>`}).join(""):empty("Nenhum aluno matriculado nesta seleção.");
    $$('[data-pause-enrollment]',root).forEach(button=>button.onclick=async()=>{if(!confirm("Pausar a matrícula deste aluno nesta turma?"))return;try{await CodaAPI.setEnrollment(classId,button.dataset.pauseEnrollment,"paused");toast("Matrícula pausada");await refreshTeacher()}catch(error){toast(error.message)}});
    renderServerSubmissions(data.submissions||[]);renderServerEvents(data.events||[]);const graded=(data.submissions||[]).filter(item=>item.max_score>0);const average=graded.length?Math.round(graded.reduce((sum,item)=>sum+item.score/item.max_score*100,0)/graded.length):null;const metric=$("#teacherQuizAverage");if(metric)metric.textContent=average===null?"—":`${average}%`;
  }

  function renderServerSubmissions(items){const root=$("#serverSubmissionList");if(!root)return;root.innerHTML=items.length?items.slice(0,40).map(item=>`<article class="platform-list-item submission-item"><span>${item.status==="submitted"?"!":"✓"}</span><div><small>${esc(item.name)} • ${esc(item.course_id.toUpperCase())} • ${date(item.submitted_at)}</small><strong>${esc(item.title)}</strong><p>${Number(item.score||0).toFixed(1)} / ${Number(item.max_score||0).toFixed(1)} pontos • ${item.status==="submitted"?"aguarda correção":"corrigida"}</p>${item.status==="submitted"?`<form data-review-submission="${item.id}"><label>Nota total<input type="number" min="0" max="${Number(item.max_score||100)}" step="0.5" value="${Number(item.score||0)}" required></label><label>Feedback<input maxlength="3000" placeholder="Orientação para o aluno"></label><button type="submit">Finalizar correção</button></form>`:""}</div></article>`).join(""):empty("Nenhuma entrega registrada.");$$('[data-review-submission]',root).forEach(form=>form.onsubmit=async event=>{event.preventDefault();const fields=form.querySelectorAll("input");try{await CodaAPI.reviewSubmission(form.dataset.reviewSubmission,{score:Number(fields[0].value),feedback:fields[1].value.trim()});toast("Correção salva");await refreshTeacherAnalytics()}catch(error){toast(error.message)}})}
  function renderServerEvents(items){const root=$("#serverEventList");if(!root)return;root.innerHTML=items.length?items.slice(0,50).map(item=>`<article class="platform-list-item"><span>•</span><div><small>${esc(item.name)} • ${date(item.created_at)}</small><strong>${esc(eventName(item.event_type))}</strong><p>${item.course_id?`Matéria ${esc(item.course_id.toUpperCase())}`:"Plataforma"}${Number.isInteger(item.lesson_index)?` • aula ${item.lesson_index+1}`:""}</p></div></article>`).join(""):empty("Ainda não há ações de aprendizagem nesta turma.")}
  function eventName(type){return ({lesson_complete:"Aula concluída",activity_complete:"Atividade executada",lesson_open:"Aula aberta",formative_answer:"Verificação formativa",study_session:"Sessão de estudo"})[type]||String(type||"Atividade").replaceAll("_"," ")}

  function addQuestion(data={}){
    const root=$("#assessmentQuestionList");if(!root)return;const index=$$(".assessment-question",root).length+1,article=document.createElement("article");article.className="assessment-question";
    article.innerHTML=`<header><strong>Questão ${index}</strong><button type="button" data-remove-question>Remover</button></header><div class="teacher-select-row"><label>Tipo<select data-question-type><option value="multiple_choice">Múltipla escolha</option><option value="true_false">Verdadeiro ou falso</option><option value="essay">Discursiva</option></select></label><label>Pontos<input data-question-points type="number" min="0.5" max="100" step="0.5" value="${Number(data.points||1)}"></label></div><label>Enunciado<textarea data-question-prompt rows="3" required>${esc(data.prompt||"")}</textarea></label><div class="question-options"><label>Alternativa A<input data-question-option="0" value="${esc(data.options?.[0]||"")}"></label><label>Alternativa B<input data-question-option="1" value="${esc(data.options?.[1]||"")}"></label><label>Alternativa C<input data-question-option="2" value="${esc(data.options?.[2]||"")}"></label><label>Alternativa D<input data-question-option="3" value="${esc(data.options?.[3]||"")}"></label></div><label>Resposta correta<select data-question-answer><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></label><label>Explicação da resposta<textarea data-question-explanation rows="2">${esc(data.explanation||"")}</textarea></label>`;
    root.appendChild(article);$("[data-question-type]",article).value=data.type||"multiple_choice";$("[data-remove-question]",article).onclick=()=>{article.remove();renumberQuestions()};$("[data-question-type]",article).onchange=()=>updateQuestionType(article);updateQuestionType(article);$("[data-question-answer]",article).value=String(data.correctAnswer??(data.type==="true_false"?"true":0));
  }

  function updateQuestionType(article){const type=$("[data-question-type]",article).value,options=$(".question-options",article),answer=$("[data-question-answer]",article);options.hidden=type!=="multiple_choice";if(type==="true_false"){answer.innerHTML='<option value="true">Verdadeiro</option><option value="false">Falso</option>'}else if(type==="essay"){answer.innerHTML='<option value="">Correção manual</option>'}else{answer.innerHTML='<option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option>'}}
  function renumberQuestions(){$$(".assessment-question").forEach((item,index)=>$("header strong",item).textContent=`Questão ${index+1}`)}
  function serializeQuestions(){return $$(".assessment-question").map(item=>{const type=$("[data-question-type]",item).value;return {type,prompt:$("[data-question-prompt]",item).value.trim(),points:Number($("[data-question-points]",item).value||1),options:type==="multiple_choice"?$$('[data-question-option]',item).map(input=>input.value.trim()):type==="true_false"?["Verdadeiro","Falso"]:[],correctAnswer:$("[data-question-answer]",item).value,explanation:$("[data-question-explanation]",item).value.trim()}}).filter(item=>item.prompt)}

  async function saveAssessment(event){event.preventDefault();const questions=serializeQuestions(),classId=Number($("#serverAssessmentClass").value);if(!classId){toast("Crie uma turma antes da avaliação");return}if(!questions.length){toast("Adicione pelo menos uma questão");return}try{await CodaAPI.createAssessment({classId,courseId:$("#serverAssessmentCourse").value,type:$("#serverAssessmentType").value,status:$("#serverAssessmentStatus").value,title:$("#serverAssessmentTitle").value.trim(),description:$("#serverAssessmentDescription").value.trim(),openAt:localToIso($("#serverAssessmentOpen").value),dueAt:localToIso($("#serverAssessmentDue").value),duration:Number($("#serverAssessmentDuration").value),attempts:Number($("#serverAssessmentAttempts").value),minimumScore:Number($("#serverAssessmentMinimum").value),questions});event.target.reset();$("#assessmentQuestionList").innerHTML="";addQuestion();populateClassSelects();toast("Avaliação salva no servidor");await refreshAssessments()}catch(error){toast(error.message)}}
  function localToIso(value){return value?new Date(value).toISOString():null}

  async function refreshAssessments(){const data=await CodaAPI.assessments();state.assessments=data.assessments||[];if(state.user?.role==="Professor")renderTeacherAssessments();else renderStudentAssessments()}
  function renderTeacherAssessments(){const root=$("#serverAssessmentList");if(!root)return;root.innerHTML=state.assessments.length?state.assessments.map(item=>`<article class="platform-list-item"><span>?</span><div><small>${esc(item.class_name||"Sem turma")} • ${esc(item.status.toUpperCase())}</small><strong>${esc(item.title)}</strong><p>${item.question_count||0} questões • ${item.duration_minutes} min • ${item.attempts_allowed} tentativa(s)</p></div><div class="list-actions">${item.status==="draft"?`<button type="button" data-assessment-status="${item.id}" data-status="published">Publicar</button>`:""}<button type="button" data-assessment-status="${item.id}" data-status="archived">Arquivar</button></div></article>`).join(""):empty("Nenhuma avaliação criada.");$$('[data-assessment-status]',root).forEach(button=>button.onclick=async()=>{try{await CodaAPI.assessmentStatus(button.dataset.assessmentStatus,button.dataset.status);await refreshAssessments();toast("Avaliação atualizada")}catch(error){toast(error.message)}})}

  async function refreshStudent(){
    if(state.user?.role!=="Aluno")return;
    const [summary,classData,announcementData,assessmentData,notificationData,contentData,challengeData]=await Promise.all([CodaAPI.overview(),CodaAPI.classes(),CodaAPI.announcements(),CodaAPI.assessments(),CodaAPI.notifications(),CodaAPI.content(),CodaAPI.challenges()]);
    state.classes=classData.classes||[];state.announcements=announcementData.announcements||[];state.assessments=assessmentData.assessments||[];state.notifications=notificationData.notifications||[];state.challenges=challengeData.challenges||[];
    renderStudentSummary(summary);populateClassSelects();renderStudentClasses();renderStudentAssessments();renderStudentAnnouncements();renderNotifications();renderAgenda();window.CodaCore?.applyServerContent?.(contentData);window.CodaCore?.applyServerChallenges?.(state.challenges);await refreshMessages();
  }

  function renderStudentSummary(summary){const root=$("#studentPlatformStats");if(root)root.innerHTML=[{label:"TURMAS",value:summary.classes||0,text:"matrículas ativas"},{label:"AVALIAÇÕES",value:summary.pendingAssessments||0,text:"pendentes"},{label:"AVISOS",value:summary.unreadNotifications||0,text:"não lidos"}].map(item=>`<article><small>${item.label}</small><strong>${item.value}</strong><p>${item.text}</p></article>`).join("");["studentClassBadge"].forEach(id=>{const node=$("#"+id);if(node)node.textContent=summary.classes||0})}
  function renderStudentClasses(){const root=$("#studentClassList");if(!root)return;root.innerHTML=state.classes.length?state.classes.map(item=>`<article class="platform-list-item"><span>▦</span><div><small>${esc(item.subject)} • Prof. ${esc(item.teacher_name)}</small><strong>${esc(item.name)}</strong><p>${esc(item.description||"Turma ativa")}</p></div><b>${esc(item.join_code)}</b></article>`).join(""):empty("Você ainda não participa de nenhuma turma. Use o código enviado pelo professor.")}
  function renderStudentAssessments(){const root=$("#studentAssessmentList");if(!root)return;root.innerHTML=state.assessments.length?state.assessments.map(item=>`<article class="platform-list-item"><span>?</span><div><small>${esc(item.class_name)} • ${item.due_at?`prazo ${date(item.due_at)}`:"sem prazo"}</small><strong>${esc(item.title)}</strong><p>${item.question_count||0} questões • ${item.attempts_used||0}/${item.attempts_allowed} tentativa(s)</p></div><button type="button" data-open-server-assessment="${item.id}" ${item.attempts_used>=item.attempts_allowed?"disabled":""}>${item.attempts_used>=item.attempts_allowed?"Concluída":"Responder"}</button></article>`).join(""):empty("Nenhuma avaliação atribuída.");$$('[data-open-server-assessment]',root).forEach(button=>button.onclick=()=>openStudentAssessment(button.dataset.openServerAssessment))}
  async function openStudentAssessment(id){try{const {assessment}=await CodaAPI.assessment(id),root=$("#studentAssessmentList");root.innerHTML=`<form class="student-assessment-form" id="activeServerAssessment"><header><button type="button" id="closeServerAssessment">← Voltar</button><div><small>${esc(assessment.className||"")}</small><h3>${esc(assessment.title)}</h3><p>${esc(assessment.description||"")}</p></div><span>${assessment.duration} min</span></header>${assessment.questions.map((question,index)=>`<fieldset><legend>${index+1}. ${esc(question.prompt)} <small>${question.points} ponto(s)</small></legend>${question.type==="essay"?`<textarea name="answer-${question.id}" rows="5" required></textarea>`:question.options.map((option,optionIndex)=>`<label><input type="radio" name="answer-${question.id}" value="${question.type==="true_false"?String(optionIndex===0):optionIndex}" required><span>${esc(option)}</span></label>`).join("")}</fieldset>`).join("")}<button class="primary" type="submit">Enviar respostas →</button></form>`;$("#closeServerAssessment").onclick=renderStudentAssessments;$("#activeServerAssessment").onsubmit=async event=>{event.preventDefault();const answers={};assessment.questions.forEach(question=>{const field=event.target.elements[`answer-${question.id}`];answers[question.id]=field?.value||""});try{const result=await CodaAPI.submitAssessment(assessment.id,answers),percent=result.submission.max_score?Math.round(result.submission.score/result.submission.max_score*100):0;toast(`Avaliação enviada • ${percent}% automático`);await refreshAssessments()}catch(error){toast(error.message)}}}catch(error){toast(error.message)}}
  function renderStudentAnnouncements(){const root=$("#studentAnnouncementList");if(root)root.innerHTML=announcementMarkup(state.announcements)}
  async function refreshNotifications(){const data=await CodaAPI.notifications();state.notifications=data.notifications||[];renderNotifications();renderAgenda()}
  function renderNotifications(){const root=$("#studentNotificationList"),unread=state.notifications.filter(item=>!item.read_at).length;if(root)root.innerHTML=state.notifications.length?state.notifications.map(item=>`<article class="platform-list-item ${item.read_at?"":"unread"}"><span>${item.read_at?"○":"●"}</span><div><small>${date(item.created_at)}</small><strong>${esc(item.title)}</strong><p>${esc(item.body)}</p></div></article>`).join(""):empty("Você não tem notificações.");["studentNoticeBadge","topNotificationCount"].forEach(id=>{const node=$("#"+id);if(node)node.textContent=unread})}
  function renderAgenda(){const root=$("#studentAgendaList");if(!root)return;const items=state.assessments.filter(item=>item.due_at).map(item=>({date:item.due_at,type:"Avaliação",title:item.title,className:item.class_name})).concat(state.announcements.slice(0,10).map(item=>({date:item.created_at,type:"Aviso",title:item.title,className:item.class_name}))).sort((a,b)=>new Date(a.date)-new Date(b.date));root.innerHTML=items.length?items.map(item=>`<article><time>${date(item.date)}</time><span></span><div><small>${esc(item.type)} • ${esc(item.className)}</small><strong>${esc(item.title)}</strong></div></article>`).join(""):empty("Nenhum compromisso agendado.")}
  async function refreshMessages(){if(state.user?.role!=="Aluno"||!state.classes.length){const root=$("#studentMessageList");if(root)root.innerHTML=empty("Entre em uma turma para enviar dúvidas.");return}const classId=$("#studentMessageClass")?.value||state.classes[0].id;if(!classId)return;try{const data=await CodaAPI.messages(classId),root=$("#studentMessageList");if(root)root.innerHTML=data.messages?.length?data.messages.map(item=>`<article class="platform-list-item"><span>${esc(initials(item.author_name))}</span><div><small>${esc(item.author_role)} • ${date(item.created_at)}</small><strong>${esc(item.title||"Resposta")}</strong><p>${esc(item.body)}</p></div></article>`).join(""):empty("Nenhuma dúvida nesta turma.")}catch(error){toast(error.message)}}
  function renderChallenges(){const root=$("#teacherChallengeList");if(!root)return;root.innerHTML=state.challenges.length?state.challenges.map(item=>`<article><div><small>${esc(item.course_id.toUpperCase())} • ${esc(item.status)}</small><strong>${esc(item.title)}</strong><span>${item.due_at?`Prazo ${date(item.due_at)}`:"Sem prazo"}</span></div></article>`).join(""):"<p>Nenhum desafio salvo no servidor.</p>"}
  async function refreshChallenges(){const data=await CodaAPI.challenges();state.challenges=data.challenges||[];window.CodaCore?.applyServerChallenges?.(state.challenges);renderChallenges();const count=$("#teacherChallengeCount");if(count)count.textContent=state.challenges.length}
  async function refreshBackups(){if(state.user?.role!=="Professor")return;const data=await CodaAPI.backups(),root=$("#backupList");if(root)root.innerHTML=data.backups?.length?data.backups.map(item=>`<a href="/api/backups/${encodeURIComponent(item.name)}"><span>▤</span><strong>${esc(item.name)}</strong><small>${Math.ceil(item.size/1024)} KB</small></a>`).join(""):"<p>Nenhum backup criado ainda.</p>"}
  function initials(name){return String(name||"").split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}
  async function showTeacherSection(section){try{if(section==="classes"){renderTeacherClasses();await refreshAnnouncements()}if(section==="questions")await refreshTeacherMessages();if(section==="students"){renderTeacherStudentDirectory();await refreshTeacherAnalytics()}if(section==="diary")await refreshDiary();if(section==="assessments")await refreshAssessments();if(section==="challenges")await refreshChallenges();if(section==="database")await refreshBackups()}catch(error){toast(error.message)}}
  async function showStudentView(view){try{if(view==="turmas")await refreshStudent();if(view==="agenda")await refreshNotifications()}catch(error){toast(error.message)}}

  window.CodaPlatform={boot,reset,showTeacherSection,showStudentView,refreshChallenges,refreshTeacher,getState:()=>({user:state.user,classes:[...state.classes],students:[...state.students],assessments:[...state.assessments],diary:state.diary})};
})();
