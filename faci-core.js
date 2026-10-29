/* FACI v1: one school document, immutable drawing sources, separate business/security data. */
(function(root){
'use strict';
const P=root.FacilityPpkg,enc=new TextEncoder(),dec=new TextDecoder();
const clone=P.clone,canonical=P.canonical,FORMAT='FACI',SCHEMA=1,ITERATIONS=600000;
const app=()=>root.FacilityRelease||{version:'development',build:0};
const b64=bytes=>{let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s);};
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const random=n=>crypto.getRandomValues(new Uint8Array(n));
const id=()=>crypto.randomUUID();
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(typeof value==='string'?value:canonical(value))))).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function aes(raw){return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},true,['encrypt','decrypt']);}
async function raw(key){return new Uint8Array(await crypto.subtle.exportKey('raw',key));}
async function encrypt(key,value,aad){const iv=random(12),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(aad),tagLength:128},key,enc.encode(canonical(value)));return{iv:b64(iv),ct:b64(ct)};}
async function decrypt(key,value,aad){return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(value.iv),additionalData:enc.encode(aad),tagLength:128},key,bytes(value.ct))));}
function header(doc){const h=clone(doc);delete h.sections;delete h.checksum;return h;}
function sectionAad(doc,name,binding){return `FACI:${SCHEMA}:${doc.id}:${name}:${binding}`;}
async function material(doc,password){
 const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(doc.crypto.authSalt),iterations:doc.crypto.iterations,hash:'SHA-256'},base,256));
 return {key:await aes(bits),lookup:await hash([...bits,'FACI-CREDENTIAL-LOOKUP'])};
}
async function credential(doc,{id:accountId,password,keys,active=true}){
 if(!password)throw new Error('빈 암호는 사용할 수 없습니다.');
 const m=await material(doc,password),payload={id:accountId,keys:{}};
 for(const [name,k] of Object.entries(keys))if(k)payload.keys[name]=b64(await raw(k));
 return{id:accountId,active,lookup:m.lookup,payload:await encrypt(m.key,payload,`FACI-CREDENTIAL:${doc.id}:${accountId}`)};
}
async function passwordUsed(doc,password,exclude=''){const m=await material(doc,password);return doc.crypto.credentials.some(c=>c.id!==exclude&&c.lookup===m.lookup);}
async function authenticate(doc,password,purpose='admin'){
 const m=await material(doc,password),record=doc.crypto.credentials.find(c=>c.active!==false&&c.lookup===m.lookup);
 if(!record)throw new Error('암호 또는 파일을 확인해 주세요.');
 const payload=await decrypt(m.key,record.payload,`FACI-CREDENTIAL:${doc.id}:${record.id}`);
 if(payload.id!==record.id||!payload.keys?.[purpose==='admin'?'admin':'secure'])throw new Error('해당 권한으로 인증할 수 없습니다.');
 const keys={};for(const [name,value] of Object.entries(payload.keys))keys[name]=await aes(bytes(value));
 // Bind successful authentication to actual protected sections and current file, not just a password lookup.
 await decryptSection(doc,purpose==='admin'?'admin':'secure',keys[purpose==='admin'?'admin':'secure']);
 if(purpose==='admin')await decryptSection(doc,'secure',keys.secure);
 return{credential:record,payload,keys};
}
async function decryptSection(doc,name,key){const s=doc.sections[name];return decrypt(key,s,sectionAad(doc,name,s.boundHash));}
function emptyPublic(organization=''){
 return{settings:{organization,dataDate:null,distribution:{contactName:'',contactEmail:''}},spaces:[],equipmentByDrawing:{},placementFrames:{},constructionHistory:[]};
}
function newSpace(space){return{id:'room-'+id(),spaceUuid:space.spaceUuid,drawingLink:{spaceUuid:space.spaceUuid,originPackageId:space.drawing.origin.packageId,originDrawingId:space.drawing.origin.drawingId},no:'',name:'',shortName:'',roomCode:'',usage:'',facilityClass:'',department:'',teachingDepartment:'',assignee:'',capacity:null,areaM2:null,areaPyeong:null,areaSource:'미입력',inUse:null,lockType:'키',masterKey:null,keyRing:null,lockVerifiedAt:'',notes:'',fire:{required:null,installed:null,expiry:'',location:'',note:''}};}
function withSources(doc,sources){
 const next=clone(doc),model=P.makeModel(sources),known=new Set(next.public.spaces.map(r=>r.spaceUuid));
 next.drawings.sources=clone(sources);
 for(const space of model.spaces.values())if(space.spaceUuid&&!known.has(space.spaceUuid)){next.public.spaces.push(newSpace(space));known.add(space.spaceUuid);}
 for(const drawing of model.drawings.values()){
  next.public.equipmentByDrawing[drawing.id]??=[];
  next.public.placementFrames[drawing.id]??={kind:'view-1000x700-v2',matrix:P.view(model,drawing).matrix};
 }
 return{document:next,model};
}
async function seal(doc,pub,secure,admin,keys,{increment=true}={}){
 if(!keys?.secure||!keys?.admin)throw new Error('관리자 인증이 필요합니다.');
 const next=clone(doc);next.public=clone(pub);next.updatedAt=new Date().toISOString();if(increment)next.revision++;
 next.app=clone(app());next.public.settings.dataDate=next.updatedAt;
 const binding=await hash(header(next));next.sections={};
 for(const [name,value] of Object.entries({secure,admin}))next.sections[name]={...await encrypt(keys[name],value,sectionAad(next,name,binding)),boundHash:binding};
 delete next.checksum;next.checksum=await hash(next);return next;
}
async function recoveryWrap(doc,keys){
 const token=b64(random(32)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const key=await aes(tokenBytes(token)),value={ownerId:doc.crypto.ownerId,keys:{secure:b64(await raw(keys.secure)),admin:b64(await raw(keys.admin))}};
 doc.crypto.recovery={ownerId:doc.crypto.ownerId,payload:await encrypt(key,value,`FACI-RECOVERY:${doc.id}:${doc.crypto.ownerId}`)};
 return token;
}
function tokenBytes(text){const match=String(text).match(/Key:\s*([A-Za-z0-9_-]{43})/),token=match?match[1]:String(text).trim();if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error('복구키 형식이 올바르지 않습니다.');return bytes(token.replace(/-/g,'+').replace(/_/g,'/')+'=');}
async function create({sources=[],organization='',ownerName,password,adminPassword}){
 if(!organization.trim()||!ownerName?.trim()||!password||!adminPassword)throw new Error('기관명, 일반 관리자 암호, 최상위 관리자 담당자명과 암호가 모두 필요합니다.');
 if(password===adminPassword)throw new Error('일반 관리자와 최상위 관리자 암호는 서로 달라야 합니다.');
 const now=new Date().toISOString(),ownerId='owner-'+id();
 let doc={format:FORMAT,schemaVersion:SCHEMA,id:id(),revision:1,createdAt:now,updatedAt:now,app:clone(app()),drawings:{sources:[]},public:emptyPublic(organization),history:{events:[],approvalSchemaVersion:1},crypto:{kdf:'PBKDF2-HMAC-SHA256',iterations:ITERATIONS,authSalt:b64(random(16)),ownerId,credentials:[]},sections:{}};
 doc=withSources(doc,sources).document;
 const keys={secure:await aes(random(32)),admin:await aes(random(32))};
 doc.crypto.credentials.push(await credential(doc,{id:ownerId,password,keys}));
 const secure={roomSecurity:{}},admin={accounts:[{id:ownerId,displayName:ownerName.trim(),level:'admin',canManageAdmins:true,active:true,createdAt:now}],changeLog:[]};
 doc.history.events.push({id:id(),type:'document-created',recordedAt:now,effectiveAt:null,sourceRevision:null});
 const sharedId='admin-'+id();doc.crypto.credentials.push(await credential(doc,{id:sharedId,password:adminPassword,keys}));
 admin.accounts.push({id:sharedId,displayName:'공유 관리자',shared:true,level:'admin',canManageAdmins:false,active:true,createdAt:now});
 const recoveryKey=await recoveryWrap(doc,keys);doc=await seal(doc,doc.public,secure,admin,keys,{increment:false});
 return{document:doc,keys,secure,admin,recoveryKey};
}
function validatePublic(pub,model){
 if(!pub||!pub.settings||!Array.isArray(pub.spaces)||!Array.isArray(pub.constructionHistory)||!pub.equipmentByDrawing||!pub.placementFrames)throw new Error('FACI 업무정보 구조가 올바르지 않습니다.');
 const ids=new Set(),uuids=new Set();
 for(const r of pub.spaces){
  if(!r.id||!r.spaceUuid||ids.has(r.id)||uuids.has(r.spaceUuid)||!model.spaces.has(r.spaceUuid)||r.drawingLink?.spaceUuid!==r.spaceUuid)throw new Error('공간 관리 ID/UUID 연결이 중복되거나 올바르지 않습니다.');
  if('geometry' in r||'_ppkg' in r)throw new Error('업무정보에 도면 기하가 섞여 있습니다.');
  for(const k of ['areaM2','areaPyeong','capacity'])if(r[k]!=null&&(!Number.isFinite(r[k])||r[k]<0))throw new Error('등록 면적 또는 수용인원이 올바르지 않습니다.');
  if(r.capacity!=null&&!Number.isInteger(r.capacity))throw new Error('수용인원은 0 이상의 정수여야 합니다.');
  ids.add(r.id);uuids.add(r.spaceUuid);
 }
 for(const [drawingId,frame] of Object.entries(pub.placementFrames)){
  const m=frame?.matrix;if(!model.drawings.has(drawingId)||!['view-1000x700-v1','view-1000x700-v2'].includes(frame?.kind)||!Array.isArray(m)||m.length!==6||!m.every(Number.isFinite)||Math.abs(m[0]*m[3]-m[1]*m[2])<1e-15)throw new Error('설비 배치 기준이 올바르지 않습니다.');
 }
 for(const [drawingId,items] of Object.entries(pub.equipmentByDrawing)){
  if(!model.drawings.has(drawingId)||!Array.isArray(items))throw new Error('설비의 도면 연결이 올바르지 않습니다.');
  for(const item of items)if(!item.id||!ids.has(item.roomId)||!Number.isFinite(item.x)||!Number.isFinite(item.y))throw new Error('설비 ID·위치·공간 연결이 올바르지 않습니다.');
 }
}
async function validate(doc){
 if(doc?.format!==FORMAT||doc.schemaVersion!==SCHEMA||typeof doc.id!=='string'||!Number.isInteger(doc.revision)||doc.revision<1)throw new Error('지원하는 FACI v1 문서가 아닙니다.');
 if(!Array.isArray(doc.drawings?.sources)||doc.crypto?.kdf!=='PBKDF2-HMAC-SHA256'||!Number.isInteger(doc.crypto.iterations)||doc.crypto.iterations<600000||doc.crypto.iterations>5000000||!Array.isArray(doc.crypto.credentials)||!doc.crypto.credentials.length||!doc.crypto.ownerId)throw new Error('FACI 도면·인증 구조가 올바르지 않습니다.');
 const model=P.makeModel(doc.drawings.sources);validatePublic(doc.public,model);
 if(bytes(doc.crypto.authSalt).length!==16)throw new Error('FACI salt 형식이 올바르지 않습니다.');
 const ids=new Set(),lookups=new Set();
 for(const c of doc.crypto.credentials){if(!c.id||ids.has(c.id)||!c.lookup||lookups.has(c.lookup)||!c.payload?.iv||!c.payload?.ct)throw new Error('계정 ID/암호 식별 정보가 중복되거나 잘못되었습니다.');ids.add(c.id);lookups.add(c.lookup);}
 if(!ids.has(doc.crypto.ownerId)||doc.crypto.recovery?.ownerId!==doc.crypto.ownerId)throw new Error('최상위 관리자·복구키 연결이 올바르지 않습니다.');
 const checksum=doc.checksum,copy=clone(doc);delete copy.checksum;
 if(checksum!==await hash(copy))throw new Error('FACI 파일이 손상되었거나 변경되었습니다.');
 const binding=await hash(header(doc));
 for(const name of ['secure','admin']){const s=doc.sections?.[name];if(s?.boundHash!==binding||!s.ct||bytes(s.iv).length!==12)throw new Error('FACI 보호영역의 문서 연결이 손상되었습니다.');}
 return{model};
}
async function recover(doc,token,password){
 await validate(doc);if(!password)throw new Error('새 최상위 관리자 암호를 입력해 주세요.');
 const value=await decrypt(await aes(tokenBytes(token)),doc.crypto.recovery.payload,`FACI-RECOVERY:${doc.id}:${doc.crypto.ownerId}`);
 if(value.ownerId!==doc.crypto.ownerId)throw new Error('이 문서의 최상위 관리자 복구키가 아닙니다.');
 const keys={secure:await aes(bytes(value.keys.secure)),admin:await aes(bytes(value.keys.admin))};
 const secure=await decryptSection(doc,'secure',keys.secure),admin=await decryptSection(doc,'admin',keys.admin),next=clone(doc);
 const owner=admin.accounts.find(a=>a.id===doc.crypto.ownerId&&a.level==='admin');if(!owner)throw new Error('최상위 관리자 계정이 없습니다.');
 if(await passwordUsed(doc,password,owner.id))throw new Error('다른 계정의 암호와 중복됩니다.');
 const replacement=await credential(next,{id:owner.id,password,keys});next.crypto.credentials=next.crypto.credentials.map(c=>c.id===owner.id?replacement:c);
 owner.active=true;owner.canManageAdmins=true;admin.changeLog.push({id:id(),at:new Date().toISOString(),actorId:owner.id,actor:owner.displayName,target:owner.displayName,action:'최상위 관리자 복구',detail:'개별 사용자 계정은 복구키로 복구하지 않음'});
 const recoveryKey=await recoveryWrap(next,keys),document=await seal(next,next.public,secure,admin,keys);
 return{document,keys,secure,admin,recoveryKey};
}
// Export original Plan packages only. An unchanged source preserves PieniPlan revisions and hashes exactly.
function exportSources(doc){
 const allowed=new Set(['format','fileType','schemaVersion','requiredCapabilities','packageId','createdAt','app','buildings','drawingModel','scope','omissions','packageRevision','planObjectStyles']);
 return doc.drawings.sources.map(source=>{
  P.validate(source.document);
  for(const k of Object.keys(source.document))if(!allowed.has(k))throw new Error('PPKG 원본에 알 수 없는 최상위 필드가 있어 내보내기를 차단했습니다: '+k);
  return{name:source.name||'PieniPlan.ppkg',document:clone(source.document)};
 });
}
root.FacilityFaciCore={FORMAT,SCHEMA,ITERATIONS,clone,canonical,hash,create,withSources,seal,validate,validatePublic,authenticate,credential,passwordUsed,decryptSection,recover,recoveryWrap,exportSources};
})(typeof window!=='undefined'?window:globalThis);
