'use strict';

function send(id, data){ postMessage({id, ...data}); }
function progress(id, stage, ratio, detail=''){ send(id,{progress:{stage,ratio,detail}}); }

function q(arr,p){ if(!arr.length)return 0; const i=Math.max(0,Math.min(arr.length-1,Math.floor((arr.length-1)*p))); return arr[i]; }
function entityCenter(e){
  if(e.type==='line') return [(e.x1+e.x2)/2,(e.y1+e.y2)/2];
  if(e.type==='polyline'){ let x=0,y=0; for(const p of e.points){x+=p[0];y+=p[1]} return [x/e.points.length,y/e.points.length]; }
  if(e.type==='circle') return [e.cx,e.cy];
  return [e.x||0,e.y||0];
}
function entityPoints(e){
  if(e.type==='line')return [[e.x1,e.y1],[e.x2,e.y2]];
  if(e.type==='polyline')return e.points||[];
  if(e.type==='circle')return [[e.cx-e.r,e.cy-e.r],[e.cx+e.r,e.cy+e.r]];
  if(e.type==='text')return [[e.x,e.y]];
  return [];
}
function boundsForEntities(ents){
  let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
  for(const e of ents){for(const p of entityPoints(e)){if(!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue; minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);miny=Math.min(miny,p[1]);maxy=Math.max(maxy,p[1]);}}
  return Number.isFinite(minx)?{minx,miny,maxx,maxy}:{minx:0,miny:0,maxx:1,maxy:1};
}
function robustMain(ents){
  if(ents.length<50) return {entities:ents,bounds:boundsForEntities(ents),outlierCount:0};
  const centers=ents.map(entityCenter).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
  const xs=centers.map(p=>p[0]).sort((a,b)=>a-b), ys=centers.map(p=>p[1]).sort((a,b)=>a-b);
  const mx=q(xs,.5), my=q(ys,.5);
  const dxs=centers.map(p=>Math.abs(p[0]-mx)).sort((a,b)=>a-b), dys=centers.map(p=>Math.abs(p[1]-my)).sort((a,b)=>a-b);
  const madx=Math.max(1,q(dxs,.5)), mady=Math.max(1,q(dys,.5));
  const tx=Math.max(madx*20,(q(xs,.99)-q(xs,.01))*1.35,1), ty=Math.max(mady*20,(q(ys,.99)-q(ys,.01))*1.35,1);
  const kept=ents.filter(e=>{const c=entityCenter(e);return Math.abs(c[0]-mx)<=tx&&Math.abs(c[1]-my)<=ty});
  if(kept.length<ents.length*.75) return {entities:ents,bounds:boundsForEntities(ents),outlierCount:0};
  return {entities:kept,bounds:boundsForEntities(kept),outlierCount:ents.length-kept.length};
}

function detectRegions(ents){
  const main=robustMain(ents), e=main.entities;
  if(e.length<20) return {mainBounds:main.bounds,outlierCount:main.outlierCount,candidates:[]};
  const b=main.bounds, w=Math.max(1,b.maxx-b.minx), h=Math.max(1,b.maxy-b.miny);
  const cols=70, rows=Math.max(30,Math.min(70,Math.round(cols*h/w)));
  const cellW=w/cols, cellH=h/rows;
  const counts=new Map(), members=new Map();
  for(let i=0;i<e.length;i++){
    const c=entityCenter(e[i]);
    let gx=Math.floor((c[0]-b.minx)/cellW), gy=Math.floor((c[1]-b.miny)/cellH);
    gx=Math.max(0,Math.min(cols-1,gx));gy=Math.max(0,Math.min(rows-1,gy));
    const k=gx+','+gy; counts.set(k,(counts.get(k)||0)+1); if(!members.has(k))members.set(k,[]);members.get(k).push(i);
  }
  const occupied=new Set([...counts].filter(([,n])=>n>=3).map(([k])=>k));
  const dilated=new Set(occupied);
  for(const k of occupied){const [x,y]=k.split(',').map(Number);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<cols&&ny<rows)dilated.add(nx+','+ny)}}
  const seen=new Set(), comps=[];
  for(const k of dilated){if(seen.has(k))continue;const stack=[k],cells=[];seen.add(k);while(stack.length){const cur=stack.pop();cells.push(cur);const [x,y]=cur.split(',').map(Number);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nk=(x+dx)+','+(y+dy);if(dilated.has(nk)&&!seen.has(nk)){seen.add(nk);stack.push(nk)}}}comps.push(cells)}
  const candidates=[];
  for(const cells of comps){
    const cellSet=new Set(cells), idx=[];
    for(const [k,arr] of members){if(cellSet.has(k))idx.push(...arr)}
    const uniq=[...new Set(idx)]; if(uniq.length<Math.max(35,e.length*.0025))continue;
    const eb=boundsForEntities(uniq.map(i=>e[i]));
    if((eb.maxx-eb.minx)<w*.006||(eb.maxy-eb.miny)<h*.006)continue;
    candidates.push({box:eb,count:uniq.length});
  }
  candidates.sort((a,b2)=>b2.count-a.count);
  const trimmed=candidates.slice(0,12).sort((a,b2)=> b2.box.maxy-a.box.maxy || a.box.minx-b2.box.minx);
  return {mainBounds:main.bounds,outlierCount:main.outlierCount,candidates:trimmed};
}

