/* FACI document controller; existing drawing and business UI remain in place. */
(function(){
'use strict';
const F=window.FacilityFaciCore,P=window.FacilityPpkg,V=window.FacilityPpkgViewer,esc=escapeHtml;
const ACTIVE='activeFaci',PREVIOUS='previousFaci';
const old={detailHtml,detailTabHtml,roomEditHtml,readDraftField,accountManagerHtml,toggleAccount,toggleManagePermission,openResetPassword,handleAdminButton,handleSecureButton,prepareOfflineUse,cachedFacilityDataReady};
let lastGood=null,saving=false,loading=false,generation=0,editSerial=0;
const originalSetDirty=setDirty;
setDirty=function(value=true){if(value)editSerial++;originalSetDirty(value);};
const active=()=>state.container?.format==='FACI';
const area=n=>n==null?'미입력':`${Number(n).toFixed(2)}㎡`;
function requireAdmin(){if(!active()||state.role!=='admin')throw new Error('FACI 관리자 인증이 필요합니다.');}
function recordFor(space){return state.pub?.spaces?.find(r=>r.spaceUuid===space?.spaceUuid)||null;}
function publicView(pub){
 Object.defineProperty(pub,'buildings',{configurable:true,enumerable:false,get:()=>V.model?.buildings.map(b=>({...b,floors:b.drawings.map(d=>V.getView(d.id))}))||[]});
 return pub;
}
function decorate(view){
 if(!active())return view;
 view.rooms=view.rooms.map(drawingRoom=>{
  const record=recordFor(drawingRoom._ppkg);if(!record)return drawingRoom;
  // Business edits write to the record; immutable drawing geometry is provided only as a view.
  return new Proxy(record,{
   get(target,k){if(k==='geometry')return drawingRoom.geometry;if(k==='_ppkg')return drawingRoom._ppkg;return Reflect.get(target,k);},
   set(target,k,value){if(['geometry','_ppkg','id','spaceUuid','drawingLink'].includes(k))return true;return Reflect.set(target,k,value);},
   ownKeys(target){return [...Reflect.ownKeys(target),'geometry'];},
   getOwnPropertyDescriptor(target,k){if(k==='geometry')return{configurable:true,enumerable:true,value:drawingRoom.geometry,writable:false};return Reflect.getOwnPropertyDescriptor(target,k);}
  });
 });
 view.equipment=state.pub.equipmentByDrawing[view.id]||[];
 return view;
}
const storage={async write(doc,previous){
 const db=await openLocalDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(LOCAL_STORE,'readwrite'),store=tx.objectStore(LOCAL_STORE);
  if(previous)store.put({name:'previous.faci',text:JSON.stringify(previous)},PREVIOUS);
  store.put({name:state.currentDbName||'FacilityManager.faci',text:JSON.stringify(doc)},ACTIVE);
  tx.oncomplete=()=>{db.close();resolve();};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error||new Error('로컬 저장을 완료하지 못했습니다.'));};
 });
}};
async function activateDocument(doc,name,{keys=null,secure=null,admin=null,dirty=false}={}){
 await F.validate(doc);
 generation++;state.container=F.clone(doc);state.pub=publicView(F.clone(doc.public));state.currentDbName=name||'FacilityManager.faci';
 state.keys=keys||{};state.sec=secure||{roomSecurity:{}};state.adm=admin||{accounts:[],changeLog:[]};
 const owner=admin?.accounts.find(a=>a.id===doc.crypto.ownerId);
 state.role=keys?'admin':'viewer';state.identity=owner?{id:owner.id,displayName:owner.displayName,canManageAdmins:true}:null;
 state.roomEditDraft=null;state.panelMode='browse';state.selectedElement=null;state.selectedRoomIds.clear();state.undo=[];state.redo=[];state.editMode=false;
 lastGood=F.clone(doc);$('#floorSvg').innerHTML='';V.setViewAdapter(decorate);V.setSources(doc.drawings.sources);
 const view=doc.public.settings.view;
 if(view&&V.model.drawings.has(view.drawingId)){state.buildingId=view.buildingId;changeFloor(view.drawingId);if(currentFloor()?.rooms.some(r=>r.id===view.roomId))state.selectedRoomIds=new Set([view.roomId]);}
 setDirty(dirty);$('#dataOverlay').classList.add('hidden');updateAuthUi();populateSelectors();renderAll();syncUi();refreshOfflineReadyUi();refreshLatestDbStatus();
}
function syncUi(){
 $('#createFaciBtn').textContent=active()?'새 FACI 문서':'FACI 새로 만들기';
 $('#recoverFaciBtn').disabled=!active();$('#exportPpkgBtn').disabled=!active()||!state.container.drawings.sources.length;
 if(!active())return;
 $('#ppkgReturnBtn').hidden=true;
 $('#rightDataStamp').textContent=fmtDateTime(state.container.updatedAt);
 const stat=$('#ppkgStatus'),d=V.model?.drawings.get(state.floorId);
 stat.innerHTML=`<strong>FACI 관리</strong> · 건물 ${V.model?.buildings.length||0} · 도면 ${V.model?.drawings.size||0} · 공간 ${state.pub.spaces.length}<br>물리 층: ${esc(d?.level?.name||'미지정')} · Revision ${state.container.revision}${state.dirty?' · 저장 필요':''}<br>${state.role==='viewer'?'일반 조회 · 보호정보는 인증 후 확인':state.role==='admin'?'관리자 인증됨':'잠금정보 확인 권한'}`;
 $('#offlineReadyNote').textContent='앱 파일(캐시)과 암호화된 FACI 문서(로컬 저장소)를 이 기기에 준비합니다. 다른 기기로 옮길 때는 FACI 파일을 저장해 전달하세요. 브라우저 저장소를 삭제하면 다시 준비해야 합니다.';
 $('#facmapImportBtn')?.closest('.panelSection')?.classList.add('hidden');
 $('#constructionBtn')?.closest('.panelSection')?.classList.remove('ppkg-legacy-action');
 $('#dbStatus').textContent=`${state.currentDbName} · FACI v1 · Revision ${state.container.revision}`;
}
async function loadText(text,name='시설관리.faci',{persist=true}={}){
 if(saving||loading)throw new Error('저장 또는 열기가 진행 중입니다. 완료 후 다시 선택해 주세요.');
 loading=true;
 try{const incoming=JSON.parse(text);await F.validate(incoming);
  if(persist)await storage.write(incoming,lastGood); // Failure leaves the currently open document intact.
  await activateDocument(incoming,name);
 }finally{loading=false;}
}
async function save(options={}){
 if(saving||loading)return false;
 try{
  requireAdmin();saving=true;const token=generation,serial=editSerial;
  const pub=F.clone(state.pub);pub.settings.view={buildingId:state.buildingId,drawingId:state.floorId,roomId:[...state.selectedRoomIds][0]||null};
  const next=await F.seal(state.container,pub,F.clone(state.sec),F.clone(state.adm),state.keys);await F.validate(next);
  if(token!==generation)throw new Error('저장 중 관리 문서가 바뀌었습니다.');
  await storage.write(next,lastGood);
  const stillDirty=serial!==editSerial,working=stillDirty?{crypto:state.container.crypto,drawings:state.container.drawings,history:state.container.history}:null;
  state.container=next;if(working)Object.assign(state.container,working);lastGood=F.clone(next);state.pub.settings=F.clone(next.public.settings);setDirty(stillDirty);syncUi();
  if(!options.silent)toast('FACI를 이 기기에 저장했습니다. 파일 저장으로 다른 기기에 전달할 수 있습니다.');return true;
 }catch(e){toast('저장하지 못했습니다. 기존 정상 데이터는 유지됩니다: '+e.message);return false;}
 finally{saving=false;}
}
async function exportFaci(){
 if(saving||loading){toast('저장 또는 열기가 진행 중입니다. 완료 후 파일 저장을 눌러 주세요.');return;}
 if(!active()){toast('먼저 FACI 문서를 만들거나 열어 주세요.');return;}
 if(state.dirty&&!(await save({silent:true})))return;
 if(state.dirty){toast('저장 중 새 변경사항이 생겼습니다. 한 번 더 저장해 주세요.');return;}
 try{await F.validate(state.container);downloadBlob(new Blob([JSON.stringify(state.container)],{type:'application/json'}),exportDbFileName());toast('FACI 파일 저장을 요청했습니다. 브라우저 다운로드 목록을 확인해 주세요.');}catch(e){toast(e.message);}
}
function recoveryDialog(token){
 const doc=state.container,text=`FACI-RECOVERY-1\nDocument: ${doc.id}\nOwner: ${doc.crypto.ownerId}\nKey: ${token}\n`;
 openModal('최상위 관리자 복구키',`<p>최상위 관리자만 보관하세요. FACI 파일과 분리해 보관하고 다른 사용자에게 전달하지 마세요.</p><p class="smallText muted">다른 사용자는 계정관리에서 다시 생성합니다. 이 키를 가진 사람은 최상위 관리자를 복구할 수 있습니다. 새 복구키는 새 FACI를 저장한 파일에 적용됩니다.</p><textarea id="faciRecoveryText" readonly aria-label="최상위 관리자 복구키">${esc(text)}</textarea>`,'<button class="btn" id="faciRecoveryClose">닫기</button><button class="btn primary" id="faciRecoveryDownload">복구키 별도 저장</button>');
 $('#faciRecoveryText').style.cssText='width:100%;min-height:125px';$('#faciRecoveryClose').onclick=closeModal;
 $('#faciRecoveryDownload').onclick=()=>downloadBlob(new Blob([text],{type:'text/plain'}),`FACI_Recovery_${doc.id}.txt`);
}
function createUi(){
 if(saving||loading){toast('진행 중인 저장 또는 열기가 끝난 뒤 다시 시도해 주세요.');return;}
 if(state.dirty&&!confirm('저장되지 않은 변경사항이 있습니다. 새 FACI를 만들기 전에 현재 파일을 저장했는지 확인해 주세요. 계속할까요?'))return;
 openModal('학교 전체 FACI 만들기',`${field('학교명','faciOrganization','')}${field('최상위 관리자 이름','faciOwnerName','')}${field('관리자 암호','faciOwnerPassword','','password')}${field('암호 확인','faciOwnerPassword2','','password')}<p class="smallText muted">현재 열린 PPKG 도면을 포함합니다. 일반 시설정보는 인증 없이 조회하고, 출입정보·계정·관리자 기록은 암호화합니다. 암호만으로 사용자를 구분하며 빈 암호·중복 암호는 허용하지 않습니다.</p><div id="faciCreateError" role="alert"></div>`,'<button class="btn" id="faciCreateCancel">취소</button><button class="btn primary" id="faciCreateConfirm">FACI 만들기</button>');
 $('#faciCreateCancel').onclick=closeModal;
 $('#faciCreateConfirm').onclick=async()=>{
  const button=$('#faciCreateConfirm');button.disabled=true;loading=true;
  try{
   if($('#faciOwnerPassword').value!==$('#faciOwnerPassword2').value)throw new Error('암호 확인이 일치하지 않습니다.');
   const result=await F.create({sources:V.sources,organization:$('#faciOrganization').value.trim(),ownerName:$('#faciOwnerName').value,password:$('#faciOwnerPassword').value});
   await activateDocument(result.document,'FacilityManager.faci',{...result,dirty:true});closeModal();recoveryDialog(result.recoveryKey);
  }catch(e){$('#faciCreateError').textContent=e.message;button.disabled=false;}finally{loading=false;}
 };
}
function recoverUi(){
 if(!active()||saving||loading)return;
 if(state.dirty&&!confirm('최상위 관리자 복구는 마지막 정상 저장본을 기준으로 합니다. 저장하지 않은 변경사항을 버리고 계속할까요?'))return;
 openModal('최상위 관리자 복구',`<p class="smallText muted">이 FACI 문서의 최상위 관리자 복구키를 사용합니다. 다른 사용자 계정은 복구키로 복구하지 않습니다.</p><div class="field"><label>복구키 또는 복구키 파일 내용</label><textarea id="faciRecoverKey"></textarea></div>${field('새 관리자 암호','faciRecoverPassword','','password')}${field('새 암호 확인','faciRecoverPassword2','','password')}<div id="faciRecoverError" role="alert"></div>`,'<button class="btn" id="faciRecoverCancel">취소</button><button class="btn primary" id="faciRecoverGo">최상위 관리자 복구</button>');
 $('#faciRecoverCancel').onclick=closeModal;$('#faciRecoverGo').onclick=async()=>{
  const button=$('#faciRecoverGo');button.disabled=true;loading=true;
  try{if($('#faciRecoverPassword').value!==$('#faciRecoverPassword2').value)throw new Error('새 암호 확인이 일치하지 않습니다.');const r=await F.recover(lastGood,$('#faciRecoverKey').value,$('#faciRecoverPassword').value);await activateDocument(r.document,state.currentDbName,{...r,dirty:true});recoveryDialog(r.recoveryKey);}catch(e){$('#faciRecoverError').textContent='복구할 수 없습니다. 복구키·암호·파일을 확인해 주세요. '+e.message;button.disabled=false;}finally{loading=false;}
 };
}
function exportPpkgUi(){
 if(!active())return;
 try{
  const sources=F.exportSources(state.container);
  openModal('도면만 PPKG로 내보내기','<p class="smallText muted">관리정보·계정·인증·보호정보는 포함하지 않습니다. 여러 원본은 원본 패키지별로 저장하여 ID·범위·리비전을 보존합니다.</p>'+sources.map((s,i)=>`<button class="btn fullBtn" data-ppkg-export="${i}">${esc(s.name)}</button>`).join(''),'<button class="btn" id="faciPpkgClose">닫기</button>');
  $('#faciPpkgClose').onclick=closeModal;$$('[data-ppkg-export]').forEach(b=>b.onclick=()=>{const s=sources[Number(b.dataset.ppkgExport)];downloadBlob(new Blob([JSON.stringify(s.document,null,2)],{type:'application/json'}),s.name.replace(/\.ppkg$/i,'')+'.ppkg');});
 }catch(e){toast(e.message);}
}
function renderDetails(){
 if(state.panelMode==='accountManage'&&currentCanManageAdmins()){$('#desktopDetail').innerHTML=accountManagerHtml();$('#mobileDetail').innerHTML='';attachDetailEvents();bindOwnerActions();applySidePanelTab(sidePanelTab,{persist:false});return;}
 const room=selectedRoom();
 const html=room?(state.roomEditDraft?roomEditHtml(room):detailHtml(room)):'<div class="detailEmpty"><div><b>도면에서 공간을 선택해 주세요.</b><p class="smallText">조회 패널에서 PPKG 도면을 추가할 수 있습니다.</p></div></div>';
 $('#desktopDetail').innerHTML=html;$('#mobileDetail').innerHTML=html;$('#mobileSheetTitle').textContent=room?(room.name||room._ppkg?.object.name||'공간'):'FACI 공간 관리';$('#mobileSheetSub').textContent=room?area(room.areaM2):'';attachDetailEvents();applySidePanelTab(sidePanelTab,{persist:false});syncUi();
}
detailHtml=function(r){
 if(!active())return old.detailHtml(r);
 const tabs=[['basic','기본'],['access','출입'],['fire','소방·방재'],['equipment','설비'],['construction','공사 이력'],['assets','재산']];
 return `<div class="detailHeader"><div class="detailHeaderTop"><div><div class="detailTitle">${esc(r.no||r.name||r._ppkg?.object.name||'공간')}</div><div class="detailSub">등록 ${area(r.areaM2)} · 도면 ${area(r._ppkg?.object.areaM2)}</div></div><div class="spacer"></div>${state.role==='admin'&&r.spaceUuid?'<button class="btn small editRoomBtn">편집</button>':''}</div><div class="tabs">${tabs.map(([k,t])=>`<button class="tab ${state.detailTab===k?'active':''}" data-tab="${k}">${t}</button>`).join('')}</div></div><div class="detailBody">${detailTabHtml(r)}</div>`;
};
detailTabHtml=function(r){
 if(!active()||state.detailTab!=='basic')return old.detailTabHtml(r);
 const values=[['학교 호실코드',r.roomCode],['실제 호실번호',r.no],['호실명',r.name],['호실약칭',r.shortName],['호실용도',r.usage],['시설구분',r.facilityClass],['관리부서',r.department],['수업사용부서',r.teachingDepartment],['배정',r.assignee],['수용인원',r.capacity],['학교 등록 면적',area(r.areaM2)],['등록 면적(평)',r.areaPyeong],['도면 제공 면적',area(r._ppkg?.object.areaM2)],['기하 계산 면적',area(P.polygonAreaM2(r._ppkg?.object.polygon))],['사용유무',r.inUse==null?'미입력':r.inUse?'사용':'미사용'],['비고',r.notes]];
 return `<dl class="infoGrid">${values.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v==null||v===''?'—':v)}</dd>`).join('')}</dl><details class="ppkg-link-info"><summary>도면 공간 연결</summary>${esc(r.spaceUuid||'UUID 없음 · 업무 연결 불가')}</details>`;
};
roomEditHtml=function(r){
 const html=old.roomEditHtml(r);if(!active()||state.detailTab!=='basic')return html;
 const d=state.roomEditDraft.room,extra=`${draftInput('학교 호실코드','room','roomCode',d.roomCode)}${draftInput('호실약칭','room','shortName',d.shortName)}${draftInput('시설구분','room','facilityClass',d.facilityClass)}${draftInput('수업사용부서','room','teachingDepartment',d.teachingDepartment)}${draftInput('수용인원','room','capacity',d.capacity,'number','optionalNumber')}${draftInput('학교 등록 면적(평)','room','areaPyeong',d.areaPyeong,'number','optionalNumber')}${draftSelect('사용유무','room','inUse',['미입력','사용','미사용'],d.inUse==null?'미입력':d.inUse?'사용':'미사용','inUse')}<p class="smallText muted">일반 업무 메모·담당자 정보는 인증 없이 조회할 수 있습니다. 민감한 출입 메모는 출입 탭에 입력하세요.</p>`;
 return html.replace('<div class="inlineEditBar">',`<div class="editGrid">${extra}</div><div class="inlineEditBar">`).replace('data-key="areaM2" data-type="number"','data-key="areaM2" data-type="optionalNumber"');
};
readDraftField=function(el){if(active()&&state.roomEditDraft&&el.dataset.scope==='room'){const k=el.dataset.key;if(el.dataset.type==='optionalNumber'){state.roomEditDraft.room[k]=el.value===''?null:Number(el.value);return;}if(el.dataset.type==='inUse'){state.roomEditDraft.room[k]=el.value==='미입력'?null:el.value==='사용';return;}}return old.readDraftField(el);};
function showQuick(room,e){
 const el=$('#roomQuickPopover');if(!room||!state.panelCollapsed)return;
 el.innerHTML=`<div class="quickTitle">${esc(room.no||room.name||room._ppkg?.object.name||'공간')}</div><div class="quickSub">등록 ${area(room.areaM2)} · 도면 ${area(room._ppkg?.object.areaM2)}</div><div class="quickMeta"><span>관리부서</span><b>${esc(room.department||'—')}</b></div><div class="quickActions"><button class="btn small primary" id="quickOpenDetail">상세 정보</button></div>`;el.classList.remove('hidden');const[x,y]=roomQuickPosition(room,e);requestAnimationFrame(()=>{const r=el.getBoundingClientRect();el.style.left=Math.max(8,Math.min(innerWidth-r.width-8,x+14))+'px';el.style.top=Math.max(8,Math.min(innerHeight-r.height-8,y+14))+'px';});$('#quickOpenDetail').onclick=()=>{setPanelCollapsed(false);applySidePanelTab('query');renderDetails();};
}
function bindOwnerActions(){const btn=$('#faciReissueRecovery');if(btn)btn.onclick=async()=>{if(state.identity?.id!==state.container.crypto.ownerId)return;const next=F.clone(state.container),token=await F.recoveryWrap(next,state.keys);state.container.crypto.recovery=next.crypto.recovery;setDirty();recoveryDialog(token);};}
accountManagerHtml=function(){let html=old.accountManagerHtml();if(!active()||!html)return html;if(state.identity?.id===state.container.crypto.ownerId)html=html.replace('<div class="manageBody">','<div class="manageBody"><div class="manageCard"><b>최상위 관리자 복구</b><p class="smallText muted">복구키는 최상위 관리자만 보관합니다. 다른 계정은 계정관리에서 다시 생성합니다.</p><button class="btn fullBtn" id="faciReissueRecovery">최상위 관리자 복구키 재발급</button></div>');return html.replaceAll('암호 재설정','암호 변경 / 계정 재생성');};
toggleAccount=async function(accountId){if(active()&&(accountId===state.container.crypto.ownerId||accountById(accountId)?.replacedBy)){toast('최상위 관리자 또는 교체된 과거 계정은 비활성/재활성화할 수 없습니다.');return;}return old.toggleAccount(accountId);};
toggleManagePermission=async function(accountId){if(active()&&accountId===state.container.crypto.ownerId){toast('최상위 관리자 권한은 유지됩니다.');return;}return old.toggleManagePermission(accountId);};
openResetPassword=function(accountId){
 if(!active()||accountId===state.container.crypto.ownerId)return old.openResetPassword(accountId);
 const account=accountById(accountId);if(!currentCanManageAdmins()||!account||account.replacedBy)return;
 if(accountId===state.identity?.id){toast('본인 계정의 재생성은 다른 계정관리자에게 요청해 주세요.');return;}
 openModal('사용자 계정 다시 생성',`<p>${esc(account.displayName)}의 과거 계정은 비활성으로 보존하고 새 계정을 만듭니다.</p>${field('새 암호','faciRecreatePassword','','password')}${field('새 암호 확인','faciRecreatePassword2','','password')}<div id="faciRecreateError" role="alert"></div>`,'<button class="btn" id="faciRecreateCancel">취소</button><button class="btn primary" id="faciRecreateGo">계정 다시 생성</button>');
 $('#faciRecreateCancel').onclick=closeModal;$('#faciRecreateGo').onclick=async()=>{try{const password=$('#faciRecreatePassword').value;if(!password||password!==$('#faciRecreatePassword2').value)throw new Error('암호 확인을 점검해 주세요.');if(await passwordAlreadyUsed(password))throw new Error('이미 사용하는 암호입니다.');const newId=uid('account'),keys={secure:state.keys.secure};if(account.level==='admin')keys.admin=state.keys.admin;const c=await createCredentialRecord({id:newId,password,keys});state.container.crypto.credentials=state.container.crypto.credentials.filter(v=>v.id!==accountId);account.active=false;account.replacedBy=newId;state.adm.accounts.push({...F.clone(account),id:newId,active:true,replacedBy:null,createdAt:new Date().toISOString()});state.container.crypto.credentials.push(c);logChange(account.displayName,'계정 다시 생성','과거 계정 기록 보존');setDirty();closeModal();renderDetails();}catch(e){$('#faciRecreateError').textContent=e.message;}};
};
authenticateCredential=(password,purpose)=>F.authenticate(state.container,password,purpose);
createCredentialRecord=options=>F.credential(state.container,options);
passwordAlreadyUsed=(password,exclude='')=>F.passwordUsed(state.container,password,exclude);
decryptSection=(name,key)=>F.decryptSection(state.container,name,key);
handleAdminButton=function(){if(!active()){toast('FACI 문서를 먼저 열어 주세요.');return;}if(state.role==='admin'&&state.dirty){if(!confirm('저장되지 않은 변경사항을 버리고 관리자 모드를 종료할까요?'))return;activateDocument(lastGood,state.currentDbName).catch(e=>toast(e.message));return;}return old.handleAdminButton();};
handleSecureButton=function(){if(!active()){toast('FACI 문서를 먼저 열어 주세요.');return;}return old.handleSecureButton();};
saveDatabase=options=>save(typeof options==='boolean'?{silent:options}:options||{});
exportDatabase=exportFaci;
exportDbFileName=function(){return(state.currentDbName||'FacilityManager.faci').replace(/\.[^.]*$/,'').replace(/[^A-Za-z0-9._가-힣-]/g,'_')+'.faci';};
loadDbText=async function(text,name,options){try{await loadText(text,name,options);}catch(e){openModal('FACI를 열지 못했습니다',`<p>${esc(e.message)}</p><p class="smallText muted">현재 문서와 기존 정상 저장본은 유지됩니다.</p>`,'<button class="btn primary" id="faciLoadErrorClose">확인</button>');$('#faciLoadErrorClose').onclick=closeModal;}};
loadContainer=async function(doc,name){await loadText(JSON.stringify(doc),name);};
currentDbId=()=>active()?state.container.id:'';
latestDbPayload=function(){if(!active())throw new Error('FACI 문서가 없습니다.');return{format:'FACILITYMANAGER-LATEST-DB',schemaVersion:1,databaseId:state.container.id,revision:state.container.revision,baselineDate:state.container.updatedAt,updatedAt:state.container.updatedAt,appVersion:VERSION,appBuild:BUILD};};
persistCurrentContainer=async function(){if(!active())return;if(state.dirty){if(!(await save({silent:true})))throw new Error('먼저 관리자 권한으로 변경사항을 저장해 주세요.');}else await storage.write(lastGood,null);};
cachedFacilityDataReady=async()=>active()?!!(await localGet(ACTIVE))?.text:old.cachedFacilityDataReady();
prepareOfflineUse=async function(){if(!active())return old.prepareOfflineUse();try{await persistCurrentContainer();const reg=await registerFacilityServiceWorker();if(!reg)throw new Error('HTTPS 또는 지원 브라우저가 필요합니다.');await cacheOfflineAppFiles();try{await navigator.storage?.persist?.();}catch{}await refreshOfflineReadyUi();toast('오프라인 사용 준비를 확인했습니다.');}catch(e){toast('오프라인 준비 실패: '+e.message);}};
window.FacilityFaci={get active(){return active();},get documentId(){return active()?state.container.id:null;},storage,syncUi,renderDetails,showQuick,loadText,save,activateDocument,
 linksFor(view){return new Map(view.rooms.map(r=>[r.id,r.spaceUuid?{status:'linked',room:r}:{status:'unlinked'}]));},
 extraMarkup(view){return view.equipment.filter(e=>state.layers[e.type]).map(renderEquipSvg).join('');},
 acceptSources(sources){requireAdmin();if(saving||loading)throw new Error('저장 또는 열기가 끝난 뒤 도면을 추가해 주세요.');const next=F.withSources({...state.container,public:F.clone(state.pub)},sources).document;state.container.drawings=next.drawings;state.pub.spaces=next.public.spaces;state.pub.equipmentByDrawing=next.public.equipmentByDrawing;state.pub.placementFrames=next.public.placementFrames;setDirty();},
};
$('#createFaciBtn').onclick=createUi;$('#createFaciStartBtn').onclick=createUi;$('#recoverFaciBtn').onclick=recoverUi;$('#exportPpkgBtn').onclick=exportPpkgUi;
$('#sideSaveBtn').onclick=exportFaci;$('#exportDbBtn').onclick=exportFaci;$('#floatingSecureBtn').onclick=handleSecureButton;$('#sideAdminBtn').onclick=handleAdminButton;$('#offlinePrepareBtn').onclick=prepareOfflineUse;
window.addEventListener('keydown',e=>{if(active()&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();exportFaci();}});
syncUi();
localGet(ACTIVE).then(cached=>{if(cached?.text)return loadText(cached.text,cached.name,{persist:false});}).catch(()=>toast('보관한 FACI를 열지 못했습니다. 정상 파일을 선택해 주세요.'));
})();
