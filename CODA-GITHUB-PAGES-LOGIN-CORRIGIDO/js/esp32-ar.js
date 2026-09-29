(() => {
  "use strict";

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const state = {
    supported: false, checked: false, session: null, gl: null, canvas: null,
    refSpace: null, viewerSpace: null, hitSource: null, lastHit: null,
    mode: "view", placed: false, selected: null, scale: 1, rotation: 0,
    board: { id:"ESP32", kind:"board", x:0, y:0, z:-0.65 },
    components: [], program: null, cube: null, frameHandle: null, device: "headset",
    mobile: { stream:null, fallback:false, placed:false, x:50, y:58, scale:1, rotation:0, dragging:false, dragDx:0, dragDy:0 }
  };

  const VERT = `attribute vec3 aPosition; uniform mat4 uProjection; uniform mat4 uView; uniform mat4 uModel; void main(){ gl_Position=uProjection*uView*uModel*vec4(aPosition,1.0); }`;
  const FRAG = `precision mediump float; uniform vec4 uColor; void main(){ gl_FragColor=uColor; }`;

  function toast(message){ window.CodaCore?.showToast?.(message); }
  function setStatus(title, text, type=""){
    const box=$("#arStatus"); if(!box) return;
    box.className=`ar-status ${type}`.trim();
    box.innerHTML=`<span>${type==="ok"?"✓":type==="warn"?"!":"◎"}</span><div><strong>${title}</strong><small>${text}</small></div>`;
  }

  function setMobileStatus(title, text, type=""){
    const box=$("#mobileARStatus"); if(!box) return;
    box.className=`ar-status ${type}`.trim();
    box.innerHTML=`<span>${type==="ok"?"✓":type==="warn"?"!":"◎"}</span><div><strong>${title}</strong><small>${text}</small></div>`;
  }

  async function checkSupport(){
    state.checked=true;
    if(!window.isSecureContext){ state.supported=false; setStatus("HTTPS necessário","Abra o CODA por HTTPS no óculos para liberar WebXR.","warn"); updateButtons(); return false; }
    if(!navigator.xr){ state.supported=false; setStatus("WebXR não encontrado","Neste dispositivo você ainda pode usar a visualização 3D normal.","warn"); updateButtons(); return false; }
    try { state.supported=await navigator.xr.isSessionSupported("immersive-ar"); }
    catch { state.supported=false; }
    setStatus(state.supported?"Realidade aumentada disponível":"RA não suportada neste navegador",state.supported?"Óculos detectado. Escolha um modo e entre na RA.":"Use um navegador/óculos com suporte a WebXR immersive-ar.",state.supported?"ok":"warn");
    updateButtons(); return state.supported;
  }

  function updateButtons(){
    const enter=$("#enterAR"); if(enter) enter.disabled=!state.supported || !!state.session;
    const exit=$("#exitAR"); if(exit) exit.disabled=!state.session;
    const mode=$("#arModeLabel"); if(mode) mode.textContent=state.mode==="lab"?"Laboratório interativo":"Somente visualização";
    const sel=$("#arSelectedLabel"); if(sel) sel.textContent=state.selected ? `Selecionado: ${state.selected}` : "Nenhum objeto selecionado";
  }

  function mat4Identity(){ return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
  function mat4Mul(a,b){ const o=new Float32Array(16); for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3]; return o; }
  function modelMatrix(x,y,z,sx,sy,sz,ry=0){ const c=Math.cos(ry),s=Math.sin(ry); return new Float32Array([c*sx,0,-s*sx,0, 0,sy,0,0, s*sz,0,c*sz,0, x,y,z,1]); }

  function compile(gl,type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function initGL(){
    const canvas=document.createElement("canvas"); canvas.id="xrCanvas"; document.body.appendChild(canvas);
    const gl=canvas.getContext("webgl",{xrCompatible:true,alpha:true,antialias:true});
    const p=gl.createProgram(); gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,VERT)); gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,FRAG)); gl.linkProgram(p);
    const vertices=new Float32Array([
      -0.5,-0.5,-0.5,  .5,-.5,-.5,  .5,.5,-.5, -.5,.5,-.5,
      -.5,-.5,.5, .5,-.5,.5, .5,.5,.5, -.5,.5,.5
    ]);
    const indices=new Uint16Array([0,1,2,0,2,3, 4,6,5,4,7,6, 0,4,5,0,5,1, 3,2,6,3,6,7, 1,5,6,1,6,2, 0,3,7,0,7,4]);
    const vb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vb); gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
    const ib=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
    state.canvas=canvas; state.gl=gl; state.program=p; state.cube={vb,ib,count:indices.length};
  }

  function box(view, projection, x,y,z,sx,sy,sz,color,ry=0){
    const gl=state.gl,p=state.program,c=state.cube; gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER,c.vb); const loc=gl.getAttribLocation(p,"aPosition"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,c.ib);
    gl.uniformMatrix4fv(gl.getUniformLocation(p,"uProjection"),false,projection);
    gl.uniformMatrix4fv(gl.getUniformLocation(p,"uView"),false,view);
    gl.uniformMatrix4fv(gl.getUniformLocation(p,"uModel"),false,modelMatrix(x,y,z,sx,sy,sz,ry));
    gl.uniform4fv(gl.getUniformLocation(p,"uColor"),color); gl.drawElements(gl.TRIANGLES,c.count,gl.UNSIGNED_SHORT,0);
  }

  function drawEsp32(view,projection,b){
    const sc=state.scale, r=state.rotation; const x=b.x,y=b.y,z=b.z;
    box(view,projection,x,y+0.004*sc,z,0.055*sc,0.008*sc,0.090*sc,[0.035,0.30,0.18,1],r);
    box(view,projection,x,y+0.011*sc,z+0.004*sc,0.020*sc,0.007*sc,0.026*sc,[0.08,0.09,0.10,1],r);
    box(view,projection,x,y+0.010*sc,z-0.031*sc,0.030*sc,0.005*sc,0.016*sc,[0.55,0.58,0.60,1],r);
    box(view,projection,x,y+0.010*sc,z+0.041*sc,0.018*sc,0.010*sc,0.010*sc,[0.65,0.68,0.70,1],r);
    for(let i=0;i<15;i++){
      const dz=(-0.038+i*0.00545)*sc;
      const dx=0.029*sc;
      box(view,projection,x-dx,y+0.009*sc,z+dz,0.003*sc,0.004*sc,0.003*sc,[0.92,0.72,0.18,1],r);
      box(view,projection,x+dx,y+0.009*sc,z+dz,0.003*sc,0.004*sc,0.003*sc,[0.92,0.72,0.18,1],r);
    }
  }

  function drawComponent(view,projection,o){
    const selected=state.selected===o.id; const glow=selected?[1,0.75,0.15,1]:null;
    if(o.kind==="led"){
      box(view,projection,o.x,o.y+0.008,o.z,0.014,0.016,0.014,glow||[0.95,0.10,0.08,1]);
      box(view,projection,o.x-0.004,o.y+0.001,o.z,0.002,0.016,0.002,[0.65,0.65,0.68,1]); box(view,projection,o.x+0.004,o.y+0.001,o.z,0.002,0.016,0.002,[0.65,0.65,0.68,1]);
    } else if(o.kind==="resistor"){
      box(view,projection,o.x,o.y+0.005,o.z,0.028,0.010,0.010,glow||[0.75,0.52,0.25,1]);
      box(view,projection,o.x-0.020,o.y+0.005,o.z,0.014,0.002,0.002,[0.72,0.72,0.75,1]); box(view,projection,o.x+0.020,o.y+0.005,o.z,0.014,0.002,0.002,[0.72,0.72,0.75,1]);
    }
  }

  function drawReticle(view,projection){ if(!state.lastHit) return; const m=state.lastHit; const x=m[12],y=m[13]+0.001,z=m[14]; box(view,projection,x,y,z,0.055,0.0015,0.055,[0.45,1.0,0.35,0.55]); }

  function renderFrame(time, frame){
    const session=frame.session; session.requestAnimationFrame(renderFrame);
    const pose=frame.getViewerPose(state.refSpace); if(!pose) return;
    if(state.hitSource){ const hits=frame.getHitTestResults(state.hitSource); state.lastHit=hits[0]?.getPose(state.refSpace)?.transform.matrix || null; }
    const gl=state.gl, layer=session.renderState.baseLayer; gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer); gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    for(const v of pose.views){ const vp=layer.getViewport(v); gl.viewport(vp.x,vp.y,vp.width,vp.height); const view=v.transform.inverse.matrix, proj=v.projectionMatrix; if(state.placed){ drawEsp32(view,proj,state.board); state.components.forEach(o=>drawComponent(view,proj,o)); } drawReticle(view,proj); }
  }

  function rayFromPose(pose){ const m=pose.transform.matrix; return { origin:[m[12],m[13],m[14]], dir:[-m[8],-m[9],-m[10]] }; }
  function hitObject(ray){
    const objs=[...(state.mode==="lab"?state.components:[]), ...(state.placed?[state.board]:[])]; let best=null,bestT=1e9;
    for(const o of objs){ const dx=o.x-ray.origin[0],dy=o.y-ray.origin[1],dz=o.z-ray.origin[2]; const t=dx*ray.dir[0]+dy*ray.dir[1]+dz*ray.dir[2]; if(t<0) continue; const px=ray.origin[0]+ray.dir[0]*t,py=ray.origin[1]+ray.dir[1]*t,pz=ray.origin[2]+ray.dir[2]*t; const d=Math.hypot(o.x-px,o.y-py,o.z-pz); const radius=o.kind==="board"?.075:.035; if(d<radius&&t<bestT){best=o;bestT=t;} }
    return best;
  }

  function placeAtHit(obj){ if(!state.lastHit) return false; obj.x=state.lastHit[12]; obj.y=state.lastHit[13]; obj.z=state.lastHit[14]; return true; }
  function onSelect(event){
    const frame=event.frame, source=event.inputSource; const rayPose=frame.getPose(source.targetRaySpace,state.refSpace); const hit=rayPose?hitObject(rayFromPose(rayPose)):null;
    if(!state.placed){ if(placeAtHit(state.board)){ state.placed=true; arrangeComponents(); setStatus("ESP32 posicionado","A placa ficou ancorada nesta sessão. Aponte/pinçe para interagir.","ok"); } return; }
    if(state.mode==="view"){ if(placeAtHit(state.board)) toast("ESP32 reposicionado na bancada"); return; }
    if(hit){ state.selected=hit.id; setStatus("Objeto selecionado",`${hit.id}. Aponte para outro ponto da bancada e pinçe/aperte novamente para mover.`,"ok"); updateButtons(); return; }
    if(state.selected){ const obj=state.selected==="ESP32"?state.board:state.components.find(x=>x.id===state.selected); if(obj&&placeAtHit(obj)){ toast(`${obj.id} movido`); state.selected=null; updateButtons(); } }
  }

  function arrangeComponents(){ if(!state.placed) return; state.components.forEach((o,i)=>{ if(o.userPlaced)return; o.x=state.board.x+0.10+(i%2)*0.055; o.y=state.board.y; o.z=state.board.z-0.03+Math.floor(i/2)*0.06; }); }
  function addComponent(kind){ const id=`${kind==="led"?"LED":"R"}${state.components.filter(x=>x.kind===kind).length+1}`; state.components.push({id,kind,x:state.board.x+0.10,y:state.board.y,z:state.board.z,userPlaced:false}); arrangeComponents(); renderComponentList(); toast(`${kind==="led"?"LED":"Resistor"} adicionado à experiência RA`); }
  function renderComponentList(){ const el=$("#arComponentList"); if(el) el.innerHTML=state.components.length?state.components.map(x=>`<span>${x.kind==="led"?"💡":"▰"} ${x.id}</span>`).join(""):"<small>Nenhum componente adicionado.</small>"; }

  async function enterAR(options={}){
    if(state.session) return true;
    state.device=options.device||"headset";
    const status=state.device==="mobile"?setMobileStatus:setStatus;
    state.mode=options.mode||$("[data-ar-mode].active")?.dataset.arMode||"view"; state.selected=null; state.placed=false;
    $$('[data-ar-mode]').forEach(btn=>btn.classList.toggle("active",btn.dataset.arMode===state.mode));
    const tools=$("#arLabTools"); if(tools) tools.hidden=state.mode!=="lab";

    // A chamada de requestSession precisa acontecer diretamente a partir do clique
    // do usuário. Por isso não aguardamos checkSupport() antes de solicitar a RA.
    if(!window.isSecureContext){
      state.supported=false; state.checked=true;
      status("HTTPS necessário",state.device==="mobile"?"Abra o CODA por HTTPS para liberar a câmera/RA do celular.":"Abra o CODA por HTTPS no óculos para iniciar a realidade aumentada.","warn");
      updateButtons(); return false;
    }
    if(!navigator.xr){
      state.supported=false; state.checked=true;
      status("WebXR não encontrado",state.device==="mobile"?"O navegador não oferece WebXR. O CODA pode usar o modo câmera como alternativa.":"Abra esta página no navegador do óculos compatível com WebXR.","warn");
      updateButtons(); return false;
    }

    try{
      status("Abrindo realidade aumentada",state.device==="mobile"?"Autorize a câmera/RA. Depois aponte o celular para a mesa.":"Autorize o passthrough se o óculos pedir. Depois olhe para a bancada.");
      if(!state.gl) initGL();
      const opts={requiredFeatures:["local-floor"],optionalFeatures:["hit-test","hand-tracking","dom-overlay"],domOverlay:{root:$("#espARPanel")}};
      // IMPORTANTE: requestSession é chamado antes de qualquer await para preservar
      // a ativação transitória gerada pelo clique no botão 🥽.
      const sessionPromise=navigator.xr.requestSession("immersive-ar",opts);
      const session=await sessionPromise; state.session=session; state.supported=true; state.checked=true;
      await state.gl.makeXRCompatible?.(); session.updateRenderState({baseLayer:new XRWebGLLayer(session,state.gl)});
      state.refSpace=await session.requestReferenceSpace("local-floor"); state.viewerSpace=await session.requestReferenceSpace("viewer");
      try{ state.hitSource=await session.requestHitTestSource({space:state.viewerSpace}); }catch{ state.hitSource=null; }
      session.addEventListener("select",onSelect); session.addEventListener("end",onEnd);
      status("RA iniciada",state.device==="mobile"?"Aponte para a mesa e toque na tela para posicionar o ESP32.":"Olhe para a bancada e faça uma pinça/clique para posicionar o ESP32.","ok"); updateButtons(); session.requestAnimationFrame(renderFrame);
      return true;
    }catch(error){
      console.error(error);
      state.checked=true; state.supported=false;
      const denied=error?.name==="NotAllowedError";
      status(denied?"Permissão necessária":"Não foi possível iniciar a RA",denied?(state.device==="mobile"?"Autorize a câmera/RA no navegador e tente novamente.":"Autorize a realidade aumentada/passthrough no navegador do óculos e toque novamente em 🥽."):(error?.message||"O navegador recusou a sessão WebXR."),"warn");
      cleanup(); return false;
    }
  }
  async function exitAR(){ try{ await state.session?.end(); }catch{} }
  function cleanup(){ state.hitSource?.cancel?.(); state.hitSource=null; state.session=null; state.refSpace=null; state.viewerSpace=null; state.lastHit=null; state.selected=null; state.canvas?.remove(); state.canvas=null; state.gl=null; updateButtons(); }
  function onEnd(){ cleanup(); setStatus("Sessão encerrada","Você pode entrar novamente quando quiser.",state.supported?"ok":"warn"); }

  function updateMobileBoard(){
    const board=$("#mobileARBoard"); if(!board) return;
    const m=state.mobile;
    board.style.left=`${m.x}%`; board.style.top=`${m.y}%`;
    board.style.transform=`translate(-50%,-50%) rotateX(62deg) rotateZ(${m.rotation}deg) scale(${m.scale})`;
  }

  function resetMobileBoard(){
    Object.assign(state.mobile,{placed:false,x:50,y:58,scale:1,rotation:0,dragging:false});
    const board=$("#mobileARBoard"), reticle=$("#mobileARReticle"), hint=$("#mobileAROverlayHint");
    if(board) board.hidden=true;
    if(reticle) reticle.hidden=false;
    if(hint) hint.textContent="Toque na mesa para colocar o ESP32";
    updateMobileBoard();
  }

  function mobilePoint(event){
    const t=event.touches?.[0]||event.changedTouches?.[0]||event;
    const stage=$("#mobileARStage"), r=stage?.getBoundingClientRect();
    if(!r) return null;
    return {x:Math.max(0,Math.min(100,(t.clientX-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(t.clientY-r.top)/r.height*100)),clientX:t.clientX,clientY:t.clientY};
  }

  function placeMobileFallback(event){
    const p=mobilePoint(event); if(!p) return;
    const m=state.mobile, board=$("#mobileARBoard"), reticle=$("#mobileARReticle"), hint=$("#mobileAROverlayHint");
    if(!m.placed){
      m.placed=true; m.x=p.x; m.y=p.y;
      if(board) board.hidden=false; if(reticle) reticle.hidden=true;
      if(hint) hint.textContent="Arraste o ESP32 • use os botões para girar e redimensionar";
      updateMobileBoard();
    }
  }

  function startMobileDrag(event){
    if(!state.mobile.placed) return;
    event.preventDefault();
    const p=mobilePoint(event); if(!p) return;
    state.mobile.dragging=true;
    state.mobile.dragDx=p.x-state.mobile.x; state.mobile.dragDy=p.y-state.mobile.y;
  }
  function moveMobileDrag(event){
    if(!state.mobile.dragging) return;
    event.preventDefault();
    const p=mobilePoint(event); if(!p) return;
    state.mobile.x=p.x-state.mobile.dragDx; state.mobile.y=p.y-state.mobile.dragDy; updateMobileBoard();
  }
  function stopMobileDrag(){ state.mobile.dragging=false; }

  async function openCameraFallback(){
    if(!navigator.mediaDevices?.getUserMedia){
      setMobileStatus("Câmera indisponível","Este navegador não permite acesso à câmera. Tente Chrome/Safari atualizado e abra o CODA por HTTPS.","warn");
      return false;
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
      state.mobile.stream=stream; state.mobile.fallback=true;
      const overlay=$("#mobileAROverlay"), video=$("#mobileARVideo");
      if(overlay){ overlay.hidden=false; overlay.setAttribute("aria-hidden","false"); }
      if(video){ video.srcObject=stream; await video.play().catch(()=>{}); }
      resetMobileBoard();
      document.documentElement.classList.add("mobile-ar-open");
      setMobileStatus("Modo câmera ativo","Toque na imagem da mesa para colocar o ESP32. Este modo funciona mesmo sem WebXR.","ok");
      return true;
    }catch(error){
      const denied=error?.name==="NotAllowedError"||error?.name==="SecurityError";
      setMobileStatus(denied?"Permissão da câmera necessária":"Não foi possível abrir a câmera",denied?"Permita o uso da câmera traseira nas permissões do navegador.":(error?.message||"Verifique a câmera e tente novamente."),"warn");
      return false;
    }
  }

  function closeMobileAR(){
    if(state.session && state.device==="mobile"){ state.session.end().catch(()=>{}); }
    state.mobile.stream?.getTracks?.().forEach(track=>track.stop());
    state.mobile.stream=null; state.mobile.fallback=false;
    const video=$("#mobileARVideo"), overlay=$("#mobileAROverlay");
    if(video) video.srcObject=null;
    if(overlay){ overlay.hidden=true; overlay.setAttribute("aria-hidden","true"); }
    document.documentElement.classList.remove("mobile-ar-open");
    resetMobileBoard();
  }

  async function enterMobileAR(){
    setMobileStatus("Abrindo RA no celular","Aponte a câmera para a mesa e permita o acesso quando solicitado.");
    // Em Android/Chrome com WebXR + ARCore, tenta RA espacial real primeiro.
    if(window.isSecureContext && navigator.xr){
      const ok=await enterAR({mode:"view",device:"mobile"});
      if(ok) return true;
    }
    // Fallback universal: câmera traseira + ESP32 manipulável na imagem.
    return openCameraFallback();
  }

  function activateMobile(){
    if(!window.isSecureContext){ setMobileStatus("HTTPS necessário","Para usar a câmera no celular, abra o CODA por HTTPS.","warn"); return; }
    if(navigator.xr) setMobileStatus("Pronto para RA","Toque em “RA no celular”. O CODA tentará RA espacial e, se necessário, usará a câmera.","ok");
    else setMobileStatus("Modo câmera disponível","Seu navegador não expõe WebXR, mas o modo câmera continua disponível.","ok");
  }

  function bind(){
    $$('[data-ar-mode]').forEach(btn=>btn.addEventListener("click",()=>{ $$('[data-ar-mode]').forEach(x=>x.classList.toggle("active",x===btn)); state.mode=btn.dataset.arMode; $("#arLabTools").hidden=state.mode!=="lab"; updateButtons(); }));
    $("#enterAR")?.addEventListener("click",enterAR); $("#exitAR")?.addEventListener("click",exitAR);
    $("#openMobileAR")?.addEventListener("click",enterMobileAR);
    $("#closeMobileAR")?.addEventListener("click",closeMobileAR);
    $("#mobileARStage")?.addEventListener("click",placeMobileFallback);
    $("#mobileARBoard")?.addEventListener("pointerdown",startMobileDrag);
    window.addEventListener("pointermove",moveMobileDrag,{passive:false}); window.addEventListener("pointerup",stopMobileDrag);
    $("#mobileARBoard")?.addEventListener("touchstart",startMobileDrag,{passive:false});
    window.addEventListener("touchmove",moveMobileDrag,{passive:false}); window.addEventListener("touchend",stopMobileDrag);
    $("#mobileARSmaller")?.addEventListener("click",()=>{state.mobile.scale=Math.max(.55,state.mobile.scale-.1);updateMobileBoard();});
    $("#mobileARLarger")?.addEventListener("click",()=>{state.mobile.scale=Math.min(2.2,state.mobile.scale+.1);updateMobileBoard();});
    $("#mobileARRotateLeft")?.addEventListener("click",()=>{state.mobile.rotation-=12;updateMobileBoard();});
    $("#mobileARRotateRight")?.addEventListener("click",()=>{state.mobile.rotation+=12;updateMobileBoard();});
    $("#mobileARReset")?.addEventListener("click",resetMobileBoard);
    $("#checkAR")?.addEventListener("click",checkSupport);
    $("#arAddLed")?.addEventListener("click",()=>addComponent("led")); $("#arAddResistor")?.addEventListener("click",()=>addComponent("resistor"));
    $("#arClearComponents")?.addEventListener("click",()=>{state.components=[];state.selected=null;renderComponentList();updateButtons();});
    $("#arRotateLeft")?.addEventListener("click",()=>state.rotation-=Math.PI/12); $("#arRotateRight")?.addEventListener("click",()=>state.rotation+=Math.PI/12);
    $("#arScaleDown")?.addEventListener("click",()=>state.scale=Math.max(.55,state.scale-.1)); $("#arScaleUp")?.addEventListener("click",()=>state.scale=Math.min(2,state.scale+.1));
    renderComponentList(); updateButtons();
    // Detecção passiva para atualizar o texto, sem ser requisito para o clique único.
    setTimeout(()=>{ if(!state.session) checkSupport(); },250);
  }
  function activate(){ if(!state.checked) checkSupport(); }
  document.addEventListener("DOMContentLoaded",bind);
  window.CodaAR={checkSupport,enterAR,exitAR,activate,enterMobileAR,closeMobileAR,activateMobile,state};
})();
