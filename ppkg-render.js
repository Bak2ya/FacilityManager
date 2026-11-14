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
  return spans.map(([a,b])=>w.geometry==='arc'?`<path class="ppkg-wall" data-geometry="arc" d="${arc(w,a,b)}" data-physical-thickness="${n(w.thickness||150)}" vector-effect="non-scaling-stroke" stroke-width="2.2"/>`:`<line class="ppkg-wall" x1="${n(C.wallPoint(w,a).x)}" y1="${n(C.wallPoint(w,a).y)}" x2="${n(C.wallPoint(w,b).x)}" y2="${n(C.wallPoint(w,b).y)}" data-physical-thickness="${n(w.thickness||150)}" vector-effect="non-scaling-stroke" stroke-width="2.2"/>`).join('');
}
function opening(o,own){
  const host=own.get(o.wallId),p=C.wallPoint(host,o.t),w=o.width,h=w/2;
  const info=root.FacilityPpkgVersions?.door(o)||{mechanism:o.doorType||'hingedSingle'};
  let body='',kind=info.mechanism;
  const side=(o.swingSide??o.swing??1)>=0?1:-1;
  const leaf=(x,len,dir,doubleActing=false)=>{
    const y=side*len;
    return `<path class="ppkg-door" d="M ${n(x)} 0 L ${n(x)} ${n(y)}"/><path class="ppkg-swing" d="M ${n(x+dir*len)} 0 A ${n(len)} ${n(len)} 0 0 ${dir*side>0?1:0} ${n(x)} ${n(y)}"/>`+(doubleActing?`<path class="ppkg-swing" d="M ${n(x+dir*len)} 0 A ${n(len)} ${n(len)} 0 0 ${dir*side>0?0:1} ${n(x)} ${n(-y)}"/>`:'');
  };
  if(o.type==='window') body=line({x:-h,y:-35},{x:h,y:-35},'ppkg-window')+line({x:-h,y:35},{x:h,y:35},'ppkg-window')+line({x:-h,y:-host.thickness/2||-75},{x:-h,y:host.thickness/2||75},'ppkg-window')+line({x:h,y:-host.thickness/2||-75},{x:h,y:host.thickness/2||75},'ppkg-window');
  else if(/shutter/i.test(kind)) body=`<rect class="ppkg-shutter" x="${n(-h)}" y="-45" width="${n(w)}" height="90"/>`+line({x:-h,y:0},{x:h,y:0},'ppkg-door');
  else if(/sliding|pocket|overlap|bypass/i.test(kind)) {
    const sign=o.slideDirection===-1?-1:1;
    body=line({x:-h,y:-45},{x:0,y:-45},'ppkg-door')+line({x:0,y:45},{x:h,y:45},'ppkg-door')+`<path class="ppkg-swing" d="M ${n(-h)} 120 H ${n(h)} m ${n(-sign*w*.13)} -60 l ${n(sign*w*.13)} 60 l ${n(-sign*w*.13)} 60"/>`;
  } else if(/fold/i.test(kind)) {
    const count=Math.max(2,Math.min(16,o.doorModel93?.panelCount||4));
    const p=Array.from({length:count+1},(_,i)=>({x:-h+w*i/count,y:i%2?side*w/count*.6:0}));
    body=`<polyline class="ppkg-door" points="${pts(p)}"/>`;
  } else if(/Double$/i.test(kind)) {
    const split=Math.max(.1,Math.min(.9,o.doubleLeafSplit??.5));body=leaf(-h,w*split,1,/doubleActing/i.test(kind))+leaf(h,w*(1-split),-1,/doubleActing/i.test(kind));
  } else body=o.hinge==='end'?leaf(h,w,-1,/doubleActing/i.test(kind)):leaf(-h,w,1,/doubleActing/i.test(kind));
  return `<g class="ppkg-opening" data-opening="${esc(o.type)}" data-door-type="${esc(o.doorType||kind)}" data-door-mechanism="${esc(kind)}" data-fire-protection="${esc(info.protection)}" data-fire-rating="${esc(info.rating)}" transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(p.angle*180/Math.PI)})">${body}</g>`;
}
function object(o,own){
  if(o.type==='space')return '';
  if(o.type==='wall')return wall(o,[...own.values()].filter(v=>['door','window'].includes(v.type)&&v.wallId===o.id));
  if(o.type==='door'||o.type==='window')return opening(o,own);
  if(o.type==='line')return o.geometry==='arc'? `<path class="ppkg-line" d="${arc(o)}"/>`:line(o.a,o.b);
  if(o.type==='cadCircle')return `<circle class="ppkg-component" cx="${n(o.center.x)}" cy="${n(o.center.y)}" r="${n(o.radius)}"/>`;
  if(o.type==='cadPolyline')return root.FacilityPpkgVersions.polylineEdges(o).map(e=>e.geometry==='arc'?`<path class="ppkg-component" d="${arc(e)}"/>`:line(e.a,e.b,'ppkg-component')).join('');
  if(o.type==='stair') {
    const p=o.polygon, frame=root.FacilityPpkgVersions?.stair(o);
    const vectors=[];
    let label='';
    if(frame) {
      const {width,length,count,point,direction,rotation,u,v}=frame;
      const step=length/count;
      for(let i=1;i<count;i++)vectors.push(line(point(0,step*i),point(width,step*i)));
      const forward=direction>0, from=point(width/2,length*(forward?.18:.82)), tip=point(width/2,length*(forward?.82:.18));
      const head=Math.min(width*.16,length*.08);
      vectors.push(line(from,tip));
      for (const side of [-1,1]) vectors.push(line(tip,{x:tip.x-v.x*head*direction+u.x*head*.6*side,y:tip.y-v.y*head*direction+u.y*head*.6*side}));
      if(frame.label) {
        const slot=Math.min(count-1,Math.floor(count*(forward?.82:.18))), anchor=point(width*.78,(slot+.5)*step);
        label=`<text class="ppkg-annotation" data-stair-label="${frame.label}" transform="translate(${n(anchor.x)} ${n(anchor.y)}) rotate(${n(rotation)}) scale(1 -1)" font-size="${n(Math.min(180,width*.12,length*.04,step*.65))}">${frame.label}</text>`;
      }
    }
    return `<g data-object-type="stair" data-arrow-direction="${frame?.direction??''}"><polygon class="ppkg-component" points="${pts(p)}"/>${vectors.join('')}${label}</g>`;
  }
  if(o.type==='component')return `<g data-object-type="component" transform="translate(${n(o.point.x)} ${n(o.point.y)}) rotate(${n(o.rotation||0)}) scale(${n((o.scaleX??1)*(o.mirrorX?-1:1))} ${n((o.scaleY??1)*(o.mirrorY?-1:1))})">${o.componentDefinition.paths.map(p=>`<${p.closed?'polygon':'polyline'} class="ppkg-component" points="${pts(p.points)}"/>`).join('')}</g>`;
  if(o.type==='cadText')return `<text class="ppkg-annotation" transform="translate(${n(o.point.x)} ${n(o.point.y)}) rotate(${n(o.rotation||0)}) scale(1 -1)" x="0" y="0" font-size="${n(o.height||200)}">${esc(o.text)}</text>`;
  if(o.type==='dimension'){
    const {a,b,from,to,length}=C.dimensionPoints(o,own);
    const mid={x:(from.x+to.x)/2,y:(from.y+to.y)/2};
    return line(a,from)+line(b,to)+line(from,to)+`<text class="ppkg-annotation" transform="translate(${n(mid.x)} ${n(mid.y+50)}) scale(1 -1)" font-size="150" text-anchor="middle">${esc(o.text??Math.round(length))}</text>`;
  }
  return '';
}
function styledObject(o,own,styles){
  const info=o.type==='door'?root.FacilityPpkgVersions?.door(o):null;
  const category=info?.protection||o.planNature||(o.type==='door'||o.type==='window'||o.type==='wall'?o.type:null);
  const style=styles?.[category];
  const markup=object(o,own);
  if (!style||!markup) return markup;
  const color=style.color||'var(--drawing-ink)';
  const pattern=style.pattern==='dashed'?'8 5':style.pattern==='dotted'?'1 4':'none';
  return `<g class="ppkg-object-style" style="--ppkg-object-color:${esc(color)};--ppkg-object-dash:${pattern}">${markup}</g>`;
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
    const objects=l.drawing.source.objects.filter(o=>C.visibleObject(o,l.filter,l.drawing)&&(!['door','window'].includes(o.type)||options.doors!==false)&&(!['component','stair'].includes(o.type)||options.objects!==false));
    return `<g class="ppkg-technical" data-drawing-id="${esc(l.drawing.sourceId)}" opacity="${n(l.opacity)}" transform="matrix(${C.multiply(view.matrix,l.matrix).map(n).join(' ')})">${objects.map(o=>styledObject(o,own,l.drawing.styles)).join('')}</g>`;
  }).join('');
  return rooms+layers;
}
root.FacilityPpkgRender={markup,object,arc,esc};
})(typeof window!=='undefined'?window:globalThis);
