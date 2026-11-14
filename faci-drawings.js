/* FacilityManager decisions over immutable exchange snapshots. */
(function (root) {
'use strict';
const P=root.FacilityPpkg;
const V=root.FacilityPpkgVersions;
const equal=V.same;
const spaceMap=d=>new Map((d?.source.objects||[]).filter(o=>o.type==='space'&&o.spaceUuid).map(o=>[o.spaceUuid,o]));
const operations=doc=>doc.drawings.operationalByLevel||{};
const reviews=doc=>doc.drawings.reviews||{};
function localDay(date=new Date()) {
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
async function verifySources(sources) {
  for(const {document} of sources)await V.verify(document);
}
function validateArchive(sources) {
  const drawings=new Map();
  const levels=new Map();
  for (const {document:pkg} of sources) {
    if (pkg.schemaVersion!==2) continue;
    const rows=new Map(pkg.drawingModel.versions.map(v=>[v.drawingId,v]));
    for (const l of pkg.drawingModel.levels) {
      const key=P.key(pkg.packageId,l.id), prior=levels.get(key);
      if (prior && prior!==l.buildingId) throw new Error('같은 물리 층 ID의 소속 건물이 충돌합니다.');
      levels.set(key,l.buildingId);
    }
    for (const b of pkg.buildings) for (const d of b.drawings) {
      const key=P.key(pkg.packageId,d.id), row=rows.get(d.id), r=pkg.drawingModel.records[d.id], prior=drawings.get(key);
      if (prior && (prior.levelId!==row.levelId||prior.revisions.has(r.revision)&&prior.revisions.get(r.revision)!==r.fingerprint||
          prior.sealed&&row.sealedFingerprint&&prior.sealed!==row.sealedFingerprint)) {
        throw new Error('같은 출처 도면의 층·리비전·봉인된 fingerprint가 충돌합니다.');
      }
      const item=prior||{levelId:row.levelId,revisions:new Map(),sealed:null};
      item.revisions.set(r.revision,r.fingerprint);
      item.sealed ||= row.sealedFingerprint;
      drawings.set(key,item);
    }
  }
}
function stage(doc,additions) {
  const sources=[...doc.drawings.sources];
  for (const source of additions) {
    const pkg=source.document;
    const identical=sources.some(old=>pkg.schemaVersion===2&&old.document.schemaVersion===2
      ?old.document.packageId===pkg.packageId&&old.document.packageRevision===pkg.packageRevision
      :equal(old.document,pkg));
    if (!identical) sources.push(source);
  }
  const result=root.FacilityFaciCore.withSources(doc,sources);
  validateArchive(sources);
  validateDecisions(result.document,result.model);
  return result;
}
function snapshotEquivalent(a,b) {
  if(a?.sourceId!==b?.sourceId||a?.record?.fingerprint!==b?.record?.fingerprint)return false;
  const payload=d=>{
    const {order,...source}=d.source;
    return {source,version:d.version,level:d.level,styles:d.styles};
  };
  return equal(payload(a),payload(b));
}
function operationLevel(doc,d) {
  if(d?.version)return d.levelKey;
  return Object.entries(operations(doc)).find(([,record])=>record.drawingId===d?.id||record.previous.includes(d?.id))?.[0]||null;
}
function candidateState(doc,model,d) {
  if (!d?.version) return {current:model.drawings.get(operations(doc)[operationLevel(doc,d)]?.drawingId),blocked:'기존 PPKG1 도면입니다.'};
  const op=operations(doc)[d.levelKey];
  const legacy=[...model.drawings.values()].filter(o=>!o.version&&o.operational&&
    (o.origin.packageId===d.packageId||o.packageId===d.packageId));
  const ancestors=new Set();
  for(let row=d;row;) {
    ancestors.add(row.sourceId);
    row=row.version?.sourceDrawingId?model.drawings.get(P.key(d.packageId,row.version.sourceDrawingId,d.packageRevision)):null;
  }
  const localIds=legacy.filter(o=>o.packageId===d.packageId&&ancestors.has(o.sourceId));
  const originIds=legacy.filter(o=>o.origin.packageId===d.packageId&&ancestors.has(o.origin.drawingId));
  const sameLevel=legacy.filter(o=>o.levelKey===d.levelKey);
  const proven=localIds.length?localIds:originIds.length?originIds:sameLevel;
  const current=op?model.drawings.get(op.drawingId):proven.length===1?proven[0]:null;
  if (current?.id===d.id) return {current,blocked:'현재 운영 도면입니다.'};
  if (d.source.objects.some(o=>o.type==='space'&&o.invalid===true)) return {current,blocked:'유효하지 않은 공간 경계가 있습니다. PieniPlan에서 수정한 후 다시 가져오세요.'};
  if (current?.version && snapshotEquivalent(current,d)) return {current,blocked:'현재 운영 도면과 동일한 수신본입니다.'};
  const lowerRevision=[...model.drawings.values()].some(o=>o.version&&o.packageId===d.packageId&&o.sourceId===d.sourceId&&o.record.revision>d.record.revision);
  if (lowerRevision) return {current,blocked:'같은 도면에 더 새 리비전이 있습니다. 이전 수신본은 조회할 수 있습니다.'};
  if (!op&&proven.length>1) return {current,blocked:'기존 도면과 이 층의 대응이 여러 개입니다.'};
  if (!op&&!current&&legacy.some(o=>!o.levelKey)) return {current,blocked:'층 미지정 기존 도면이 있어 안전하게 대응할 수 없습니다.'};
  return {current};
}
function compare(doc,model,d) {
  const {current,blocked}=candidateState(doc,model,d);
  const baseline=d?.version?.sourceDrawingId?model.drawings.get(P.key(d.packageId,d.version.sourceDrawingId,d.packageRevision)):null;
  const before=spaceMap(current||baseline),after=spaceMap(d),lineage=d?.lineage||[];
  const related=new Set(lineage.flatMap(e=>[...e.parents,...e.children]));
  const records=new Map(doc.public.spaces.map(r=>[r.spaceUuid,r]));
  const equipment=Object.values(doc.public.equipmentByDrawing).flat();
  const changes=[];
  const leftFrame=(current||baseline)?P.alignment(model,current||baseline):null;
  const rightFrame=d?P.alignment(model,d):null;
  const coordinates=(space,frame)=>space.polygon.map(point=>P.transform(frame,point));
  for (const uuid of new Set([...before.keys(),...after.keys(),...related])) {
    const a=before.get(uuid),b=after.get(uuid);
    const nameChanged=Boolean(a&&b&&a.name!==b.name);
    const geometryChanged=Boolean(a&&b&&!equal(coordinates(a,leftFrame),coordinates(b,rightFrame)));
    const attributesChanged=Boolean(a&&b&&['spaceType','areaM2','manualAreaM2','managedAreaM2','invalid'].some(field=>!equal(a[field],b[field])));
    const status=!a&&!b?'lineage':!a?'added':!b?'absent':nameChanged||geometryChanged||attributesChanged?'changed':'same';
    const record=records.get(uuid);
    changes.push({uuid,status,before:a?.name||null,after:b?.name||null,nameChanged,geometryChanged,attributesChanged,related:related.has(uuid),
      impact:record?{recordId:record.id,department:record.department||'',assignee:record.assignee||'',
        equipment:equipment.filter(e=>e.roomId===record.id).map(e=>e.label||e.id),
        fireInspection:Boolean(record.fire?.expiry||record.fire?.note||record.fire?.installed!=null),
        construction:doc.public.constructionHistory.filter(e=>e.roomId===record.id||e.roomIds?.includes(record.id)).length}:null});
  }
  const normalize=(value,roots,key='')=>{
    if(key==='componentDefinition')return value;
    if(Array.isArray(value))return value.map(item=>normalize(item,roots,key));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value)
      .filter(([name])=>!['id','floorId'].includes(name)).map(([name,item])=>[name,normalize(item,roots,name)]));
    const reference=['wallId','wallIds','objectId','objectIds','ownerId','sourceObjectIds','recognitionSourceIds','vertexId','edgeId'].includes(key);
    return reference&&roots.has(value)?roots.get(value):value;
  };
  function objectIndex(drawing) {
    const owned=drawing?.source.objects||[],v=drawing?.version;
    const roots=new Map(owned.map(o=>[o.id,v?.origins[o.id]?.rootObjectId||o.id]));
    return new Map(owned.map(o=>[roots.get(o.id),{content:normalize(o,roots),layer:v?.assignments[o.id]||o.layerId||null}]));
  }
  const left=objectIndex(current||baseline),right=objectIndex(d);
  const objects={added:0,changed:0,absent:0,same:0};
  for(const root of new Set([...left.keys(),...right.keys()])) {
    const status=!left.has(root)?'added':!right.has(root)?'absent':equal(left.get(root),right.get(root))?'same':'changed';
    objects[status]++;
  }
  return {current,baseline,blocked,changes,lineage,objects};
}
function validateDecisions(doc,model) {
  const op=operations(doc), rv=reviews(doc);
  const events=doc.history?.events||[];
  if(!Array.isArray(events))throw new Error('FACI 도면 이력이 올바르지 않습니다.');
  if (!op||typeof op!=='object'||Array.isArray(op)||!rv||typeof rv!=='object'||Array.isArray(rv)) throw new Error('FACI 도면 승인 상태가 올바르지 않습니다.');
  const owners=new Set();
  for (const [level,record] of Object.entries(op)) {
    const d=model.drawings.get(record?.drawingId), l=model.levels.get(level);
    const ids=[record?.drawingId,...(Array.isArray(record?.previous)?record.previous:[])];
    const [packageId]=JSON.parse(level);
    const valid=ids.every(id=>{
      const entry=model.drawings.get(id);
      if(!entry||owners.has(id)||(entry.origin.packageId!==packageId&&entry.packageId!==packageId)||entry.buildingId!==l?.buildingId)return false;
      owners.add(id);
      if(entry.version)return entry.levelKey===level;
      if(entry.levelKey===level)return true;
      return l.drawings.some(v=>v.version&&(v.sourceId===entry.origin.drawingId||entry.packageId===packageId&&v.sourceId===entry.sourceId));
    });
    if (!d||!l||!Array.isArray(record.previous)||!valid) throw new Error('FACI 운영 도면의 층·이전 승인본을 확인할 수 없습니다.');
  }
  for(const event of events.filter(e=>['drawing-approve','drawing-restore','drawing-hold'].includes(e?.type))) {
    const drawing=model.drawings.get(event.drawingId),level=model.levels.get(event.levelKey);
    const date=event.effectiveDate;
    if(!drawing||!level||event.previousDrawingId!=null&&!model.drawings.has(event.previousDrawingId)||
       typeof event.recordedAt!=='string'||!Number.isFinite(Date.parse(event.recordedAt))||
       (event.type==='drawing-hold'?date!==null:typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      throw new Error('FACI 도면 결정 이력의 날짜 또는 참조가 올바르지 않습니다.');
    }
  }
  for (const [drawingId,item] of Object.entries(rv)) {
    if (!model.drawings.get(drawingId)?.version||item?.status!=='held') throw new Error('FACI 보류 도면이 올바르지 않습니다.');
  }
}
function decide(doc,drawingId,action,{actorId,recordedAt=new Date().toISOString(),effectiveDate=localDay(),reviewed=false}={}) {
  const model=P.makeModel(doc.drawings.sources,operations(doc)),d=model.drawings.get(drawingId);
  if (!d||!['approve','hold','restore'].includes(action)||!actorId||!d.version&&action!=='restore') throw new Error('승인할 도면·관리자를 확인하세요.'); 
  const stored=Object.entries(operations(doc)).find(([,record])=>record.previous.includes(d.id));
  const levelKey=d.version?d.levelKey:stored?.[0];
  if(!levelKey)throw new Error('복원할 운영 층을 확인할 수 없습니다.');
  const next=P.clone(doc);
  next.drawings.operationalByLevel ||= {};
  next.drawings.reviews ||= {};
  const op=next.drawings.operationalByLevel[levelKey];
  if (action==='hold') {
    if (d.operational) throw new Error('현재 운영 도면은 보류할 수 없습니다.');
    next.drawings.reviews[d.id]={status:'held'};
  } else {
    const finding=d.version?compare(doc,model,d):{current:model.drawings.get(op?.drawingId)};
    if (action==='restore') {
      if (!op?.previous.includes(d.id)) throw new Error('이전 운영 도면만 복원할 수 있습니다.');
    } else if (finding.blocked) throw new Error(finding.blocked);
    if (!reviewed) throw new Error('공간과 시설관리 자료에 미치는 영향을 확인해 주세요.');
    const previous=op?.drawingId||finding.current?.id;
    const history=new Set(op?.previous||[]);
    if (previous) history.add(previous);
    history.delete(d.id);
    next.drawings.operationalByLevel[levelKey]={drawingId:d.id,previous:[...history]};
    delete next.drawings.reviews[d.id];
  }
  next.history.events.push({id:crypto.randomUUID(),type:'drawing-'+action,levelKey,drawingId:d.id,
    previousDrawingId:op?.drawingId||candidateState(doc,model,d).current?.id||null,sourceRevision:d.record?.revision??null,
    packageRevision:d.packageRevision,recordedAt,effectiveDate:action==='hold'?null:effectiveDate});
  const result=root.FacilityFaciCore.withSources(next,next.drawings.sources);
  validateDecisions(result.document,result.model);
  return result;
}
function buildingAt(doc,model,buildingId,date) {
  const events=(doc.history?.events||[]).filter(e=>['drawing-approve','drawing-restore'].includes(e.type)&&typeof e.effectiveDate==='string'&&e.effectiveDate<=date);
  return [...model.levels.values()].filter(l=>l.buildingId===buildingId).map(level=>{
    const applicable=events.filter(e=>e.levelKey===level.key).sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate)||a.recordedAt.localeCompare(b.recordedAt)).at(-1);
    return {level,drawing:applicable?model.drawings.get(applicable.drawingId):null,date:applicable?.effectiveDate||null};
  });
}
root.FacilityFaciDrawings={operations,reviews,operationLevel,verifySources,validateArchive,stage,candidateState,compare,validateDecisions,decide,buildingAt,localDay,snapshotEquivalent};
})(typeof window!=='undefined'?window:globalThis);
