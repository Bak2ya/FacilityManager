/* Safe SVG projection of PPKG numeric geometry. Never inserts source SVG/HTML. */
(function(root){
'use strict';
const C=root.FacilityPpkg;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number.isFinite(v)?Number(v.toFixed(6)):0;
const pts=p=>p.map(q=>`${n(q.x)},${n(q.y)}`).join(' ');
const line=(a,b,cls='ppkg-line')=>`<line class="${cls}" x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}"/>`;
function arc(w,t0=0,t1=1){
  // Split long/full arcs into <=180-degree segments so complete circles remain visible.
  const count=Math.max(1,Math.ceil(Math.abs(w.sweep*(t1-t0))/180));
  let path='',start=C.wallPoint(w,t0);path=`M ${n(start.x)} ${n(start.y)}`;
  for(let i=1;i<=count;i++){const p=C.wallPoint(w,t0+(t1-t0)*i/count);path+=` A ${n(w.radius)} ${n(w.radius)} 0 0 ${w.sweep>=0?1:0} ${n(p.x)} ${n(p.y)}`;}
  return path;
}
function wall(w,openings){
  const length=w.geometry==='arc'?Math.abs(w.radius*w.sweep*Math.PI/180):Math.hypot(w.b.x-w.a.x,w.b.y-w.a.y);
  const holes=openings.map(o=>[Math.max(0,o.t-o.width/(2*length)),Math.min(1,o.t+o.width/(2*length))]).sort((a,b)=>a[0]-b[0]);
  const spans=[];let from=0;
  for(const [a,b] of holes){if(a>from)spans.push([from,a]);from=Math.max(from,b);}if(from<1)spans.push([from,1]);
  return spans.map(([a,b])=>w.geometry==='arc'?`<path class="ppkg-wall" data-geometry="arc" d="${arc(w,a,b)}" stroke-width="${n(w.thickness||150)}"/>`:`<line class="ppkg-wall" x1="${n(C.wallPoint(w,a).x)}" y1="${n(C.wallPoint(w,a).y)}" x2="${n(C.wallPoint(w,b).x)}" y2="${n(C.wallPoint(w,b).y)}" stroke-width="${n(w.thickness||150)}"/>`).join('');
}
function opening(o,own){
  const host=own.get(o.wallId),p=C.wallPoint(host,o.t),w=o.width,h=w/2;
  let body='',kind=o.doorType||'hingedSingle';
  const side=(o.swingSide??o.swing??1)>=0?1:-1;
  const leaf=(x,len,dir,doubleActing=false)=>{
    const y=side*len;
    return `<path class="ppkg-door" d="M ${n(x)} 0 L ${n(x)} ${n(y)}"/><path class="ppkg-swing" d="M ${n(x+dir*len)} 0 A ${n(len)} ${n(len)} 0 0 ${dir*side>0?1:0} ${n(x)} ${n(y)}"/>`+(doubleActing?`<path class="ppkg-swing" d="M ${n(x+dir*len)} 0 A ${n(len)} ${n(len)} 0 0 ${dir*side>0?0:1} ${n(x)} ${n(-y)}"/>`:'');
  };
  if(o.type==='window') body=line({x:-h,y:-35},{x:h,y:-35},'ppkg-window')+line({x:-h,y:35},{x:h,y:35},'ppkg-window')+line({x:-h,y:-host.thickness/2||-75},{x:-h,y:host.thickness/2||75},'ppkg-window')+line({x:h,y:-host.thickness/2||-75},{x:h,y:host.thickness/2||75},'ppkg-window');
  else if(/shutter/i.test(kind)) body=`<rect class="ppkg-shutter" x="${n(-h)}" y="-45" width="${n(w)}" height="90"/>`+line({x:-h,y:0},{x:h,y:0},'ppkg-door');
  else if(/sliding|pocket|overlap/i.test(kind)) {
    const sign=o.slideDirection===-1?-1:1;
    body=line({x:-h,y:-45},{x:0,y:-45},'ppkg-door')+line({x:0,y:45},{x:h,y:45},'ppkg-door')+`<path class="ppkg-swing" d="M ${n(-h)} 120 H ${n(h)} m ${n(-sign*w*.13)} -60 l ${n(sign*w*.13)} 60 l ${n(-sign*w*.13)} 60"/>`;
  } else if(/fold/i.test(kind)) {
    const count=Math.max(2,Math.min(16,o.doorModel93?.panelCount||4));
    const p=Array.from({length:count+1},(_,i)=>({x:-h+w*i/count,y:i%2?side*w/count*.6:0}));
    body=`<polyline class="ppkg-door" points="${pts(p)}"/>`;
  } else if(/Double$/i.test(kind)) {
    const split=Math.max(.1,Math.min(.9,o.doubleLeafSplit??.5));body=leaf(-h,w*split,1,/doubleActing/i.test(kind))+leaf(h,w*(1-split),-1,/doubleActing/i.test(kind));
  } else body=o.hinge==='end'?leaf(h,w,-1,/doubleActing/i.test(kind)):leaf(-h,w,1,/doubleActing/i.test(kind));
  return `<g class="ppkg-opening" data-opening="${esc(o.type)}" data-door-type="${esc(kind)}" transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(p.angle*180/Math.PI)})">${body}</g>`;
}
function object(o,own){
  if(o.type==='space')return '';
  if(o.type==='wall')return wall(o,[...own.values()].filter(v=>['door','window'].includes(v.type)&&v.wallId===o.id));
  if(o.type==='door'||o.type==='window')return opening(o,own);
  if(o.type==='line')return line(o.a,o.b);
  if(o.type==='stair'){
    const p=o.polygon;let steps='';const count=Math.max(2,Math.min(80,o.treadCount||12));
    if(p.length===4) for(let i=1;i<count;i++){const t=i/count;steps+=line({x:p[0].x+(p[3].x-p[0].x)*t,y:p[0].y+(p[3].y-p[0].y)*t},{x:p[1].x+(p[2].x-p[1].x)*t,y:p[1].y+(p[2].y-p[1].y)*t});}
    if(p.length===4){const a={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},b={x:(p[2].x+p[3].x)/2,y:(p[2].y+p[3].y)/2},dir=o.upDirection===-1?-1:1,from=dir>0?a:b,to=dir>0?b:a,dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1,tip={x:from.x+dx*.8,y:from.y+dy*.8},tail={x:from.x+dx*.2,y:from.y+dy*.2};steps+=line(tail,tip)+line(tip,{x:tip.x-dx*.08-dy/len*80,y:tip.y-dy*.08+dx/len*80})+line(tip,{x:tip.x-dx*.08+dy/len*80,y:tip.y-dy*.08-dx/len*80});}
    return `<g data-object-type="stair"><polygon class="ppkg-component" points="${pts(p)}"/>${steps}</g>`;
  }
  if(o.type==='component')return `<g data-object-type="component" transform="translate(${n(o.point.x)} ${n(o.point.y)}) rotate(${n(o.rotation||0)}) scale(${n((o.scaleX??1)*(o.mirrorX?-1:1))} ${n((o.scaleY??1)*(o.mirrorY?-1:1))})">${o.componentDefinition.paths.map(p=>`<${p.closed?'polygon':'polyline'} class="ppkg-component" points="${pts(p.points)}"/>`).join('')}</g>`;
  if(o.type==='cadText')return `<text class="ppkg-annotation" x="${n(o.point.x)}" y="${n(o.point.y)}" font-size="${n(o.height||200)}">${esc(o.text)}</text>`;
  if(o.type==='dimension'){const mid={x:(o.p1.x+o.p2.x)/2,y:(o.p1.y+o.p2.y)/2};return line(o.p1,o.p2)+`<text class="ppkg-annotation" x="${n(mid.x)}" y="${n(mid.y-50)}" font-size="150">${esc(o.text??Math.round(Math.hypot(o.p2.x-o.p1.x,o.p2.y-o.p1.y)))}</text>`;}
  return '';
}
function markup(view,options={}){
  const selected=options.selected||new Set(),prefs=options.labels||{roomName:true},links=options.links||new Map();
  const enabledLayers=view.layers.filter((l,i)=>options.base!==false||i===view.layers.length-1),enabled=new Map(enabledLayers.map(l=>[l.drawing.id,l]));
  const rooms=view.rooms.filter(r=>enabled.has(r._ppkg.drawing.id)).map(r=>{
    const link=links.get(r.id),m=link?.status==='linked'?link.room:null,points=r.geometry.map(p=>p.join(',')).join(' '),c=r.geometry.reduce((a,p)=>[a[0]+p[0]/r.geometry.length,a[1]+p[1]/r.geometry.length],[0,0]);
    const names=[];if(prefs.roomNo&&m?.no)names.push(m.no);if(prefs.roomName)names.push(r.name||r._ppkg?.object.name||'');if(prefs.department&&m?.department)names.push(m.department);if(prefs.area&&r.areaM2!=null)names.push(r.areaM2.toFixed(2)+'㎡');
    const size=prefs.size==='small'?7:prefs.size==='large'?12:9;
    return `<g class="room ppkg-space ${selected.has(r.id)?'selected':''}" opacity="${n(enabled.get(r._ppkg.drawing.id).opacity)}" data-room-id="${esc(r.id)}"><polygon class="roomShape" points="${points}"/><text class="ppkg-label" x="${n(c[0])}" y="${n(c[1])}" font-size="${size}">${names.map((v,i)=>`<tspan x="${n(c[0])}" dy="${i?'1.2em':'0'}">${esc(String(v).slice(0,40))}</tspan>`).join('')}</text></g>`;
  }).join('');
  const layers=enabledLayers.map(l=>{
    const own=new Map(l.drawing.source.objects.map(o=>[o.id,o]));
    const objects=l.drawing.source.objects.filter(o=>C.visibleObject(o,l.filter)&&(!['door','window'].includes(o.type)||options.doors!==false)&&(!['component','stair'].includes(o.type)||options.objects!==false));
    return `<g class="ppkg-technical" data-drawing-id="${esc(l.drawing.sourceId)}" opacity="${n(l.opacity)}" transform="matrix(${C.multiply(view.matrix,l.matrix).map(n).join(' ')})">${objects.map(o=>object(o,own)).join('')}</g>`;
  }).join('');
  return rooms+layers;
}
root.FacilityPpkgRender={markup,object,arc,esc};
})(typeof window!=='undefined'?window:globalThis);
