/* Build21 workspace flow: read/write, explicit continuation and independent local/file status. */
(function(){
'use strict';
const F=FacilityFaciCore,A=FacilityFaci,esc=escapeHtml;
let startVisible=true,pendingEdit=false,tracking={fileRevision:0},localCopy=null,recentCopy=null,modeBusy=false;
const active=()=>A.active;
const pendingFile=()=>active()&&(state.dirty||state.roomEditDraft||tracking.fileRevision!==state.container.revision);
function sync(){
 const modes=$('.workspaceModes'),target=isMobileLayout()&&!state.panelCollapsed?$('.sideControls'):$('.mapArea');
 if(modes&&modes.parentElement!==target)target.prepend(modes);
 document.body.classList.toggle('faci-reading',state.role!=='admin');
 document.body.classList.toggle('start-visible',startVisible);
 $('#readModeBtn').setAttribute('aria-pressed',String(state.role!=='admin'));$('#writeModeBtn').setAttribute('aria-pressed',String(state.role==='admin'));
 $('#readModeBtn').classList.toggle('active',state.role!=='admin');$('#writeModeBtn').classList.toggle('active',state.role==='admin');
 const status=$('#faciSaveState');
 status.hidden=!active();
 if(active()){
  const local=state.roomEditDraft?'편집창 입력 중 · 적용 전':state.dirty?'변경사항 · 이 기기에 아직 보관되지 않음':`브라우저 작업본 · ${fmtDateTime(state.container.updatedAt)}`;
  const file=state.roomEditDraft||state.dirty||tracking.fileRevision!==state.container.revision?'FACI 파일 · 별도 저장 필요':tracking.fileRequestedAt?'FACI 파일 · 저장 요청 완료 (다운로드 확인)':'FACI 파일 · 선택한 파일 기준';
  status.innerHTML=`<b>${esc(state.pub.settings.organization||state.currentDbName)}</b><span>${esc(local)}</span><span>${esc(file)}</span>`;
 }
 $('[data-side-tab="manage"]').hidden=state.role!=='admin';
 $('#ppkgImportBtn').hidden=active()&&state.role!=='admin';
 $('#continueOpenBtn').hidden=!active()&&!FacilityPpkgViewer.active;
 if(startVisible)$('#dataOverlay').classList.remove('hidden');
}
function enterWorkspace(){startVisible=false;$('#dataOverlay').classList.add('hidden');sync();}
async function refreshRecent(){
 try{[localCopy,recentCopy]=await Promise.all([localGet('activeFaci'),localGet('recentFaciFile')]);
  const info=[];
  if(localCopy?.text){const d=JSON.parse(localCopy.text);await F.validate(d);info.push(`<b>${esc(d.public.settings.organization||localCopy.name)}</b><br>브라우저 작업본 · ${esc(localCopy.name)} · ${esc(fmtDateTime(d.updatedAt))}<br><span class="muted">실제 파일의 최신 여부는 확인하지 않았습니다.</span>`);}else localCopy=null;
  if(recentCopy?.text){const d=JSON.parse(recentCopy.text);await F.validate(d);info.push(`최근 연 파일의 보관본 · ${esc(recentCopy.name)}<br><span class="muted">파일 선택 당시 내용입니다. 디스크 파일과 자동 동기화하지 않습니다.</span>`);}else recentCopy=null;
  $('#recentFaciInfo').innerHTML=info.join('<hr>');
 }catch{localCopy=null;recentCopy=null;$('#recentFaciInfo').textContent='보관 자료를 확인하지 못했습니다. 정상 FACI 파일을 선택하세요.';}
 $('#resumeLocalBtn').hidden=!localCopy;$('#reopenRecentBtn').hidden=!recentCopy;sync();
}
function choose(title,body,buttons){return new Promise(resolve=>{
 openModal(title,body,buttons.map(([id,label,primary])=>`<button class="btn ${primary?'primary':''}" id="${id}">${label}</button>`).join(''));
 let done=false;const finish=value=>{if(done)return;done=true;closeModal();resolve(value);};
 for(const [id]of buttons)$('#'+id).onclick=()=>finish(id);
 $('.modalClose').onclick=()=>finish(null);$('.modalBackdrop').addEventListener('pointerdown',e=>{if(e.target===e.currentTarget){e.stopImmediatePropagation();finish(null);}},{capture:true});
 });}
async function approveReplacement(){
 if(!active()||!pendingFile())return true;
 const choice=await choose('현재 FACI를 바꿀까요?',`<p>${state.dirty||state.roomEditDraft?'아직 이 기기에 보관하지 않은 편집 내용이 있습니다. 문서를 바꾸면 이 내용은 사라집니다.':'브라우저 작업본이 있습니다. FACI 파일로 별도 보관하지 않은 내용이 있을 수 있습니다.'}</p><p class="smallText muted">취소한 뒤 FACI 파일을 저장하거나, 현재 내용을 떠나 다른 문서로 진행할 수 있습니다. 브라우저 작업본은 공식 최신 파일을 의미하지 않습니다.</p>`,[['faciReplaceCancel','취소 후 저장'],['faciReplaceContinue','현재 문서 떠나기']]);
 return choice==='faciReplaceContinue';
}
async function setMode(mode){
 if(modeBusy)return false;if(!active()){toast('FACI 문서를 먼저 열어 주세요.');return false;}
 if(mode==='write'){
  enterWorkspace();if(state.role!=='admin')openAdminAuth();sync();return true;
 }
 if(state.role!=='admin'){sync();return true;}
 modeBusy=true;
 try{
  if(state.roomEditDraft){const c=await choose('입력 중인 내용을 닫을까요?','<p>편집창에 적용하지 않은 입력이 있습니다. 계속하면 이 입력은 취소됩니다.</p>',[['faciDraftCancel','계속 수정'],['faciDraftLeave','입력 취소 후 계속']]);if(c!=='faciDraftLeave')return false;state.roomEditDraft=null;}
  if(pendingFile()){
   const c=await choose('읽기 모드로 전환',`<p>현재 내용은 ${state.dirty?'아직 브라우저 작업본에도 보관하지 않았습니다.':'브라우저 작업본에 보관되어 있습니다.'} FACI 파일로도 보관해 두세요.</p><p class="smallText muted">파일 저장은 다운로드를 요청합니다. 실제 파일이 저장됐는지는 다운로드 목록에서 확인하세요.</p>`,[['faciModeCancel','계속 수정'],['faciModeLocal','이 기기에 보관 후 읽기'],['faciModeFile','FACI 파일 저장 후 읽기',true]]);
   if(c==='faciModeFile'){if(!(await A.exportFaci()))return false;}else if(c==='faciModeLocal'){if(state.dirty&&!(await A.save({silent:true})))return false;}else return false;
  }
  // Keep camera, building/drawing and selection; only drop authenticated session and edit tools.
  state.role='viewer';state.identity=null;state.keys={};state.sec={roomSecurity:{}};state.adm={accounts:[],changeLog:[]};state.panelMode='browse';state.editMode=false;state.selectedElement=null;
  updateAuthUi();if(sidePanelTab==='manage')applySidePanelTab('query');renderAll();sync();return true;
 }finally{modeBusy=false;}
}
const originalUpdate=updateAuthUi;
updateAuthUi=function(){originalUpdate();sync();};
const originalPanel=setPanelCollapsed;setPanelCollapsed=function(...args){const result=originalPanel(...args);sync();return result;};
window.addEventListener('resize',()=>requestAnimationFrame(sync));
const originalApply=applySidePanelTab;
applySidePanelTab=function(tab,options){return originalApply(tab==='manage'&&state.role!=='admin'?'query':tab,options);};
// Existing credential identity and recovery owner remain intact. Manager tier is presented as top administrator.
const oldAccountHtml=accountManagerHtml;
accountManagerHtml=function(){
 let html=oldAccountHtml();if(!active()||!html)return html;
 html=html.replace(/<div class="manageNote">[\s\S]*?<\/div>/,'<div class="manageNote">관리자는 시설정보를 수정합니다. 최상위 관리자는 계정·권한도 관리합니다. 기존 계정 ID와 복구 소유권은 유지하며 복구키 발급은 원래 복구 소유자에게만 허용됩니다.</div>');
 html=html.replace(/<label class="permissionCheck">[\s\S]*?<\/label>/,'').replace('<option value="secure">','<option value="superadmin">최상위 관리자</option><option value="secure">');
 const holder=document.createElement('div');holder.innerHTML=html;
 holder.querySelectorAll('.accountRow').forEach(row=>{const id=row.querySelector('.accountReset')?.dataset.id,a=accountById(id);if(a?.canManageAdmins){const badge=row.querySelector('.badge');if(badge)badge.textContent='최상위 관리자';}row.querySelector('.accountManageToggle')?.remove();});
 return holder.innerHTML;
};
addAccount=async function(){
 if(!currentCanManageAdmins())return;
 const name=$('#newAccountName')?.value.trim(),chosen=$('#newAccountLevel')?.value,password=$('#newAccountPassword')?.value;
 if(!name||!password){toast('이름과 암호를 입력해 주세요.');return;}
 const docId=state.container.id,identity=state.identity?.id;
 if(await passwordAlreadyUsed(password)){toast('이미 다른 계정에서 사용하는 암호입니다.');return;}
 const id=uid('account'),level=chosen==='secure'?'secure':'admin',keys={secure:state.keys.secure};if(level==='admin')keys.admin=state.keys.admin;
 const cred=await createCredentialRecord({id,password,keys});
 if(!currentCanManageAdmins()||docId!==state.container.id||identity!==state.identity?.id)return;
 state.container.crypto.credentials.push(cred);state.adm.accounts.push({id,displayName:name,level,canManageAdmins:chosen==='superadmin',active:true,createdAt:new Date().toISOString()});logChange(name,'계정 추가',chosen==='superadmin'?'최상위 관리자':level==='admin'?'관리자':'잠금정보 확인');setDirty();renderDetails();
};
// Every business mutation entry validates live write authority, including calls from old UI bindings.
for(const name of ['beginRoomEdit','commitRoomEdit','openRoomEditor','openEquipmentModal','openConstructionModal','toggleAccount','toggleManagePermission','openResetPassword','saveDistributionSettings']){
 const original=window[name];if(typeof original==='function')window[name]=function(...args){if(active()&&state.role!=='admin'){toast('수정 모드에서 관리자 인증이 필요합니다.');return;}return original.apply(this,args);};
}
const oldLog=logChange;
logChange=function(target,action,detail=''){
 if(!active())return oldLog(target,action,detail);if(state.role!=='admin')return;
 const account=accountById(state.identity?.id),shared=!!account?.shared;
 state.adm.changeLog.push({id:uid('log'),at:new Date().toISOString(),actorId:state.identity?.id||'',actor:shared?'공유 관리자 (개별 변경자 미확인)':state.identity?.displayName||'관리자',...(shared?{actorKind:'shared-credential'}:{}),target,action,detail});
};
function onActivate(doc,options){tracking=options.tracking?{...options.tracking}:{fileRevision:options.fromFile?doc.revision:0};enterWorkspace();}
async function onFileRequested(doc){
 tracking={fileRevision:doc.revision,fileRequestedAt:new Date().toISOString()};sync();
 // Update only metadata on the same saved document/revision. A late download must never overwrite a new active document.
 const snapshot={...tracking};
 try{const db=await openLocalDatabase();await new Promise((resolve,reject)=>{const tx=db.transaction(LOCAL_STORE,'readwrite'),store=tx.objectStore(LOCAL_STORE),req=store.get('activeFaci');req.onsuccess=()=>{const record=req.result;if(!record?.text)return;const saved=JSON.parse(record.text);if(saved.id===doc.id&&saved.revision===doc.revision)store.put({...record,tracking:snapshot},'activeFaci');};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error('상태 기록 실패'));};});}catch{toast('파일 저장은 요청했지만 브라우저 작업본 상태를 기록하지 못했습니다.');}
}
function afterFileOpen(){enterWorkspace();refreshRecent();if(pendingEdit){pendingEdit=false;setMode('write');}}
function offerFirstSave(){
 choose('첫 FACI 파일 보관','<p>복구키와 FACI 파일은 서로 다른 곳에 보관하세요. 빈 FACI도 파일로 저장한 뒤 도면을 추가할 수 있습니다.</p>',[['faciFirstLater','나중에 저장'],['faciFirstSave','FACI 파일 저장',true]]).then(c=>{if(c==='faciFirstSave')A.exportFaci();});
}
window.FacilityWorkspace={sync,enterWorkspace,setMode,approveReplacement,offerFirstSave,afterFileOpen,onActivate,onFileRequested,
 get startVisible(){return startVisible;},get filePending(){return !!pendingFile();},get tracking(){return{...tracking};},
 onDirty(){sync();},onLocalSaved(){sync();},persistenceState(){return{...tracking};}};
