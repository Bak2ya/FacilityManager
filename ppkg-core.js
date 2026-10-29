/* FacilityManager PPKG reader. View-only integration; this is not a FACI schema. */
(function (root) {
'use strict';
const FORMAT = 'PieniPlanPlanPackage';
const CAPABILITIES = new Set(['plan.drawings.v1', 'plan.components.v2', 'plan.door.mechanism.v1']);
const TYPES = new Set(['wall','door','window','space','stair','component','line','dimension','cadText']);
const clone = v => JSON.parse(JSON.stringify(v));
const str = v => typeof v === 'string' && v.trim().length > 0;
const finite = v => typeof v === 'number' && Number.isFinite(v);
const point = p => p && finite(p.x) && finite(p.y);
const key = (...parts) => JSON.stringify(parts);
function fail(message) { throw new Error(message); }
function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k)+':'+canonical(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function assertPoint(p, label) { if (!point(p)) fail(label + ': 유효한 x/y 좌표가 필요합니다.'); }
function assertPolygon(p, label) {
  if (!Array.isArray(p) || p.length < 3) fail(label + ': 경계점이 3개 이상 필요합니다.');
  p.forEach(v => assertPoint(v,label));
}
function polygonAreaM2(p) {
  if (!Array.isArray(p) || p.length<3) return null;
  const origin=p[0];let sum=0;
  for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];sum+=(a.x-origin.x)*(b.y-origin.y)-(b.x-origin.x)*(a.y-origin.y);}
  return Math.abs(sum)/2000000;
}
function validate(pkg) {
  if (!pkg || pkg.format !== FORMAT) fail('PieniPlan PPKG 형식이 아닙니다.');
  if (pkg.schemaVersion !== 1) fail('지원하지 않는 PPKG schemaVersion입니다. 지원 버전: 1');
  if (!str(pkg.packageId)) fail('PPKG packageId가 없습니다.');
  if (pkg.requiredCapabilities != null && !Array.isArray(pkg.requiredCapabilities)) fail('requiredCapabilities 배열이 올바르지 않습니다.');
  for (const c of pkg.requiredCapabilities || []) if (!CAPABILITIES.has(c)) fail('미지원 필수 기능: ' + String(c));
  const extended = (pkg.requiredCapabilities || []).includes('plan.drawings.v1');
  if (!!pkg.drawingModel !== extended) fail('drawingModel과 plan.drawings.v1 선언이 일치하지 않습니다.');
  if (!Array.isArray(pkg.buildings) || !pkg.buildings.length) fail('건물이 하나 이상 필요합니다.');
  const buildings = new Map(), drawings = new Map(), elements = new Set(), spaces = new Set(), warnings = new Set();
  for (const b of pkg.buildings) {
    if (!str(b.id) || buildings.has(b.id)) fail('건물 ID가 없거나 중복됩니다.');
    buildings.set(b.id,b);
    if (!Array.isArray(b.drawings) || !b.drawings.length) fail('건물에 도면이 하나 이상 필요합니다.');
    for (const d of b.drawings) {
      if (!str(d.id) || drawings.has(d.id)) fail('도면 ID가 없거나 중복됩니다.');
      if (!Array.isArray(d.objects)) fail('도면 객체 배열이 없습니다.');
      drawings.set(d.id,{...d,buildingId:b.id});
      const own = new Map();
      for (const o of d.objects) {
        if (!str(o.id) || elements.has(o.id)) fail('도면 객체 ID가 없거나 중복됩니다.');
        elements.add(o.id); own.set(o.id,o);
        if (o.floorId !== d.id) fail('객체의 floorId가 소속 도면과 다릅니다.');
        if (!TYPES.has(o.type)) fail('미지원 도면 객체: ' + String(o.type));
        for (const n of ['width','thickness','rotation','scaleX','scaleY','t','radius','startAngle','sweep','areaM2','managedAreaM2','manualAreaM2']) {
          if (o[n] != null && !finite(o[n])) fail('객체의 ' + n + ' 값이 올바르지 않습니다.');
        }
        if (o.type === 'wall' || o.type === 'line') {
          assertPoint(o.a,o.type); assertPoint(o.b,o.type);
          if (o.type==='wall' && o.geometry && !['straight','arc'].includes(o.geometry)) fail('미지원 벽 형상: '+o.geometry);
          if (o.geometry==='arc') {
            assertPoint(o.center,'곡선 벽');
            if (!(o.radius>0) || !finite(o.startAngle) || !finite(o.sweep) || Math.abs(o.sweep)>360) fail('곡선 벽의 반지름·각도가 올바르지 않습니다.');
          }
        }
        if (o.type === 'space' || o.type === 'stair') assertPolygon(o.polygon,o.type);
        if (o.type === 'space') {
          if (extended && !str(o.spaceUuid)) fail('확장형 공간에 spaceUuid가 없습니다.');
          if (o.spaceUuid) { if (!str(o.spaceUuid) || spaces.has(o.spaceUuid)) fail('spaceUuid가 중복되거나 올바르지 않습니다.'); spaces.add(o.spaceUuid); }
          else warnings.add('일부 기본형 공간은 UUID가 없어 업무정보 연결을 사용하지 않습니다.');
          if (o.invalid) warnings.add('유효하지 않음으로 표시된 공간이 있습니다.');
        }
        if (o.type==='component') {
          assertPoint(o.point,'구성품');
          if (!o.componentDefinition || !Array.isArray(o.componentDefinition.paths)) fail('구성품 2D 정의가 없습니다.');
          for (const p of o.componentDefinition.paths) {
            if (!Array.isArray(p.points) || p.points.length<2) fail('구성품 경로가 올바르지 않습니다.');
            p.points.forEach(v=>assertPoint(v,'구성품 경로'));
          }
        }
        if (o.type==='cadText') assertPoint(o.point,'주석');
        if (o.type==='dimension') { assertPoint(o.p1,'치수'); assertPoint(o.p2,'치수'); }
        if (o.type==='door' || o.type==='window') {
          if (!(o.width>0) || !finite(o.t) || o.t<0 || o.t>1) fail('문·창의 폭 또는 벽 위 위치가 올바르지 않습니다.');
          if (o.doorModel93) {
            if (o.doorModel93.version!==1) fail('미지원 doorModel93 버전입니다.');
            warnings.add('신규 문 기구는 평면 간략 기호로 표시합니다. 상세 제작 형상은 PieniPlan에서 확인하세요.');
          }
        }
      }
      for (const o of d.objects) {
        if (['door','window'].includes(o.type) && own.get(o.wallId)?.type!=='wall') fail('문·창의 호스트 벽을 찾을 수 없습니다.');
        for (const id of o.wallIds || []) if (own.get(id)?.type!=='wall') fail('공간이 참조하는 벽을 찾을 수 없습니다.');
      }
      if (d.viewAlignment) {
        const a=d.viewAlignment;
        if (a.version!==1 || !finite(a.x) || !finite(a.y) || !finite(a.rotation)) fail('도면 정렬 정보가 올바르지 않습니다.');
      }
      if (d.baseView?.opacity!=null && (!finite(d.baseView.opacity) || d.baseView.opacity<0 || d.baseView.opacity>1)) fail('기준 도면 투명도가 올바르지 않습니다.');
    }
  }
  const dm=pkg.drawingModel;
  if (extended) {
    if (dm.version!==1 || dm.packageId!==pkg.packageId || !Array.isArray(dm.levels) || !dm.records || Array.isArray(dm.records)) fail('drawingModel 구조가 올바르지 않습니다.');
    const levels=new Map();
    for (const l of dm.levels) {
      if (!str(l.id) || levels.has(l.id) || !buildings.has(l.buildingId)) fail('물리 층 ID 또는 소속 건물이 올바르지 않습니다.');
      levels.set(l.id,l);
    }
    for (const d of drawings.values()) {
      if (d.levelId && levels.get(d.levelId)?.buildingId!==d.buildingId) fail('도면의 물리 층 참조가 올바르지 않습니다.');
      const r=dm.records[d.id];
      if (!r || !Number.isInteger(r.revision) || r.revision<0 || !/^[a-f0-9]{64}$/i.test(r.fingerprint||'')) fail('도면 리비전 기록이 올바르지 않습니다.');
      if (canonical(Object.keys(r.elements||{}).sort())!==canonical(d.objects.map(o=>o.id).sort())) fail('리비전의 객체 목록이 도면과 다릅니다.');
      const sm=Object.fromEntries(d.objects.filter(o=>o.type==='space').map(o=>[o.spaceUuid,o.id]));
      if (canonical(r.spaces||{})!==canonical(sm)) fail('리비전의 공간 UUID 연결이 도면과 다릅니다.');
      if (r.deleted || (dm.retiredDrawingIds||[]).includes(d.id)) fail('퇴역한 도면이 현행 도면에 포함되어 있습니다.');
    }
    for (const u of dm.retiredSpaceUuids||[]) if (spaces.has(u)) fail('퇴역한 공간 UUID가 다시 사용되었습니다.');
    const scope=pkg.scope;
    if (!scope || typeof scope.completePackage!=='boolean' || scope.authoritativeDeletion!==false || !Array.isArray(scope.includedDrawingIds) || !Array.isArray(scope.requestedDrawingIds)) fail('패키지 범위·삭제 정책이 올바르지 않습니다.');
    if (canonical([...drawings.keys()].sort())!==canonical([...scope.includedDrawingIds].sort())) fail('포함 도면 목록이 실제 도면과 다릅니다.');
    if (scope.requestedDrawingIds.some(id=>!drawings.has(id))) fail('요청 도면이 포함 도면에 없습니다.');
    if (!/^[a-f0-9]{64}$/i.test(pkg.packageRevision||'')) fail('패키지 리비전이 올바르지 않습니다.');
  }
  const visit=(id,path=new Set())=>{
    if (path.has(id)) fail('기준 도면·정렬 참조가 순환합니다.');
    const d=drawings.get(id); if (!d) fail('기준 도면·정렬 참조가 누락되었습니다.');
    const next=new Set(path);next.add(id);
    for (const ref of new Set([d.baseDrawingId,d.viewAlignment?.referenceFloorId].filter(Boolean))) visit(ref,next);
  };
  for (const id of drawings.keys()) visit(id);
  if (pkg.omissions?.externalSources?.length || pkg.omissions?.nonPlanElementIds?.length) warnings.add('PPKG에 포함되지 않은 CAD·외부참조가 있습니다.');
  return {extended,warnings:[...warnings],buildings:buildings.size,drawings:drawings.size,spaces:spaces.size,objects:elements.size};
}
function makeModel(packages=[]) {
  const model={packages:[],buildings:[],drawings:new Map(),spaces:new Map(),warnings:[]};
  const bmap=new Map();
  for (const input of packages) {
    const pkg=input.document||input, report=validate(pkg);
    model.warnings.push(...report.warnings);
    model.packages.push({name:input.name||'PPKG',document:pkg});
    const local=new Map();
    for (const b of pkg.buildings) for (const d of b.drawings) {
      const origin=pkg.drawingModel?.exchangeScope?.origins?.[d.id];
      local.set(d.id,key(origin?.packageId||pkg.packageId,origin?.drawingId||d.id));
    }
    for (const b of pkg.buildings) {
      const bk=key(pkg.packageId,b.id);
      let building=bmap.get(bk);
      if (!building) {building={id:bk,sourceId:b.id,name:b.name||'이름 없는 건물',drawings:[]};bmap.set(bk,building);model.buildings.push(building);}
      for (const d of b.drawings) {
        const dk=local.get(d.id),old=model.drawings.get(dk);
        // Compare actual payload as well as claimed revision; hashes are not authentication.
        if (old) {
          if (canonical(old.source)!==canonical(d)) fail('같은 출처의 변경 도면입니다. 이 빌드는 업데이트 승인을 지원하지 않아 덮어쓰기를 차단했습니다.');
          continue;
        }
        const entry={id:dk,sourceId:d.id,buildingId:bk,source:d,packageId:pkg.packageId,
          origin:pkg.drawingModel?.exchangeScope?.origins?.[d.id]||{packageId:pkg.packageId,drawingId:d.id},
          level:pkg.drawingModel?.levels?.find(l=>l.id===d.levelId)||null,
          record:pkg.drawingModel?.records?.[d.id]||null,baseId:d.baseDrawingId?local.get(d.baseDrawingId):null,
          alignmentReference:d.viewAlignment?.referenceFloorId?local.get(d.viewAlignment.referenceFloorId):null};
        model.drawings.set(dk,entry);building.drawings.push(entry);
        for (const o of d.objects.filter(o=>o.type==='space')) {
          const sk=o.spaceUuid||key('unlinked-legacy',dk,o.id);
          if (model.spaces.has(sk)) fail('여러 도면·패키지의 공간 UUID가 충돌합니다. 자동 연결하지 않았습니다.');
          model.spaces.set(sk,{key:sk,spaceUuid:o.spaceUuid||null,object:o,drawing:entry});
        }
      }
    }
  }
  model.buildings=model.buildings.filter(b=>b.drawings.length);
  model.warnings=[...new Set(model.warnings)];
  return model;
}
const IDENTITY=[1,0,0,1,0,0];
function multiply(a,b) {return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
function transform(m,p) {return {x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]};}
function alignment(model,d) {
  const a=d.source.viewAlignment;if (!a) return IDENTITY;
  const r=a.rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r),local=[c,s,-s,c,a.x,a.y];
  return d.alignmentReference?multiply(alignment(model,model.drawings.get(d.alignmentReference)),local):local;
}
function layersFor(model,d,options={}) {
  const layers=[];
  const add=(e,opacity=1,filter=null)=>{
    const bv=e.source.baseView;
    if (e.baseId && bv?.visible!==false && (!options.print || bv?.print!==false)) add(model.drawings.get(e.baseId),opacity*(bv?.opacity??.55),bv?.layers||null);
    layers.push({drawing:e,matrix:alignment(model,e),opacity,filter});
  };
  add(d);return layers;
}
function visibleObject(o,filter) {
  if (!filter) return true;
  if (Array.isArray(filter)) return filter.includes(o.layerId);
  return filter[o.layerId]!==false;
}
function wallPoint(w,t) {
  if (w.geometry==='arc') {const a=(w.startAngle+w.sweep*t)*Math.PI/180;return {x:w.center.x+w.radius*Math.cos(a),y:w.center.y+w.radius*Math.sin(a),angle:a+(w.sweep>=0?1:-1)*Math.PI/2};}
  return {x:w.a.x+(w.b.x-w.a.x)*t,y:w.a.y+(w.b.y-w.a.y)*t,angle:Math.atan2(w.b.y-w.a.y,w.b.x-w.a.x)};
}
function objectPoints(o,own) {
  if (o.type==='wall') {
    if (o.geometry==='arc') return Array.from({length:73},(_,i)=>wallPoint(o,i/72));
    return [o.a,o.b];
  }
  if (o.polygon) return o.polygon;
  if (o.type==='component') {
    const angle=(o.rotation||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    return o.componentDefinition.paths.flatMap(p=>p.points).map(p=>{
      const x=p.x*(o.scaleX??1)*(o.mirrorX?-1:1),y=p.y*(o.scaleY??1)*(o.mirrorY?-1:1);
      return {x:o.point.x+x*c-y*s,y:o.point.y+x*s+y*c};
    });
  }
  if (['door','window'].includes(o.type)) {const p=wallPoint(own.get(o.wallId),o.t),r=o.width;return [{x:p.x-r,y:p.y-r},{x:p.x+r,y:p.y+r}];}
  return [o.a,o.b,o.point,o.p1,o.p2].filter(point);
}
function view(model,d) {
  const layers=layersFor(model,d),pts=[];
  for (const layer of layers) {
    const own=new Map(layer.drawing.source.objects.map(o=>[o.id,o]));
    for (const o of layer.drawing.source.objects) if (visibleObject(o,layer.filter)) pts.push(...objectPoints(o,own).map(p=>transform(layer.matrix,p)));
  }
  let minX=0,minY=0,maxX=1000,maxY=700;
  if (pts.length) {minX=Infinity;minY=Infinity;maxX=-Infinity;maxY=-Infinity;for(const p of pts){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}}
  const scale=Math.min(900/Math.max(1,maxX-minX),600/Math.max(1,maxY-minY));
  const matrix=[scale,0,0,-scale,500-(maxX+minX)*scale/2,350+(maxY+minY)*scale/2];
  const rooms=[];
  for(const layer of layers) for (const o of layer.drawing.source.objects) if(o.type==='space'&&visibleObject(o,layer.filter)) {
    const id=o.spaceUuid||key('unlinked-legacy',layer.drawing.id,o.id),space=model.spaces.get(id),m=multiply(matrix,layer.matrix);
    rooms.push({id,no:'',name:o.name||'이름 없는 공간',areaM2:o.areaM2??null,geometry:o.polygon.map(p=>{const q=transform(m,p);return[q.x,q.y]}),spaceUuid:o.spaceUuid||null,spaceType:o.spaceType||'',_ppkg:space});
  }
  return {id:d.id,label:d.source.name||'이름 없는 도면',name:d.source.name||'',width:1000,height:700,rooms,equipment:[],doors:[],windows:[],objects:[],cadReference:null,layers,matrix,scale,bounds:{minX,minY,maxX,maxY}};
}
function findManagementLink(pub,space) {
  if (!space?.spaceUuid || !pub) return {status:'unlinked'};
  const matches=[];
  for (const b of pub.buildings||[]) for (const f of b.floors||[]) for (const r of f.rooms||[]) {
    const link=r.drawingLink;
    if (!link || link.spaceUuid!==space.spaceUuid) continue;
    if (link.originPackageId && link.originPackageId!==space.drawing.origin.packageId) continue;
    if (link.originDrawingId && link.originDrawingId!==space.drawing.origin.drawingId) continue;
    matches.push({room:r,building:b,floor:f});
  }
  return matches.length===1?{status:'linked',...matches[0]}:{status:matches.length?'ambiguous':'unlinked'};
}
root.FacilityPpkg={FORMAT,CAPABILITIES:[...CAPABILITIES],clone,canonical,validate,makeModel,key,multiply,transform,alignment,layersFor,visibleObject,wallPoint,objectPoints,view,findManagementLink,polygonAreaM2};
})(typeof window!=='undefined'?window:globalThis);
