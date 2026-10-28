/* Build19 integration with the approved Build18 viewer. No FACI persistence. */
(function(){
'use strict';
const C=window.FacilityPpkg,R=window.FacilityPpkgRender;
const CACHE_KEY='ppkgViewerSourcesV1';
let session=null,active=false,legacySelection=null,busy=false,ppkgCacheReady=false,viewAdapter=null,viewCache=new Map();
const base={currentBuilding,currentFloor,allRooms,populateSelectors,populateFloors,changeBuilding,changeFloor,renderMap,renderDetails,fitView,showRoomQuickPopover,renderMobileMenu,openSearch,openPrint,loadContainer,resetDataConnection,syncBuild17DataUi,handleSecureButton,handleAdminButton,openFacmapPicker,readFacmapFile,beginRoomEdit,openRoomEditor,openConstructionModal,openEquipmentModal,prepareOfflineUse,cachedFacilityDataReady,refreshOfflineReadyUi};
const legacyOfflineNote=$('#offlineReadyNote').textContent;
const esc=R.esc;
function viewFor(id){if(!viewCache.has(id)&&session?.model.drawings.has(id)){const view=C.view(session.model,session.model.drawings.get(id));viewCache.set(id,viewAdapter?viewAdapter(view):view);}return viewCache.get(id);}
function linksFor(f){if(window.FacilityFaci?.active)return window.FacilityFaci.linksFor(f);return new Map((f?.rooms||[]).map(r=>[r.id,C.findManagementLink(state.pub,r._ppkg)]));}
function sync(){
  document.body.classList.toggle('ppkg-mode',active);
  document.body.classList.toggle('facility-data-ready',active||!!state.container);
  $('#dataOverlay').classList.toggle('hidden',active||!!state.container);
  $('#ppkgReturnBtn').hidden=!session||!!window.FacilityFaci?.active;
  $('#ppkgReturnBtn').textContent=active?'시설 데이터 보기':'PPKG 조회로 돌아가기';
  $('#ppkgReturnBtn').disabled=active&&!state.container;
  $('#floorSelect').setAttribute('aria-label',active?'도면 선택':'층 선택');
  $('#buildingSelect').setAttribute('aria-label','건물 선택');
  const f=active?currentFloor():null,d=active?session.model.drawings.get(state.floorId):null;
  const stat=$('#ppkgStatus');
  if(active){
    const count={b:session.model.buildings.length,d:session.model.drawings.size,s:session.model.spaces.size};
    stat.innerHTML=`<strong>PPKG 조회</strong> · 건물 ${count.b} · 도면 ${count.d} · 공간 ${count.s}<br>물리 층: ${esc(d?.level?.name||'미지정')} · ${esc(d?.source.discipline||'분야 미지정')}<br>${d?.baseId?'기준 도면 참조 · ':''}업무 데이터에 반영하지 않음`;
    if(session.model.warnings.length)stat.innerHTML+=`<details><summary>표시 유의사항 ${session.model.warnings.length}건</summary><ul class="ppkg-info-list">${session.model.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></details>`;
  } else stat.textContent=session?'PPKG 조회 자료가 별도로 열려 있습니다.':'';
  for(const id of ['facmapImportBtn','constructionBtn'])$('#'+id)?.closest('.panelSection')?.classList.toggle('ppkg-legacy-action',active&&!window.FacilityFaci?.active||id==='facmapImportBtn');
  $('#currentLocationPill')?.setAttribute('aria-label',active?'같은 건물의 도면 선택':'같은 건물의 층 선택');
  $('#offlineDataState')?.setAttribute('aria-label',active?'시설 데이터 또는 PPKG 조회 원본의 로컬 준비 상태':'시설 데이터 로컬 준비 상태');
  $('#offlineReadyNote').textContent=active?'오프라인 사용 준비를 누르면 현재 PPKG 원본을 이 기기의 로컬 저장소에 보관합니다. 도면을 추가한 뒤에는 다시 준비해 주세요. 브라우저 저장소를 삭제하면 다시 준비해야 합니다.':legacyOfflineNote;
  if(f)$('#rightDataStamp').textContent='PPKG 조회 · 시설 데이터와 별도';
  window.FacilityFaci?.syncUi?.();
}
function activate(){
  if(!session)return;
  if(!active)legacySelection={buildingId:state.buildingId,floorId:state.floorId,selected:[...state.selectedRoomIds],transform:{...state.transform}};
  active=true;state.editMode=false;state.panelMode='browse';state.roomEditDraft=null;state.selectedElement=null;
  state.buildingId=session.model.buildings[0]?.id;state.floorId=session.model.buildings[0]?.drawings[0]?.id;
  state.selectedRoomIds.clear();hideRoomQuickPopover();sync();populateSelectors();fitView();renderAll();
}
function showLegacy(link=null){
  if(!state.container){toast('먼저 시설 데이터를 연결해 주세요.');return;}
  active=false;
  if(link){state.buildingId=link.building.id;state.floorId=link.floor.id;state.selectedRoomIds=new Set([link.room.id]);}
  else if(legacySelection){state.buildingId=legacySelection.buildingId;state.floorId=legacySelection.floorId;state.selectedRoomIds=new Set(legacySelection.selected);state.transform={...legacySelection.transform};}
  state.panelMode='browse';hideRoomQuickPopover();sync();populateSelectors();if(link)fitView();renderAll();renderMobileMenu();
  $('#rightDataStamp').textContent=fmtDateTime(state.pub?.settings?.dataDate);
}
async function importFiles(files){
  if(busy)return;busy=true;
  const targetDocumentId=window.FacilityFaci?.documentId;
  try{
    const additions=[];
    for(const file of files){
      if(file.size>50*1024*1024)throw new Error('PPKG 파일이 50MB를 초과합니다.');
      const document=JSON.parse(await readFacilityDataFile(file));C.validate(document);
      additions.push({name:file.name,document});
    }
    if(!additions.length)return;
    const sources=[...(session?.sources||[])];
    for(const item of additions)if(!sources.some(s=>C.canonical(s.document)===C.canonical(item.document)))sources.push(item);
    const model=C.makeModel(sources); // Stage the whole batch before touching live selection or management data.
    if(targetDocumentId!==window.FacilityFaci?.documentId)throw new Error('가져오는 동안 관리 문서가 바뀌었습니다. 다시 선택해 주세요.');
    if(window.FacilityFaci?.active)window.FacilityFaci.acceptSources(sources,model);
    session={sources,model};ppkgCacheReady=false;viewCache=new Map();activate();refreshOfflineReadyUi();
    $('#ppkgImportError').textContent='';
    toast(`PPKG 도면을 열었습니다. 건물 ${model.buildings.length} · 도면 ${model.drawings.size} · 공간 ${model.spaces.size}`);
  }catch(e){
    const message=e instanceof SyntaxError?'JSON 문서로 읽을 수 없는 PPKG입니다.':e.message;
    $('#ppkgImportError').textContent=message;
    openModal('PPKG를 열지 못했습니다',`<p>${esc(message)}</p><p class="smallText muted">현재 도면과 시설관리 데이터는 유지됩니다.</p>`,'<button class="btn primary" id="ppkgErrorClose">확인</button>');
    $('#ppkgErrorClose').onclick=closeModal;
  }finally{busy=false;$('#ppkgInput').value='';}
}
currentBuilding=function(){return active?session?.model.buildings.find(b=>b.id===state.buildingId):base.currentBuilding();};
currentFloor=function(){return active?viewFor(state.floorId):base.currentFloor();};
// This compatibility projection is view-only. The PPKG source has drawings, not invented physical levels.
function projectedBuilding(b){return {...b,floors:b.drawings.map(d=>viewFor(d.id))};}
const buildingImpl=currentBuilding;
currentBuilding=function(){const b=buildingImpl();return active&&b?projectedBuilding(b):b;};
allRooms=function(){return active?session.model.buildings.flatMap(b=>b.drawings.flatMap(d=>viewFor(d.id).rooms.map(r=>({...r,__building:projectedBuilding(b),__floor:viewFor(d.id)})))):base.allRooms();};
populateSelectors=function(){
  if(!active)return base.populateSelectors();
  for(const id of ['buildingSelect','mobileBuilding']){const el=$('#'+id);if(el){el.innerHTML=session.model.buildings.map(b=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('');el.value=state.buildingId;}}
  populateFloors();
};
populateFloors=function(){
  if(!active)return base.populateFloors();
  for(const id of ['floorSelect','mobileFloor']){const el=$('#'+id);if(el){el.innerHTML=(currentBuilding()?.drawings||[]).map(d=>`<option value="${esc(d.id)}">${esc(d.source.name||'이름 없는 도면')} · ${esc(d.level?.name||'층 미지정')}</option>`).join('');el.value=state.floorId;}}
};
changeBuilding=function(id){if(!active)return base.changeBuilding(id);state.buildingId=id;changeFloor(currentBuilding()?.drawings[0]?.id);populateSelectors();};
changeFloor=function(id){if(!active)return base.changeFloor(id);if(!session.model.drawings.has(id))return;state.floorId=id;state.selectedRoomIds.clear();state.roomEditDraft=null;hideRoomQuickPopover();sync();populateFloors();fitView();renderAll();};
fitView=function(){if(!active)return base.fitView();state.transform={x:0,y:0,scale:1};renderMap();};
renderMap=function(){
  if(!active)return base.renderMap();
  const f=currentFloor(),svg=$('#floorSvg');if(!f)return;
  svg.setAttribute('viewBox','0 0 1000 700');
  svg.innerHTML=`<g id="viewport" transform="translate(${state.transform.x} ${state.transform.y}) scale(${state.transform.scale})">${R.markup(f,{selected:state.selectedRoomIds,labels:roomLabelPrefs,links:linksFor(f),doors:state.layers.doors,objects:state.layers.objects,base:state.layers.cad})}${window.FacilityFaci?.active?window.FacilityFaci.extraMarkup(f):''}</g>`;
  renderTopMeta();sync();
};
function area(v){return v==null?'미입력':`${Number(v).toFixed(2)}㎡`;}
function detail(room){
  const s=room._ppkg,link=C.findManagementLink(state.pub,s),m=link.status==='linked'?link.room:null;
  const rows=[['도면 공간명',room.name],['물리 층',s.drawing.level?.name||'미지정'],['도면 제공 면적',area(s.object.areaM2)],['기하 계산 면적',area(C.polygonAreaM2(s.object.polygon))],['도면 등록 면적',area(s.object.managedAreaM2)],['연결 상태',link.status==='linked'?'UUID로 연결됨':link.status==='ambiguous'?'중복 연결 · 확인 필요':'관리정보 미연결']];
  if(m)rows.push(['실제 호실번호',m.no||'—'],['호실명',m.name||'—'],['관리부서',m.department||'—'],['업무 등록 면적',area(m.areaM2)]);
  const registry=m?.roomRegister;
  if(registry)for(const [field,label] of [['roomCode','학교 호실코드'],['name','대장 호실명'],['shortName','호실약칭'],['usage','호실용도'],['facilityClass','시설구분'],['managingDepartment','대장 관리부서'],['teachingDepartment','수업사용부서'],['capacity','수용인원'],['areaPyeong','대장 면적(평)'],['areaM2','대장 면적(㎡)'],['inUse','대장 사용유무']])if(registry[field]!=null)rows.push([label,String(registry[field])]);
  return `<div class="detailHeader"><div class="detailTitle">${esc(room.name)}</div></div><div class="ppkg-detail-note">도면 기하와 시설관리 정보를 분리해 조회합니다. 이름·호실코드로 자동 연결하지 않습니다.</div><div class="detailBody"><dl class="infoGrid">${rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${m?'<button class="btn fullBtn ppkgOpenManaged">연결된 시설관리 정보 열기</button>':'<p class="smallText muted">이 공간의 업무정보를 새로 만들거나 기존 정보를 덮어쓰지 않았습니다.</p>'}<details class="ppkg-link-info"><summary>공간 연결 정보</summary><div>공간 UUID: ${esc(s.spaceUuid||'없음 · 연결 불가')}</div><div>도면 객체 ID: ${esc(s.object.id)}</div></details></div>`;
}
renderDetails=function(){
  if(window.FacilityFaci?.active)return window.FacilityFaci.renderDetails();
  if(!active)return base.renderDetails();
  const room=selectedRoom();
  const html=room?detail(room):'<div class="detailEmpty"><div><b>도면에서 공간을 선택해 주세요.</b><p class="smallText">공간이 없는 도면도 벽·문 등 도면 요소를 조회할 수 있습니다.</p></div></div>';
  $('#desktopDetail').innerHTML=html;$('#mobileDetail').innerHTML=html;
  $('#mobileSheetTitle').textContent=room?.name||'도면 공간 조회';$('#mobileSheetSub').textContent=room?area(room.areaM2):'PPKG 도면';
  $$('.ppkgOpenManaged').forEach(b=>b.onclick=()=>{const l=C.findManagementLink(state.pub,selectedRoom()?._ppkg);if(l.status==='linked'){showLegacy(l);setPanelCollapsed(false);applySidePanelTab('query');}});
  applySidePanelTab(sidePanelTab,{persist:false});sync();
};
showRoomQuickPopover=function(room,e){
  if(window.FacilityFaci?.active)return window.FacilityFaci.showQuick(room,e);
  if(!active)return base.showRoomQuickPopover(room,e);
  if(!room||!state.panelCollapsed)return;
  const el=$('#roomQuickPopover'),l=C.findManagementLink(state.pub,room._ppkg);
  el.innerHTML=`<div class="quickTitle">${esc(room.name)}</div><div class="quickSub">도면 면적 ${area(room.areaM2)}</div><div class="quickMeta">${l.status==='linked'?'시설관리 정보 연결됨':l.status==='ambiguous'?'중복 연결 · 확인 필요':'관리정보 미연결'}</div><div class="quickActions"><button class="btn small primary" id="quickOpenDetail">상세 정보</button></div>`;
  el.classList.remove('hidden');const [x,y]=roomQuickPosition(room,e);
  requestAnimationFrame(()=>{const r=el.getBoundingClientRect();el.style.left=Math.max(8,Math.min(innerWidth-r.width-8,x+14))+'px';el.style.top=Math.max(8,Math.min(innerHeight-r.height-8,y+14))+'px';});
  $('#quickOpenDetail').onclick=()=>{setPanelCollapsed(false);applySidePanelTab('query');renderDetails();};
};
openSearch=function(){
  if(!active)return base.openSearch();
  openModal('도면 공간 검색','<input id="ppkgSearch" class="searchInput" aria-label="공간명 검색" placeholder="공간명 검색"/><div id="ppkgSearchResults"></div>','<button class="btn" id="ppkgSearchClose">닫기</button>');
  const draw=()=>{const q=$('#ppkgSearch').value.trim().toLowerCase();const rs=allRooms().filter(r=>(r.name||'').toLowerCase().includes(q)).slice(0,100);$('#ppkgSearchResults').innerHTML=rs.map((r,i)=>`<button class="btn fullBtn" data-ppkg-search="${i}">${esc(r.__building.name)} · ${esc(r.__floor.label)} · ${esc(r.name)}</button>`).join('')||'<p class="smallText muted">일치하는 공간이 없습니다.</p>';
    $$('[data-ppkg-search]').forEach(b=>b.onclick=()=>{const r=rs[Number(b.dataset.ppkgSearch)];state.buildingId=r.__building.id;state.floorId=r.__floor.id;populateSelectors();fitView();closeModal();selectRoom(r.id);});};
  $('#ppkgSearch').oninput=draw;$('#ppkgSearchClose').onclick=closeModal;draw();$('#ppkgSearch').focus();
};
openPrint=function(){
  if(!active)return base.openPrint();
  const f=currentFloor(),d=session.model.drawings.get(state.floorId),printView={...f,layers:C.layersFor(session.model,d,{print:true})};
  $('#printRoot').innerHTML=`<div class="printPage"><div class="printHeader"><div class="printTitle">${esc(currentBuilding().name)} · ${esc(f.label)}</div><div class="printMeta">PPKG 도면 · v${VERSION} Build ${BUILD}</div></div><div class="printMap"><svg viewBox="0 0 1000 700">${R.markup(printView,{labels:roomLabelPrefs,links:linksFor(f)})}${window.FacilityFaci?.active?window.FacilityFaci.extraMarkup(f):''}</svg></div><div class="printFooter">시설관리 조회용 · 원본 좌표 mm / 면적 ㎡</div></div>`;
  $('#dynamicPrintStyle').textContent='@page{size:A4 landscape;margin:0}';
  openModal('도면 출력','<p>현재 도면을 A4 가로로 인쇄하거나 PDF로 저장합니다.</p>','<button class="btn" id="ppkgPrintCancel">취소</button><button class="btn primary" id="ppkgPrintConfirm">인쇄 / PDF 저장</button>');
  $('#ppkgPrintCancel').onclick=closeModal;$('#ppkgPrintConfirm').onclick=()=>{closeModal();window.print();};
};
renderMobileMenu=function(){if(!active||window.FacilityFaci?.active)return base.renderMobileMenu();$('#mobileMenu').innerHTML='<div class="panelSection"><b>PPKG 도면 조회</b><p class="smallText">정보 패널에서 건물·도면 선택, 표시와 설정을 사용할 수 있습니다.</p><button class="btn fullBtn" id="ppkgMobilePanel">정보 패널 열기</button></div>';$('#ppkgMobilePanel').onclick=()=>{closeMobileMenu();setPanelCollapsed(false);applySidePanelTab('query');};};
syncBuild17DataUi=function(){base.syncBuild17DataUi();sync();};
resetDataConnection=function(...args){const result=base.resetDataConnection(...args);sync();if(active){populateSelectors();renderAll();}return result;};
for(const name of ['handleSecureButton','handleAdminButton']){
  const run=base[name];
  if(name==='handleSecureButton')handleSecureButton=function(){if(!state.container){toast('시설 데이터를 연결한 뒤 잠금정보를 확인할 수 있습니다.');return;}return run();};
  else handleAdminButton=function(){if(!state.container){toast('시설 데이터를 연결한 뒤 관리자 인증을 사용할 수 있습니다.');return;}return run();};
}
const editingGuard=fn=>function(...args){if(active&&!window.FacilityFaci?.active){toast('시설관리 수정은 FACI 문서에서 진행해 주세요.');return;}return fn(...args);};
openFacmapPicker=editingGuard(base.openFacmapPicker);readFacmapFile=editingGuard(base.readFacmapFile);beginRoomEdit=editingGuard(base.beginRoomEdit);openRoomEditor=editingGuard(base.openRoomEditor);openConstructionModal=editingGuard(base.openConstructionModal);openEquipmentModal=editingGuard(base.openEquipmentModal);
cachedFacilityDataReady=async function(){if(active)return ppkgCacheReady&&!!(await localGet(CACHE_KEY))?.sources?.length;return base.cachedFacilityDataReady();};
refreshOfflineReadyUi=async function(...args){const r=await base.refreshOfflineReadyUi(...args);if(active){const el=$('#offlineDataState'),label=window.FacilityFaci?.active?'FACI 문서':'도면 원본';el.textContent=label+(el.classList.contains('ready')?' 준비됨':' 준비 필요');}return r;};
prepareOfflineUse=async function(){
  if(session){
    try{await localPut(CACHE_KEY,{sources:session.sources});ppkgCacheReady=true;}
    catch{toast('PPKG 조회 원본을 로컬에 보관하지 못했습니다.');return;}
  }
  return base.prepareOfflineUse();
};
// The cache contains original PPKG sources only. It is neither a new management file nor a FACI format.
$('#ppkgInput').onchange=e=>importFiles([...e.currentTarget.files]);
for(const id of ['openPpkgBtn','ppkgImportBtn'])$('#'+id).onclick=()=>$('#ppkgInput').click();
$('#ppkgReturnBtn').onclick=()=>active?showLegacy():activate();
$('#floatingSearchBtn').onclick=openSearch;$('#sideSearchBtn').onclick=openSearch;$('#floatingPrintBtn').onclick=openPrint;$('#settingsPrintBtn').onclick=openPrint;$('#floatingSecureBtn').onclick=handleSecureButton;$('#sideAdminBtn').onclick=handleAdminButton;$('#facmapImportBtn').onclick=openFacmapPicker;$('#offlinePrepareBtn').onclick=prepareOfflineUse;
sync();
localGet(CACHE_KEY).then(async cached=>{
  if(!cached?.sources?.length||session)return;
  try{session={sources:cached.sources,model:C.makeModel(cached.sources)};ppkgCacheReady=true;sync();if(!(await localGet(LOCAL_ACTIVE_KEY))?.text)activate();}
  catch{$('#ppkgImportError').textContent='보관한 PPKG를 읽지 못했습니다. 원본 파일을 다시 열어 주세요.';}
}).catch(()=>{});
window.FacilityPpkgViewer={importFiles,showLegacy,activate,getView:viewFor,
 setSources(sources){const model=C.makeModel(sources);session={sources:C.clone(sources),model};viewCache=new Map();activate();},
 setViewAdapter(adapter){viewAdapter=adapter;viewCache=new Map();},
 get sources(){return session?.sources||[];},get active(){return active;},get model(){return session?.model;}};
})();
