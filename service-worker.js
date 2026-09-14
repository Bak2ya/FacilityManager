'use strict';
const CACHE_PREFIX='facilitymanager-offline-';
const CACHE_NAME=`${CACHE_PREFIX}v17`;
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function cachedNavigation(){
  const current=await caches.open(CACHE_NAME);
  let hit=await current.match(new URL('index.html',self.registration.scope).href,{ignoreSearch:true});
  if(hit)return hit;
  const names=(await caches.keys()).filter(n=>n.startsWith(CACHE_PREFIX)).reverse();
  for(const name of names){
    const c=await caches.open(name);
    hit=await c.match(new URL('index.html',self.registration.scope).href,{ignoreSearch:true});
    if(hit)return hit;
  }
  return null;
}
async function cachedAsset(request){
  const names=[CACHE_NAME,...(await caches.keys()).filter(n=>n.startsWith(CACHE_PREFIX)&&n!==CACHE_NAME).reverse()];
  for(const name of names){
    const c=await caches.open(name),hit=await c.match(request,{ignoreSearch:true});
    if(hit)return hit;
  }
  return null;
}
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  // latest-db.json is intentionally network-only: offline status must say it cannot be checked.
  if(url.pathname.endsWith('/latest-db.json'))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).catch(async()=>await cachedNavigation()||new Response('FacilityManager is not prepared for offline use on this device.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
    return;
  }
  event.respondWith(fetch(req).catch(async()=>await cachedAsset(req)||Response.error()));
});