function dxfHeaderUnits(text){
  const lines=text.replace(/\r/g,'').split('\n');
  for(let i=0;i+3<lines.length;i+=2){if(lines[i].trim()==='9'&&lines[i+1].trim()==='$INSUNITS'){for(let j=i+2;j<Math.min(lines.length,i+14);j+=2){if(lines[j].trim()==='70'){const n=Number(lines[j+1].trim());if(Number.isFinite(n))return n}}}}
  return 0;
}
function dxfUnitInfo(code){const map={1:['inch',.0254],2:['ft',.3048],4:['mm',.001],5:['cm',.01],6:['m',1]};const v=map[code];return v?{code,label:v[0],metersPerUnit:v[1]}:{code:code||0,label:'미지정',metersPerUnit:null}}
function toPairs(text){const lines=text.replace(/\r/g,'').split('\n'),pairs=[];for(let i=0;i+1<lines.length;i+=2){const code=Number(lines[i].trim());if(Number.isFinite(code))pairs.push({code,value:lines[i+1].trim()})}return pairs}
function sectionRange(pairs,name){for(let i=0;i<pairs.length-1;i++){if(pairs[i].code===0&&pairs[i].value==='SECTION'&&pairs[i+1].code===2&&pairs[i+1].value===name){const s=i+2;for(let j=s;j<pairs.length;j++)if(pairs[j].code===0&&pairs[j].value==='ENDSEC')return[s,j]}}return[-1,-1]}
const num=(a,c,d=0)=>{const p=a.find(x=>x.code===c);const n=p?Number(p.value):d;return Number.isFinite(n)?n:d}, str=(a,c,d='')=>{const p=a.find(x=>x.code===c);return p?p.value:d};
function readRecord(pairs,i,end){if(i>=end||pairs[i].code!==0)return null;const type=pairs[i].value;i++;
  if(type==='POLYLINE'){const head=[];while(i<end&&pairs[i].code!==0)head.push(pairs[i++]);const verts=[];while(i<end&&pairs[i].code===0&&pairs[i].value==='VERTEX'){i++;const a=[];while(i<end&&pairs[i].code!==0)a.push(pairs[i++]);verts.push([num(a,10),num(a,20)])}if(i<end&&pairs[i].code===0&&pairs[i].value==='SEQEND')i++;return{type,a:head,verts,next:i}}
  const a=[];while(i<end&&pairs[i].code!==0)a.push(pairs[i++]);return{type,a,next:i};
}
function primitiveFromRecord(r,defaultLayer='0'){
  const a=r.a, layer=str(a,8,defaultLayer)||defaultLayer;
  if(r.type==='LINE')return[{type:'line',x1:num(a,10),y1:num(a,20),x2:num(a,11),y2:num(a,21),layer}];
  if(r.type==='POLYLINE'){return r.verts.length>1?[{type:'polyline',points:r.verts,closed:(num(a,70,0)&1)!==0,layer}]:[]}
  if(r.type==='LWPOLYLINE'){const pts=[];let x=null;for(const p of a){if(p.code===10)x=Number(p.value);if(p.code===20&&x!==null){pts.push([x,Number(p.value)]);x=null}}return pts.length>1?[{type:'polyline',points:pts,closed:(num(a,70,0)&1)!==0,layer}]:[]}
  if(r.type==='CIRCLE')return[{type:'circle',cx:num(a,10),cy:num(a,20),r:Math.abs(num(a,40)),layer}];
  if(r.type==='ARC'){const cx=num(a,10),cy=num(a,20),rad=Math.abs(num(a,40)),s=num(a,50),ee=num(a,51);let span=((ee-s)%360+360)%360;if(span===0)span=360;const steps=Math.max(8,Math.ceil(span/10)),pts=[];for(let k=0;k<=steps;k++){const ang=(s+span*k/steps)*Math.PI/180;pts.push([cx+rad*Math.cos(ang),cy+rad*Math.sin(ang)])}return[{type:'polyline',points:pts,closed:false,layer}];}
  if(r.type==='TEXT'||r.type==='MTEXT'){const chunks=a.filter(x=>x.code===1||x.code===3).map(x=>x.value);return[{type:'text',x:num(a,10),y:num(a,20),text:chunks.join('').replace(/\\P/g,' '),layer}]}
  return[];
}
function transformPoint(p,bx,by,ix,iy,sx,sy,rot){const x=(p[0]-bx)*sx,y=(p[1]-by)*sy,r=rot*Math.PI/180;return[ix+x*Math.cos(r)-y*Math.sin(r),iy+x*Math.sin(r)+y*Math.cos(r)]}
function transformEntity(e,base,ins){const sx=ins.sx,sy=ins.sy,rot=ins.rot,layer=e.layer==='0'?(ins.layer||'0'):e.layer;const pt=p=>transformPoint(p,base.x,base.y,ins.x,ins.y,sx,sy,rot);
  if(e.type==='line'){const a=pt([e.x1,e.y1]),b=pt([e.x2,e.y2]);return{...e,x1:a[0],y1:a[1],x2:b[0],y2:b[1],layer}}
  if(e.type==='polyline')return{...e,points:e.points.map(pt),layer};
  if(e.type==='circle'){if(Math.abs(sx-sy)<1e-7){const c=pt([e.cx,e.cy]);return{...e,cx:c[0],cy:c[1],r:e.r*Math.abs(sx),layer}}const pts=[];for(let k=0;k<=24;k++){const a=2*Math.PI*k/24;pts.push(pt([e.cx+e.r*Math.cos(a),e.cy+e.r*Math.sin(a)]))}return{type:'polyline',points:pts,closed:true,layer}}
  if(e.type==='text'){const a=pt([e.x,e.y]);return{...e,x:a[0],y:a[1],layer}}
  return e;
}
function parseBlocks(pairs){const [s,e]=sectionRange(pairs,'BLOCKS'),blocks=new Map();if(s<0)return blocks;let i=s;while(i<e){const r=readRecord(pairs,i,e);if(!r){i++;continue}i=r.next;if(r.type!=='BLOCK')continue;const name=str(r.a,2)||str(r.a,3);const base={x:num(r.a,10),y:num(r.a,20)},ents=[];while(i<e){const rr=readRecord(pairs,i,e);if(!rr){i++;continue}i=rr.next;if(rr.type==='ENDBLK')break;ents.push(...primitiveFromRecord(rr,'0'))}if(name)blocks.set(name,{base,entities:ents})}return blocks}
function parseDxf(text,id){
  if(/^AutoCAD Binary DXF/i.test(text.trim()))throw new Error('바이너리 DXF는 지원하지 않습니다. ASCII DXF로 저장해 주세요.');
  const pairs=toPairs(text);progress(id,'구조 분석',.08,'DXF 섹션을 확인하고 있습니다.');
  const blocks=parseBlocks(pairs);progress(id,'블록 분석',.20,`${blocks.size}개 블록 정의 확인`);
  const [s,e]=sectionRange(pairs,'ENTITIES');if(s<0)throw new Error('ENTITIES 섹션을 찾지 못했습니다.');
  const entities=[];let ignored=0,expandedInserts=0,unresolvedInserts=0,i=s,seen=0;
  while(i<e){const r=readRecord(pairs,i,e);if(!r){i++;continue}i=r.next;seen++;
    if(r.type==='INSERT'){
      const name=str(r.a,2),b=blocks.get(name);if(!b){unresolvedInserts++;continue}
      const ins={x:num(r.a,10),y:num(r.a,20),sx:num(r.a,41,1)||1,sy:num(r.a,42,1)||1,rot:num(r.a,50,0),layer:str(r.a,8,'0')||'0'};
      for(const be of b.entities)entities.push(transformEntity(be,b.base,ins));expandedInserts++;continue;
    }
    const prim=primitiveFromRecord(r,'0');if(prim.length)entities.push(...prim);else if(!['SEQEND','ENDBLK'].includes(r.type))ignored++;
    if(seen%5000===0)progress(id,'요소 분석',Math.min(.65,.20+seen/50000*.45),`${seen.toLocaleString()}개 요소 확인`);
  }
  if(!entities.length)throw new Error('가져올 수 있는 선 요소가 없습니다.');
  const unit=dxfUnitInfo(dxfHeaderUnits(text)),layers=[...new Set(entities.map(x=>x.layer||'0'))].sort((a,b)=>a.localeCompare(b,'ko'));
  return{entities,ignored,unit,layers,stats:{blocks:blocks.size,expandedInserts,unresolvedInserts,sourceRecords:seen}};
}

onmessage = (e) => {
  const {id,type,text}=e.data||{};
  if(type!=='parseAndAnalyze')return;
  try{
    progress(id,'읽기',.02,'DXF 파일을 읽고 있습니다.');
    const raw=parseDxf(text,id);
    progress(id,'도면 영역 분석',.78,'주요 도면 영역과 외부 요소를 찾고 있습니다.');
    const analysis=detectRegions(raw.entities);
    raw.analysis=analysis;
    progress(id,'완료',1,`${raw.entities.length.toLocaleString()}개 요소 분석 완료`);
    send(id,{ok:true,result:raw});
  }catch(err){send(id,{ok:false,error:String(err?.message||err)})}
};
