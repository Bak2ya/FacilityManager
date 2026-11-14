/* PieniPlan Build105 versioned exchange. All projections are read-only. */
(function (root) {
'use strict';
const P = root.FacilityPpkg;
const VERSION_CAP = 'plan.versions.v1';
const HISTORY_CAP = 'plan.history.application.v1';
const STAIR_CAP = 'plan.stair.direction.v1';
const SHUTTER_CAP = 'plan.door.shutter.v1';
const NATURE_CAP = 'plan.nature-style.v1';
const ANNOTATION_CAP = 'cad.annotation.v2';
const CAPABILITIES = [VERSION_CAP, HISTORY_CAP, STAIR_CAP, SHUTTER_CAP, NATURE_CAP, ANNOTATION_CAP];
const HASH = /^[a-f0-9]{64}$/;
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 255 && !/[\x00-\x1f]/.test(value) && !['__proto__','constructor','prototype'].includes(value);
const forbidden = /^(?:passwords?|credentials?|auth(?:entication|orization)?|accessTokens?|secretKeys?|encryptionKeys?|facilityData|facilityAssets|assetMaintenance|departmentAssignments|repairHistory|constructionCosts|inspectionHistory|userAccounts|faci)$/i;
const topFields = 'format fileType schemaVersion requiredCapabilities packageId packageRevision createdAt app buildings drawingModel scope omissions planObjectStyles activeDrawingId';
const modelFields = 'version packageId levels versions records lineage spaceRegistry applicationHistory102';
const objectFields = 'id type floorId layerId cadLayer planRole planGeometry planNature a b center radius startAngle sweep point p1 p2 polygon points seed width height thickness depth rotation scaleX scaleY wallType geometry constraints attachments wallId wallIds t t1 t2 offset axis axisBounds mirrorX mirrorY hinge swing swingSide swingDirection doorType elementKind fireProtection fireRating slideDirection doubleLeafSplit openingDirection name text mtext alignment verticalAlignment lineSpacing textStyle textOverrides spaceUuid spaceType areaM2 areaMode invalid managedAreaM2 managedAreaSource manualAreaM2 sourceRegionId sourceObjectIds recognitionSourceIds recognitionBaselineSignature recognitionConfidence recognizedFromCad recognitionReviewState stairType treadCount upDirection direction102 assetId assetVersion componentDefinition doorModel93 color strokeColor fillColor lineStyle lineWidth lineWeight lineweight linetype opacity planLineAppearance vertices closed curveFit';
const rowFields = 'drawingId levelId name description modifiedDate appliedDate planned current sourceDrawingId sourceFingerprint createdAt updatedAt layers assignments origins excluded activeLayerId activeLayerExplicit sealedFingerprint';
const timestamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const same = (a,b) => P.canonical(a) === P.canonical(b);
function fail(reason) { throw new Error('PPKG 도면 버전: ' + reason); }
function fields(value, names, label) {
  const allowed = new Set(names.split(' '));
  if (!isObject(value) || Object.keys(value).some(key => !allowed.has(key))) fail(label + ' 필드가 올바르지 않습니다.');
}
function finiteData(value, depth=0) {
  if (depth > 40 || typeof value === 'number' && !Number.isFinite(value)) fail('유효하지 않은 데이터 값');
  if (value && typeof value === 'object') {
    for (const [key,item] of Object.entries(value)) {
      if (!id(key) || forbidden.test(key)) fail('도면 범위 밖의 필드: ' + key);
      finiteData(item,depth+1);
    }
  }
}
function dated(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(value+'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
function unique(list,key,label) {
  if (!Array.isArray(list)) fail(label+' 목록이 없습니다.');
  const values = new Map();
  for (const item of list) {
    const value=item?.[key];
    if (!id(value) || values.has(value)) fail(label+' 식별자가 누락되었거나 중복됩니다.');
    values.set(value,item);
  }
  return values;
}
function door(o) {
  return {
    mechanism:o.doorType==='fireDoor'?'hingedSingle':o.doorType==='fireShutter'?'shutter':o.doorType||'hingedSingle',
    protection:o.doorType==='fireDoor'||o.doorType==='fireShutter'?o.doorType:o.fireProtection||null,
    rating:o.fireRating??null
  };
}
function stair(o) {
  const p = o.polygon;
  if (p?.length !== 4) return null;
  const w = {x:p[1].x-p[0].x,y:p[1].y-p[0].y}, l = {x:p[3].x-p[0].x,y:p[3].y-p[0].y};
  const width=Math.hypot(w.x,w.y),length=Math.hypot(l.x,l.y);
  if (!(width>1e-6 && length>1e-6)) return null;
  const u={x:w.x/width,y:w.y/width},v={x:l.x/length,y:l.y/length};
  const direction=(o.upDirection===-1?-1:1)*(o.direction102?.arrowSense==='down'?-1:1);
  const point=(x,y)=>({x:p[0].x+x*u.x+y*v.x,y:p[0].y+x*u.y+y*v.y});
  return {width,length,u,v,direction,point,rotation:Math.atan2(u.y,u.x)*180/Math.PI,
    count:Math.max(2,Math.min(256,Math.trunc(o.treadCount||12))),label:o.direction102?.showLabel?(o.direction102.arrowSense==='down'?'DN':'UP'):null};
}
function validateObject(o,caps,version) {
  if (version===2) fields(o,objectFields,'도면 객체');
  if (o.type==='door'&&o.fireProtection!=null&&!['fireDoor','fireShutter'].includes(o.fireProtection)) fail('지원하지 않는 방화 성능: '+o.fireProtection);
  if (o.doorType==='shutter' && (o.type!=='door'||!caps.has(SHUTTER_CAP)||o.fireProtection!=null&&o.fireProtection!=='fireShutter')) fail('셔터 선언 또는 방화 성능이 올바르지 않습니다.');
  if (Object.hasOwn(o,'direction102')) {
    const d=o.direction102, f=stair(o), p=o.polygon;
    fields(d,'version arrowSense showLabel','계단 방향');
    if (o.type!=='stair'||!caps.has(STAIR_CAP)||d.version!==1||!['up','down'].includes(d.arrowSense)||typeof d.showLabel!=='boolean'||!f||
        ![1,-1].includes(o.upDirection??1)||Math.abs(f.u.x*f.v.x+f.u.y*f.v.y)>1e-8||
        Math.hypot(p[2].x-(p[1].x+p[3].x-p[0].x),p[2].y-(p[1].y+p[3].y-p[0].y))>1e-7*Math.max(1,f.width,f.length)) fail('계단 진행 방향 또는 형상이 올바르지 않습니다.');
  }
  if (version===2 && o.type==='cadText' && (!caps.has(ANNOTATION_CAP)||o.planRole!=='annotation')) fail('Plan 문자 주석의 capability 또는 소속을 확인하세요.');
  if (o.planNature!=null && o.planNature!=='column') fail('지원하지 않는 Plan 의미 객체: '+o.planNature);
  if (o.planGeometry || o.planNature || ['cadCircle','cadPolyline'].includes(o.type)) {
    if (!caps.has(NATURE_CAP)||o.planGeometry!==true||!['cadCircle','cadPolyline'].includes(o.type)) fail('Plan 기하 capability 또는 객체를 확인하세요.');
    if (o.type==='cadCircle' && (!Number.isFinite(o.center?.x)||!Number.isFinite(o.center?.y)||!(o.radius>0))) fail('Plan 원의 반지름·중심이 올바르지 않습니다.');
    if (o.type==='cadPolyline') {
      if (o.curveFit) fail('곡선 맞춤 Plan 폴리라인은 아직 표시를 지원하지 않습니다.');
      if (!Array.isArray(o.vertices)||o.vertices.length<2||typeof o.closed!=='boolean'||o.planNature==='column'&&(!o.closed||o.vertices.length<3)) fail('Plan 폴리라인 구조가 올바르지 않습니다.');
      const edges=polylineEdges(o);
      if (edges.some(e=>!Number.isFinite(e.a.x)||!Number.isFinite(e.a.y)||!Number.isFinite(e.b.x)||!Number.isFinite(e.b.y)||e.radius!=null&&!Number.isFinite(e.radius))) fail('Plan 폴리라인 좌표가 올바르지 않습니다.');
    }
  }
}
function polylineEdges(o) {
  const vertices=o.vertices;
  return vertices.slice(0,o.closed?vertices.length:-1).map((a,i)=>{
    const b=vertices[(i+1)%vertices.length], bulge=a.outgoing?.bulge;
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
    if (!(length>0) || !Number.isFinite(bulge)) fail('Plan 폴리라인 구간이 올바르지 않습니다.');
    if (!bulge) return {a,b};
    const offset=length*(1/bulge-bulge)/4;
    const center={x:(a.x+b.x)/2-dy/length*offset,y:(a.y+b.y)/2+dx/length*offset};
    return {a,b,geometry:'arc',center,radius:Math.hypot(length/2,offset),startAngle:Math.atan2(a.y-center.y,a.x-center.x)*180/Math.PI,sweep:4*Math.atan(bulge)*180/Math.PI};
  });
}
function validateStyles(styles,caps) {
  if (styles==null) return;
  if (!isObject(styles)) fail('Plan 표시 스타일이 올바르지 않습니다.');
  for (const [category,style] of Object.entries(styles)) {
    fields(style,'color pattern','Plan 표시 스타일');
    if (!caps.has(NATURE_CAP)||!['wall','door','fireDoor','fireShutter','window','column'].includes(category)||
        style.color!=null&&!/^#[\da-f]{6}$/i.test(style.color)||style.pattern!=null&&!['solid','dotted','dashed'].includes(style.pattern)) fail('Plan 표시 스타일이 올바르지 않습니다.');
  }
}
function validateVersionPackage(pkg,drawings,buildings,caps) {
  fields(pkg,topFields,'패키지');
  if (!id(pkg.packageId)||!caps.has(VERSION_CAP)||caps.has('plan.drawings.v1')) fail('plan.versions.v1 선언을 확인하세요.');
  const m=pkg.drawingModel;
  fields(m,modelFields,'도면 모델');
  fields(pkg.scope,'kind completePackage authoritativeDeletion','패키지 범위');
  finiteData(pkg);
  if (m.version!==2||m.packageId!==pkg.packageId||pkg.scope.kind!=='full'||pkg.scope.completePackage!==true||
      pkg.scope.authoritativeDeletion!==false||!timestamp(pkg.createdAt)||!HASH.test(pkg.packageRevision||'')) fail('PPKG2 전체 이력 범위 또는 리비전을 확인하세요.');
  if (pkg.activeDrawingId!=null&&!drawings.has(pkg.activeDrawingId)) fail('활성 도면을 찾을 수 없습니다.');
  for (const b of buildings.values()) fields(b,'id name order drawings','건물');
  for (const b of buildings.values()) for (const f of b.drawings) fields(f,'id name order viewAlignment objects','도면');
  const levels=unique(m.levels,'id','물리 층'), rows=unique(m.versions,'drawingId','도면 버전');
  if (rows.size!==drawings.size||[...drawings.keys()].some(k=>!rows.has(k))||!isObject(m.records)||Object.keys(m.records).length!==rows.size) fail('도면·버전·리비전 목록이 다릅니다.');
  for (const l of levels.values()) if (!buildings.has(l.buildingId)||typeof l.name!=='string'||!l.name.trim()) fail('물리 층의 건물이 올바르지 않습니다.');
  const own=new Map([...drawings].map(([k,d])=>[k,new Map(d.objects.map(o=>[o.id,o]))]));
  const objects=new Map([...own.values()].flatMap(items=>[...items]));
  const current=new Set();
  for (const v of rows.values()) {
    fields(v,rowFields,'도면 버전');
    const d=drawings.get(v.drawingId), r=m.records[v.drawingId];
    if (!d||levels.get(v.levelId)?.buildingId!==d.buildingId||typeof v.name!=='string'||!v.name.trim()||v.name!==d.name||
        typeof v.description!=='string'||typeof v.planned!=='boolean'||typeof v.current!=='boolean'||!dated(v.modifiedDate)||
        !dated(v.appliedDate)||!timestamp(v.createdAt)||!timestamp(v.updatedAt)) fail('도면 버전의 소속·날짜·상태가 올바르지 않습니다.');
    if (v.current) {
      if (v.planned||current.has(v.levelId)) fail('한 물리 층의 현재·예정 버전이 충돌합니다.');
      current.add(v.levelId);
    }
    const layers=unique(v.layers,'id','의미형 레이어');
    for (const l of layers.values()) {
      if (!['architecture','fire','electrical','communication','mechanical','custom'].includes(l.group)||typeof l.name!=='string'||!l.name.trim()||
          typeof l.visible!=='boolean'||typeof l.locked!=='boolean') fail('의미형 레이어가 올바르지 않습니다.');
    }
    if (!isObject(v.assignments)||!isObject(v.origins)||!Array.isArray(v.excluded)||typeof v.activeLayerExplicit!=='boolean'||
        v.activeLayerId!==null&&!layers.has(v.activeLayerId)) fail('객체 레이어·계보 연결이 올바르지 않습니다.');
    const ids=own.get(v.drawingId), roots=new Set();
    if (Object.keys(v.assignments).length!==ids.size||Object.keys(v.origins).length!==ids.size) fail('객체 레이어·계보 목록이 다릅니다.');
    for (const o of ids.values()) {
      const origin=v.origins[o.id];
      fields(origin,'rootObjectId sourceObjectId','객체 계보');
      if (!layers.has(v.assignments[o.id])||!id(origin.rootObjectId)||roots.has(origin.rootObjectId)||
          (origin.sourceObjectId===null?origin.rootObjectId!==o.id:!id(origin.sourceObjectId))) fail('객체의 출처가 올바르지 않습니다.');
      roots.add(origin.rootObjectId);
      for (const host of [o.wallId,...(o.wallIds||[]),o.constraints?.reference?.wallId,...Object.values(o.attachments||{}).map(a=>a?.wallId)].filter(Boolean)) {
        if (ids.get(host)?.type==='wall') continue;
        if (o.type==='space'&&o.invalid===true&&!objects.has(host)&&(o.wallIds||[]).includes(host)) continue;
        fail('다른 버전 또는 누락된 벽을 참조합니다.');
      }
    }
    if (v.sourceDrawingId!=null) {
      const parent=rows.get(v.sourceDrawingId),parentItems=own.get(v.sourceDrawingId);
      if (!parent||parent.levelId!==v.levelId||!HASH.test(v.sourceFingerprint||'')||parent.sealedFingerprint!==v.sourceFingerprint) fail('기준 도면 리비전이 올바르지 않습니다.');
      const inherited=new Set();
      for (const origin of Object.values(v.origins)) if (origin.sourceObjectId!=null) {
        if (!parentItems.has(origin.sourceObjectId)||parent.origins?.[origin.sourceObjectId]?.rootObjectId!==origin.rootObjectId) fail('기준 도면 객체 출처가 올바르지 않습니다.');
        inherited.add(origin.sourceObjectId);
      }
      const excluded=new Set(v.excluded);
      if (excluded.size!==v.excluded.length||[...excluded].some(k=>!parentItems.has(k)||inherited.has(k))||
          inherited.size+excluded.size!==parentItems.size) fail('기준 도면에서 포함·제외된 객체 목록이 다릅니다.');
    } else if (v.sourceFingerprint!=null||v.excluded.length||Object.values(v.origins).some(o=>o.sourceObjectId!==null)) fail('기준 도면 없는 버전에 출처가 기록되었습니다.');
    const seen=new Set([v.drawingId]);
    for(let p=rows.get(v.sourceDrawingId);p;p=rows.get(p.sourceDrawingId)) {
      if (seen.has(p.drawingId)) fail('도면 버전의 출처가 순환합니다.');
      seen.add(p.drawingId);
    }
    fields(r,'revision fingerprint elements spaces','도면 리비전');
    if (!Number.isSafeInteger(r.revision)||r.revision<1||!HASH.test(r.fingerprint||'')||!isObject(r.elements)||
        Object.keys(r.elements).length!==ids.size||[...ids.keys()].some(k=>!HASH.test(r.elements[k]||''))||
        !same(r.spaces,Object.fromEntries(d.objects.filter(o=>o.type==='space').map(o=>[o.spaceUuid,o.id])))||
        v.sealedFingerprint!==null&&v.sealedFingerprint!==r.fingerprint) fail('도면 리비전과 객체 목록이 다릅니다.');
  }
  validateRegistry(m,rows,objects);
  if (Object.hasOwn(m,'applicationHistory102')) {
    if (!caps.has(HISTORY_CAP)||!Array.isArray(m.applicationHistory102)||m.applicationHistory102.length>100000) fail('적용 이력 선언이 올바르지 않습니다.');
    for (const event of m.applicationHistory102) {
      fields(event,'drawingId appliedDate recordedAt evidence','적용 이력');
      const v=rows.get(event.drawingId);
      if (!v||v.planned||event.appliedDate!==v.appliedDate||!dated(event.appliedDate)||
          (event.evidence==='explicit'?!timestamp(event.recordedAt):event.evidence!=='legacy-current'||event.recordedAt!==null)) fail('PieniPlan 적용 이력이 올바르지 않습니다.');
    }
  }
}
function validateRegistry(m,rows,objects) {
  if (!isObject(m.spaceRegistry)||!Array.isArray(m.lineage)) fail('공간 등록부 또는 계보 목록이 없습니다.');
  const instances=new Map(),roots=new Set();
  for (const [uuid,entry] of Object.entries(m.spaceRegistry)) {
    fields(entry,'rootObjectId instances','공간 등록부');
    if (!id(uuid)||!id(entry.rootObjectId)||roots.has(entry.rootObjectId)||!isObject(entry.instances)||!Object.keys(entry.instances).length) fail('공간 UUID 출처가 올바르지 않습니다.');
    roots.add(entry.rootObjectId);
    for (const [key,item] of Object.entries(entry.instances)) {
      fields(item,'drawingId excluded sourceObjectId snapshot','공간 버전 인스턴스');
      const o=item.snapshot,v=rows.get(item.drawingId),live=objects.get(key);
      if (!id(key)||instances.has(key)||!v||typeof item.excluded!=='boolean'||o?.id!==key||o.type!=='space'||o.spaceUuid!==uuid||o.floorId!==v.drawingId||
          !Array.isArray(o.polygon)||o.polygon.length<3||!o.polygon.every(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y))||
          (item.sourceObjectId===null?entry.rootObjectId!==key:!id(item.sourceObjectId))) fail('공간 인스턴스가 올바르지 않습니다.');
      fields(o,objectFields,'공간 스냅샷');
      if (item.excluded ? Boolean(live) : !same(live,o)||v.origins[key]?.rootObjectId!==entry.rootObjectId||v.origins[key]?.sourceObjectId!==item.sourceObjectId) fail('공간 등록부와 도면 내용이 다릅니다.');
      instances.set(key,{...item,uuid});
    }
  }
  for (const o of objects.values()) if (o.type==='space'&&!instances.has(o.id)) fail('공간 등록부에 객체가 누락되었습니다.');
  for (const item of instances.values()) if (item.sourceObjectId!==null) {
    const source=instances.get(item.sourceObjectId);
    if (!source||source.uuid!==item.uuid||source.drawingId!==rows.get(item.drawingId).sourceDrawingId) fail('공간 UUID가 다른 출처로 재사용되었습니다.');
  }
  const edges=new Map(),childrenSeen=new Set();
  for (const event of m.lineage) {
    fields(event,'drawingId kind parents children parentInstances childInstances createdAt','공간 계보');
    const v=rows.get(event.drawingId),{parents,children,parentInstances,childInstances}=event;
    if (!v||!timestamp(event.createdAt)||!Array.isArray(parents)||!Array.isArray(children)||
        new Set([...parents,...children]).size!==parents.length+children.length||
        (event.kind==='split'?parents.length!==1||children.length<2:event.kind!=='merge'||parents.length<2||children.length!==1)||
        !Array.isArray(parentInstances)||!Array.isArray(childInstances)||parentInstances.length!==parents.length||childInstances.length!==children.length) fail('공간 분할·통합 기록이 올바르지 않습니다.');
    const ancestry=new Set();
    for (let p=v;p;p=rows.get(p.sourceDrawingId)) ancestry.add(p.drawingId);
    for (const [links,uuids,child] of [[parentInstances,parents,false],[childInstances,children,true]]) {
      links.forEach((link,i)=>{
        fields(link,'spaceUuid drawingId objectId','공간 계보 참조');
        const item=instances.get(link.objectId);
        if (!item||link.spaceUuid!==uuids[i]||item.uuid!==link.spaceUuid||item.drawingId!==link.drawingId||
            (child ? link.drawingId!==v.drawingId||item.sourceObjectId!==null||childrenSeen.has(item.uuid) :
              !ancestry.has(item.drawingId)||item.drawingId===v.drawingId&&!item.excluded)) fail('분할·통합 공간을 확인할 수 없습니다.');
        if (child) childrenSeen.add(item.uuid);
      });
    }
    for (const parent of parents) edges.set(parent,[...(edges.get(parent)||[]),...children]);
  }
  const visiting=new Set(),visited=new Set();
  function visit(uuid) {
    if (visiting.has(uuid)) fail('공간 계보가 순환합니다.');
    if (visited.has(uuid)) return;
    visiting.add(uuid);
    for (const child of edges.get(uuid)||[]) visit(child);
    visiting.delete(uuid);visited.add(uuid);
  }
  for (const uuid of edges.keys()) visit(uuid);
}
async function sha(value) {
  const bytes=new TextEncoder().encode(P.canonical(value));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
const v1Metadata='id buildingId name discipline levelId sourceRegionId baseDrawingId baseRevision baseFingerprint baseView viewAlignment sourceReferenceFingerprint referenceSourcesOmitted externalSourceRegionId'.split(' ');
const pick=(object,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(object,k)).map(k=>[k,object[k]]));
async function subsetV1(pkg,drawingId) {
  P.validate(pkg);
  if(pkg.schemaVersion!==1||!pkg.drawingModel)throw new Error('부분 내보내기는 범위를 기록하는 PPKG1 도면에서 사용할 수 있습니다.');
  const available=new Map(pkg.buildings.flatMap(b=>b.drawings.map(d=>[d.id,d])));
  const wanted=new Set(),pending=[drawingId];
  while(pending.length) {
    const key=pending.pop(),d=available.get(key);
    if(wanted.has(key))continue;
    if(!d)throw new Error('부분 내보내기에 필요한 기준 도면을 찾을 수 없습니다.');
    wanted.add(key);
    if(d.baseDrawingId)pending.push(d.baseDrawingId);
    if(d.viewAlignment?.referenceFloorId)pending.push(d.viewAlignment.referenceFloorId);
  }
  const next=P.clone(pkg),m=next.drawingModel;
  next.buildings=next.buildings.map(b=>({...b,drawings:b.drawings.filter(d=>wanted.has(d.id))})).filter(b=>b.drawings.length);
  const levelIds=new Set(next.buildings.flatMap(b=>b.drawings.map(d=>d.levelId).filter(Boolean)));
  m.levels=m.levels.filter(l=>levelIds.has(l.id));
  m.records=Object.fromEntries(Object.entries(m.records).filter(([k])=>wanted.has(k)));
  m.lineage=(m.lineage||[]).filter(e=>wanted.has(e.drawingId));
  if(m.spaceOrigins)m.spaceOrigins=Object.fromEntries(Object.entries(m.spaceOrigins).filter(([,d])=>wanted.has(d)||(m.retiredDrawingIds||[]).includes(d)));
  if(m.exchangeScope)m.exchangeScope={...m.exchangeScope,completePackage:false,origins:Object.fromEntries(Object.entries(m.exchangeScope.origins||{}).filter(([k])=>wanted.has(k)))};
  next.scope={kind:'drawing',completePackage:false,authoritativeDeletion:false,requestedDrawingIds:[drawingId],includedDrawingIds:next.buildings.flatMap(b=>b.drawings.map(d=>d.id))};
  // Legacy fixtures sometimes predate the final producer hashes. Only emit a new
  // subset when the retained bytes match the current PieniPlan fingerprint contract.
  for(const b of next.buildings)for(const d of b.drawings) {
    const record=m.records[d.id],elements=Object.fromEntries(await Promise.all(d.objects.map(async o=>[o.id,await sha(o)])));
    if(!same(record.elements,elements)||await sha({metadata:pick({...d,buildingId:b.id},v1Metadata),elements})!==record.fingerprint) {
      throw new Error('이 PPKG1 원본의 fingerprint는 현재 교환 계약과 다릅니다. 보관 원본 전체를 내보낼 수 있습니다.');
    }
  }
  next.packageRevision=await sha({packageId:next.packageId,buildings:next.buildings,levels:m.levels,
    records:Object.fromEntries(Object.entries(m.records).map(([k,r])=>[k,pick(r,['revision','fingerprint','deleted'])])),
    lineage:m.lineage,retiredSpaceUuids:m.retiredSpaceUuids||[],origins:m.exchangeScope?.origins||{},scope:next.scope,styles:next.planObjectStyles||{}});
  P.validate(next);
  return next;
}
async function verify(pkg) {
  P.validate(pkg);
  if (pkg.schemaVersion!==2) return;
  const m=pkg.drawingModel;
  if (await sha({packageId:pkg.packageId,buildings:pkg.buildings,drawingModel:m,planObjectStyles:pkg.planObjectStyles||{}})!==pkg.packageRevision) fail('패키지 fingerprint가 내용과 다릅니다.');
  const rows=new Map(m.versions.map(v=>[v.drawingId,v])), retired=new Map();
  for (const [uuid,entry] of Object.entries(m.spaceRegistry)) for (const item of Object.values(entry.instances)) if (item.excluded) {
    const list=retired.get(item.drawingId)||[];
    list.push({uuid,rootObjectId:entry.rootObjectId,...item});retired.set(item.drawingId,list);
  }
  for (const b of pkg.buildings) for (const d of b.drawings) {
    const v=rows.get(d.id),r=m.records[d.id];
    const retiredSpaces=(retired.get(d.id)||[]).sort((a,b)=>a.snapshot.id<b.snapshot.id?-1:a.snapshot.id>b.snapshot.id?1:0);
    const expected=await sha({objects:d.objects,assignments:v.assignments,origins:v.origins,
      layers:v.layers.map(({id,group,name})=>({id,group,name})),retiredSpaces,lineage:m.lineage.filter(e=>e.drawingId===d.id)});
    if (expected!==r.fingerprint) fail('도면 fingerprint가 내용과 다릅니다: '+d.name);
    for(let i=0;i<d.objects.length;i+=128) {
      const batch=d.objects.slice(i,i+128);
      const matches=await Promise.all(batch.map(async o=>await sha(o)===r.elements[o.id]));
      if (matches.some(ok=>!ok)) fail('객체 fingerprint가 내용과 다릅니다: '+d.name);
    }
  }
}
function sourceStatus(v) {
  return v.planned?'planned':v.current?'current':v.sealedFingerprint?'past':'draft';
}
root.FacilityPpkgVersions={CAPABILITIES,VERSION_CAP,HISTORY_CAP,ANNOTATION_CAP,validateVersionPackage,validateObject,validateStyles,finiteData,verify,subsetV1,door,stair,polylineEdges,sourceStatus,same};
})(typeof window!=='undefined'?window:globalThis);
