(function(global){
'use strict';
const FORMAT='FACMAP';
const VERSION='0.1.0';
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v))}
function text(v){return String(v??'').trim()}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
function normNo(v){return text(v).replace(/\s+/g,'').toLowerCase()}
function round(n,p=4){const x=Number(n);return Number.isFinite(x)?Number(x.toFixed(p)):0}
function geometryKey(g){return JSON.stringify((Array.isArray(g)?g:[]).map(p=>[round(p?.[0]),round(p?.[1])]))}
function mapRoot(doc){return doc?.map&&typeof doc.map==='object'?doc.map:doc}
function validate(doc){
  if(!doc||typeof doc!=='object')throw new Error('FACMAP 문서를 읽을 수 없습니다.');
  if(doc.format!==FORMAT)throw new Error('FACMAP 형식이 아닙니다.');
  const root=mapRoot(doc),floor=root?.floor||{};
  if(!Array.isArray(root?.spaces))throw new Error('FACMAP에 spaces 배열이 없습니다.');
  const width=num(root?.canvas?.width??floor.width),height=num(root?.canvas?.height??floor.height);
  if(!(width>0&&height>0))throw new Error('FACMAP 도면 크기가 올바르지 않습니다.');
  for(const [i,s] of root.spaces.entries()){
    if(!text(s?.id))throw new Error(`공간 ${i+1}에 고유 ID가 없습니다.`);
    if(!Array.isArray(s?.geometry)||s.geometry.length<3)throw new Error(`공간 ${i+1}의 경계가 올바르지 않습니다.`);
  }
  return{format:doc.format,version:text(doc.version)||VERSION,root,width,height};
}
function uniqueNoMap(rooms){
  const counts=new Map();for(const r of rooms){const k=normNo(r?.no);if(k)counts.set(k,(counts.get(k)||0)+1)}
  const map=new Map();for(const r of rooms){const k=normNo(r?.no);if(k&&counts.get(k)===1)map.set(k,r)}return map;
}
function changedFields(room,space){
  const out=[];
  if(geometryKey(room?.geometry)!==geometryKey(space?.geometry))out.push('geometry');
  const incomingNo=text(space?.roomNo??space?.no);if(incomingNo&&text(room?.no)!==incomingNo)out.push('roomNo');
  const incomingArea=num(space?.areaM2);if(incomingArea!=null&&Math.abs(Number(room?.areaM2||0)-incomingArea)>.01)out.push('areaM2');
  const incomingType=text(space?.spaceType??space?.type);if(incomingType&&text(room?.spaceType)!==incomingType)out.push('spaceType');
  const incomingName=text(space?.name);if(incomingName&&!text(room?.name))out.push('name');
  return out;
}
function compareFloor(currentFloor,doc){
  const {root}=validate(doc),rooms=Array.isArray(currentFloor?.rooms)?currentFloor.rooms:[],spaces=root.spaces||[];
  const byMapId=new Map();for(const r of rooms)if(text(r?.mapSpaceId))byMapId.set(text(r.mapSpaceId),r);
  const byNo=uniqueNoMap(rooms.filter(r=>!r?.mapMissing));
  const matchedRoomIds=new Set(),items=[];
  for(const space of spaces){
    const sid=text(space.id),no=text(space.roomNo??space.no);let room=byMapId.get(sid),matchedBy='id';
    if(!room&&no){room=byNo.get(normNo(no));matchedBy=room?'roomNo':''}
    if(room){matchedRoomIds.add(room.id);const fields=changedFields(room,space);items.push({kind:fields.length?'updated':'unchanged',matchedBy,roomId:room.id,spaceId:sid,roomNo:no||text(room.no),name:text(space.name)||text(room.name),fields});}
    else items.push({kind:'added',matchedBy:'',roomId:'',spaceId:sid,roomNo:no,name:text(space.name),fields:['new']});
  }
  for(const room of rooms){if(room?.mapMissing)continue;if(!matchedRoomIds.has(room.id))items.push({kind:'missing',matchedBy:'',roomId:room.id,spaceId:text(room.mapSpaceId),roomNo:text(room.no),name:text(room.name),fields:['missing']});}
  const count=k=>items.filter(x=>x.kind===k).length;
  return{items,summary:{unchanged:count('unchanged'),updated:count('updated'),added:count('added'),missing:count('missing')},root};
}
function defaultRoom(space,id){
  const no=text(space?.roomNo??space?.no),name=text(space?.name),area=num(space?.areaM2)||0;
  return{id,no,name,usage:'',department:'',assignee:'',areaM2:area,areaSource:'도면',lockType:'키',masterKey:null,keyRing:null,lockVerifiedAt:'',notes:'',geometry:clone(space.geometry),fire:{required:null,installed:null,expiry:'',location:'',note:''},mapSpaceId:text(space.id),spaceType:text(space?.spaceType??space?.type)||'room',mapMissing:false};
}
function applyFloor(currentFloor,doc,options={}){
  const check=compareFloor(currentFloor,doc),root=check.root,spaces=root.spaces||[],rooms=currentFloor.rooms||(currentFloor.rooms=[]),byId=new Map(rooms.map(r=>[r.id,r]));
  const bySpaceId=new Map(spaces.map(s=>[text(s.id),s]));
  const createRoomId=typeof options.createRoomId==='function'?options.createRoomId:(()=>`room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`);
  for(const item of check.items){
    if(item.kind==='missing'){const r=byId.get(item.roomId);if(r&&options.hideMissing!==false){r.mapMissing=true;r.mapMissingSince=new Date().toISOString()}continue}
    const space=bySpaceId.get(item.spaceId);if(!space)continue;
    if(item.kind==='added')rooms.push(defaultRoom(space,createRoomId()));
    else{
      const r=byId.get(item.roomId);if(!r)continue;
      r.mapSpaceId=text(space.id);r.geometry=clone(space.geometry);r.mapMissing=false;delete r.mapMissingSince;
      const no=text(space.roomNo??space.no);if(no)r.no=no;
      const area=num(space.areaM2);if(area!=null){r.areaM2=area;r.areaSource='도면'}
      const st=text(space.spaceType??space.type);if(st)r.spaceType=st;
      const nm=text(space.name);if(nm&&!text(r.name))r.name=nm;
    }
  }
  const width=num(root?.canvas?.width??root?.floor?.width),height=num(root?.canvas?.height??root?.floor?.height);if(width>0)currentFloor.width=width;if(height>0)currentFloor.height=height;
  const drawing=root.drawing||{};
  for(const k of ['buildingOutline','zones','doors','windows','objects','cadReference'])if(Object.prototype.hasOwnProperty.call(drawing,k))currentFloor[k]=clone(drawing[k]);
  currentFloor.mapInfo={format:FORMAT,version:text(doc.version)||VERSION,sourceName:text(options.sourceName),sourceApp:clone(doc.sourceApp||{}),importedAt:new Date().toISOString(),mapId:text(root.id||root.mapId),revision:text(root.revision)};
  return check.summary;
}
global.FacilityMapBridge={FORMAT,VERSION,validate,compareFloor,applyFloor,geometryKey};
})(typeof window!=='undefined'?window:globalThis);
