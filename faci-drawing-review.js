/* Drawing review is available from the existing Query > Drawings section. */
(function () {
'use strict';
const P=window.FacilityPpkg,D=window.FacilityFaciDrawings,V=window.FacilityPpkgViewer,R=window.FacilityPpkgRender,A=window.FacilityFaci;
const esc=R.esc;
const formatDate=value=>esc(value||'미지정');
const sourceLabels={current:'현재',past:'과거',planned:'예정',draft:'초안'};
const changesLabels={changed:'변경',absent:'후보 도면에서 제외',added:'새 공간',same:'유지',lineage:'계보 참조'};
const closeButton='<button class="btn" id="ppkgReviewClose">닫기</button>';
function reviewDialog(title,body,foot){
  openModal(title,body,foot);
  const dialog=$('#modalHost .modal');
  dialog.classList.add('ppkg-review-dialog');
  dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-label',title);
  dialog.querySelector('.modalClose').focus();
  dialog.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closeModal();$('#ppkgHistoryBtn').focus();}
    if(e.key!=='Tab')return;
    const nodes=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),summary')].filter(n=>n.getClientRects().length);
    const active=document.activeElement,first=nodes[0],last=nodes.at(-1);
    if(e.shiftKey&&active===first){e.preventDefault();last.focus();}
    if(!e.shiftKey&&active===last){e.preventDefault();first.focus();}
  });
}
function historyRows(d) {
  if(!d.applicationHistory.length)return '<p class="smallText muted">기록된 PieniPlan 적용 이력이 없습니다.</p>';
  return '<ul class="ppkg-info-list">'+d.applicationHistory.map(e=>`<li>적용일 ${formatDate(e.appliedDate)} · ${e.evidence==='explicit'?'PieniPlan 명시적 적용':'기존 현재 표시'} · 기록 시각 ${formatDate(e.recordedAt)}</li>`).join('')+'</ul>';
}
function optionList(drawings) {
  return drawings.map(d=>`<button class="btn" data-review-drawing="${esc(d.id)}">${esc(d.level?.name||'층 미지정')} · ${esc(V.drawingLabel(d))}</button>`).join('');
}
function inspect(drawingId) {
  if(state.roomEditDraft){toast('입력 중인 내용을 먼저 적용하거나 취소해 주세요.');return;}
  const model=V.model,d=model.drawings.get(drawingId),doc=A.active?A.workingDocument():null;
  if(!d)return;
  const version=d.version;
  const comparison=D.compare(doc||{drawings:{},public:{spaces:[],equipmentByDrawing:{},constructionHistory:[]}},model,d);
  const {current,baseline,changes,lineage,blocked,objects}=comparison;
  const previous=doc&&D.operations(doc)[D.operationLevel(doc,d)]?.previous.includes(d.id);
  const held=doc&&D.reviews(doc)[d.id]?.status==='held';
  const canDecide=doc&&state.role==='admin';
  const canApprove=canDecide&&version&&!blocked&&!previous, canRestore=canDecide&&previous, canHold=canDecide&&version&&!d.operational&&!held&&!previous;
  const confirmed=canApprove||canRestore;
  const preview=(entry,caption)=>entry?`<figure><figcaption>${esc(caption)} · ${esc(entry.source.name)}</figcaption><svg viewBox="0 0 1000 700" aria-label="${esc(caption)}">${R.markup(P.view(model,entry))}</svg></figure>`:'';
  const impactHtml=item=>item.impact?`<div>${esc([item.impact.department,item.impact.assignee].filter(Boolean).join(' · ')||'업무 공간 연결됨')}</div><div>설비 ${item.impact.equipment.length} · 공사기록 ${item.impact.construction}${item.impact.fireInspection?' · 소방점검 정보 있음':''}</div>${item.impact.equipment.length?`<div>${esc(item.impact.equipment.join(', '))}</div>`:''}`:'—';
  const changed=changes.filter(item=>item.status!=='same'||item.related);
  const spaceRows=changed.map(item=>`<tr><td>${esc(changesLabels[item.status])}${item.status==='changed'?`<div class='smallText muted'>${[item.nameChanged?'이름':'',item.geometryChanged?'형상·위치':'',item.attributesChanged?'도면 속성':''].filter(Boolean).join(' · ')}</div>`:''}</td><td>${esc(item.before||'—')} → ${esc(item.after||'—')}<div class="smallText muted">${esc(item.uuid)}</div></td><td>${impactHtml(item)}</td></tr>`).join('');
  const lineageHtml=lineage.map(event=>`<li>${event.kind==='split'?'분할':'통합'} · ${esc(event.parents.join(', '))} → ${esc(event.children.join(', '))}</li>`).join('');
  const metadata=`<dl class="infoGrid"><dt>물리 층</dt><dd>${esc(d.level?.name||model.levels.get(doc&&D.operationLevel(doc,d))?.name||'미지정')}</dd><dt>FacilityManager</dt><dd>${d.operational?'현재 운영':previous?'이전 운영':held?'보류':doc?'미승인':'도면 조회'}</dd>
    <dt>PieniPlan</dt><dd>${version?sourceLabels[d.sourceStatus]+' · 수정일 '+formatDate(version.modifiedDate)+' · 적용 예정/기록일 '+formatDate(version.appliedDate):'PPKG1'}</dd>
    <dt>출처 기준 도면</dt><dd>${esc(baseline?.source.name||'없음')}</dd><dt>운영 비교 기준</dt><dd>${esc(current?.source.name||'승인본 없음')}</dd>
    <dt>수신 리비전</dt><dd>r${d.record?.revision??'—'}${d.packageRevision?' · '+esc(d.packageRevision.slice(0,12)):''}</dd></dl>`;
  const foot=`<button class="btn" id="ppkgReviewBack">이력 목록</button>${canHold?'<button class="btn" id="ppkgReviewHold">보류</button>':''}
    ${canRestore?'<button class="btn" id="ppkgReviewRestore" disabled>이전 운영본 복원</button>':''}
    ${canApprove?'<button class="btn primary" id="ppkgReviewApprove" disabled>이 도면을 층 운영본으로 승인</button>':''}${closeButton}`;
  reviewDialog(d.source.name,metadata+
    (version?.description?`<p>${esc(version.description)}</p>`:'')+
    `<details><summary>PieniPlan 적용 기록</summary>${historyRows(d)}</details>
    <div class="ppkg-review-plans">${preview(current||baseline,current?'FacilityManager 운영본':'PieniPlan 기준본')}${preview(d,'선택한 수신본')}</div>
    <p>객체 추가 ${objects.added} · 변경 ${objects.changed} · 제외 ${objects.absent} · 유지 ${objects.same}</p>
    <p>공간 유지 ${changes.length-changed.length} · 변경 및 확인 ${changed.length}</p>
    ${changed.length?`<table class="ppkg-review-table"><thead><tr><th>상태</th><th>비교 기준 → 수신본</th><th>연결된 관리 자료</th></tr></thead><tbody>${spaceRows}</tbody></table>`:''}
    ${lineageHtml?`<details open><summary>공간 분할·통합 관계</summary><ul class="ppkg-info-list">${lineageHtml}</ul></details>`:''}
    ${blocked?`<p class="smallText muted">${esc(blocked)}</p>`:''}
    ${confirmed?'<label class="ppkg-review-confirm"><input type="checkbox" id="ppkgReviewChecked">공간·설비 영향과 비교 기준을 확인했습니다. 승인하면 오늘부터 이 층의 운영 도면이 바뀝니다. 기존 배치와 업무 기록은 이전 위치에 보존됩니다.</label>':''}
    <div id="ppkgReviewError" role="alert" class="smallText"></div>`,foot);
  $('#ppkgReviewBack').onclick=openHistory;
  $('#ppkgReviewClose').onclick=()=>{closeModal();$('#ppkgHistoryBtn').focus();};
  const checkbox=$('#ppkgReviewChecked');
  if(checkbox) checkbox.onchange=()=>['ppkgReviewApprove','ppkgReviewRestore'].forEach(id=>{const button=$('#'+id);if(button)button.disabled=!checkbox.checked;});
  const expected=doc?.id;
  for(const [id,action] of [['ppkgReviewHold','hold'],['ppkgReviewRestore','restore'],['ppkgReviewApprove','approve']]) {
    const button=$('#'+id);
    if(!button)continue;
    button.onclick=()=>{
      try {
        if(V.model!==model)throw new Error('수신 도면이 바뀌었습니다. 이력 목록에서 다시 열어 주세요.');
        A.decideDrawing(d.id,action,Boolean(checkbox?.checked),expected);
        if(action==='hold')openHistory();
        else {closeModal();toast('운영 도면을 변경했습니다. FACI 파일을 저장해 주세요.');}
      } catch(error) {$('#ppkgReviewError').textContent=error.message;}
    };
  }
}
function renderDate(date,model,building) {
  const rows=building?D.buildingAt(A.workingDocument(),model,building.id,date):[];
  const target=$('#ppkgHistoryDateResults');
  target.innerHTML=rows.length?'<ul class="ppkg-info-list">'+rows.map(({level,drawing,date})=>`<li>${esc(level.name)} · ${drawing?`${esc(drawing.source.name)} · ${esc(date)}`:'해당 날짜의 FacilityManager 적용 기록 없음'}</li>`).join('')+'</ul>':
    '<p class="smallText muted">선택한 건물의 물리 층 기록이 없습니다.</p>';
}
function openHistory() {
  const model=V.model;
  if(!model)return;
  if(state.roomEditDraft){toast('입력 중인 내용을 먼저 적용하거나 취소해 주세요.');return;}
  const doc=A.active?A.workingDocument():null;
  const drawings=[...model.drawings.values()].filter(d=>d.version||doc&&D.operationLevel(doc,d));
  const building=model.buildings.find(b=>b.id===state.buildingId);
  const grouped=(preferred)=>drawings.filter(d=>preferred===(d.buildingId===building?.id)).sort((a,b)=>Number(b.operational)-Number(a.operational)||(a.level?.name||'').localeCompare(b.level?.name||'')||a.source.name.localeCompare(b.source.name));
  reviewDialog('도면 이력 및 승인',
    `<p class="smallText muted">PieniPlan의 현재·예정 표시와 FacilityManager 운영 승인을 따로 표시합니다.</p>
    ${A.active?`<label>현재 건물의 기준일 <input type="date" id="ppkgHistoryDate" value="${D.localDay()}"></label><div id="ppkgHistoryDateResults" aria-live="polite"></div>`:''}
    <div class="ppkg-review-list">${optionList([...grouped(true),...grouped(false)])}</div>`,closeButton);
  $('#ppkgReviewClose').onclick=()=>{closeModal();$('#ppkgHistoryBtn').focus();};
  for(const button of $$('[data-review-drawing]'))button.onclick=()=>inspect(button.dataset.reviewDrawing);
  const date=$('#ppkgHistoryDate');
  if(date) {
    date.onchange=()=>{if(date.value)renderDate(date.value,model,building);else $('#ppkgHistoryDateResults').textContent='날짜를 선택해 주세요.';};
    renderDate(date.value,model,building);
  }
}
$('#ppkgHistoryBtn').onclick=openHistory;
})();