document.addEventListener('input',e=>{if(e.target.matches?.('.draftField'))sync();});
$('#readModeBtn').onclick=()=>setMode('read');$('#writeModeBtn').onclick=()=>setMode('write');
$('#workspaceHomeBtn').onclick=async()=>{if(!(await setMode('read'))&&active())return;startVisible=true;sync();refreshRecent();};
$('#continueOpenBtn').onclick=()=>{pendingEdit=false;enterWorkspace();};
$('#startEditBtn').onclick=()=>{if(active())setMode('write');else{pendingEdit=true;$('#dbFileInput').click();}};
$('#dbFileInput').addEventListener('cancel',()=>{pendingEdit=false;});
$('#openDbBtn').onclick=()=>{pendingEdit=false;$('#dbFileInput').click();};
// The file picker itself never discards a document. Replacement is confirmed only after a valid file is staged.
importReplacementDb=()=>{pendingEdit=false;$('#dbFileInput').click();};$('#changeDbBtn').onclick=importReplacementDb;
$('#resumeLocalBtn').onclick=async()=>{pendingEdit=false;if(localCopy?.text)await loadDbText(localCopy.text,localCopy.name,{persist:false,fromFile:false,tracking:localCopy.tracking});};
$('#reopenRecentBtn').onclick=async()=>{pendingEdit=false;if(recentCopy?.text)await loadDbText(recentCopy.text,recentCopy.name,{fromFile:true});};
const localButton=document.createElement('button');localButton.id='faciLocalSaveBtn';localButton.className='btn fullBtn adminOnly';localButton.textContent='이 기기에 작업본 보관';localButton.onclick=()=>A.save();$('#sideSaveBtn').after(localButton);
window.addEventListener('beforeunload',e=>{if(pendingFile()||[...document.querySelectorAll('#modalHost input')].some(el=>el.id.startsWith('faci')&&el.value)){e.preventDefault();e.returnValue='';}});
// Mobile browsers may skip beforeunload. Attempt encrypted local checkpoint while hidden; never store passwords/keys.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&active()&&state.role==='admin'&&state.dirty)A.save({silent:true});});
sync();refreshRecent();
})();
