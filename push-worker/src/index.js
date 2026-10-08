import { sendPushNotification } from '@mmmike/web-push/send';
const ORIGIN='https://gabberthomson.github.io';
const HOME=ORIGIN+'/morning-financial-briefing/';
const headers={'content-type':'application/json; charset=utf-8','access-control-allow-origin':ORIGIN,'vary':'Origin','cache-control':'no-store','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization'};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers});
const validDate=d=>typeof d==='string'&&/^20\d\d-\d\d-\d\d$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
function validSub(s){
 try{
  const u=new URL(s.endpoint);
  const host=u.hostname;
  if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||!(host==='fcm.googleapis.com'||host.endsWith('.push.services.mozilla.com')||host==='web.push.apple.com'||host.endsWith('.notify.windows.com')))return false;
  for(const [k,n] of [['auth',16],['p256dh',65]]){if(!/^[\w-]+$/.test(s.keys[k])||Uint8Array.from(atob(s.keys[k].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)).length!==n)return false;}
  return true;
 }catch{return false;}
}
async function body(request){const raw=await request.text();if(raw.length>6000)throw Error('large');return JSON.parse(raw);}
export function createWorker(send=sendPushNotification,fetchReport=fetch){return {async fetch(request,env){
 try{
  const path=new URL(request.url).pathname,origin=request.headers.get('origin');
  if(origin&&origin!==ORIGIN)return json({error:'origin rejected'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method==='GET'&&path==='/api/health'){await env.DB.prepare('SELECT 1').first();return json({ok:true,configured:!!(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.PUBLISH_TOKEN)});}
  if(request.method==='GET'&&path==='/api/config')return json({vapidPublicKey:env.VAPID_PUBLIC_KEY});
  if(request.method!=='POST')return json({error:'not found'},404);
  if(path==='/api/subscribe'||path==='/api/unsubscribe'){
   let sub;try{sub=await body(request);}catch{return json({error:'invalid JSON or body too large'},400);}
   if(!validSub(sub))return json({error:'invalid subscription'},400);
   if(path==='/api/subscribe'){
    await env.DB.prepare('INSERT INTO subscriptions(endpoint,payload) VALUES (?,?) ON CONFLICT(endpoint) DO UPDATE SET payload=excluded.payload').bind(sub.endpoint,JSON.stringify({endpoint:sub.endpoint,keys:sub.keys})).run();
   }else{
    const row=await env.DB.prepare('SELECT payload FROM subscriptions WHERE endpoint=?').bind(sub.endpoint).first();
    if(row&&JSON.parse(row.payload).keys.auth!==sub.keys.auth)return json({error:'unauthorized'},401);
    await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(sub.endpoint).run();
   }
   return json({ok:true});
  }
  if(path!=='/api/publish'&&path!=='/api/test')return json({error:'not found'},404);
  if(!env.PUBLISH_TOKEN||request.headers.get('authorization')!=='Bearer '+env.PUBLISH_TOKEN)return json({error:'unauthorized'},401);
  let info;try{info=await body(request);}catch{return json({error:'invalid JSON'},400);}
  const test=path==='/api/test',date=info.date;
  if(!test&&!validDate(date))return json({error:'invalid date'},400);
  if(test&&!validSub(info.subscription))return json({error:'a single valid subscription is required'},400);
  if(!test){
   const report=await fetchReport(HOME+'publication.json',{redirect:'manual',cf:{cacheTtl:0,cacheEverything:false}});
   if(!report.ok)return json({error:'publication not available'},409);
   let publication;try{publication=await report.json();}catch{return json({error:'publication manifest not available'},409);}
   if(publication.date!==date||publication.status!=='published')return json({error:'edition not published'},409);
   const claim=await env.DB.prepare('INSERT OR IGNORE INTO dispatches(report_date) VALUES (?)').bind(date).run();
   if(!claim.meta.changes)return json({status:'already claimed',date},409);
  }
  const rows=test?[{payload:JSON.stringify(info.subscription)}]:(await env.DB.prepare('SELECT payload FROM subscriptions LIMIT 20').all()).results;
  let ok=0,failed=0,gone=0;
  const pretty=test?'':new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',timeZone:'Europe/Rome'}).format(new Date(date));
  for(const row of rows){const sub=JSON.parse(row.payload);try{
   const sent=await send(sub,{title:'Morning Financial Briefing',body:test?'Notifica di test autorizzata.':'Il briefing finanziario del '+pretty+' è disponibile.',url:HOME,tag:test?'morning-test':'briefing-'+date},{publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY,subject:env.VAPID_SUBJECT},{timeoutMs:8000,ttl:86400,topic:test?'morning-test':'briefing-'+date});
   if(sent)ok++;else{gone++;await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(sub.endpoint).run();}
  }catch{failed++;}}
  if(!test)await env.DB.prepare('UPDATE dispatches SET success_count=?,failure_count=? WHERE report_date=?').bind(ok,failed+gone,date).run();
  console.log(JSON.stringify({event:test?'test':'publish',date:test?null:date,ok,failed,gone}));
  return json({status:'sent',ok,failed,gone,date:test?null:date});
 }catch(error){if(String(error?.message).includes('subscription capacity reached'))return json({error:'Free-plan capacity reached (20 devices)'},409);return json({error:'service unavailable'},503);}
}};}
export default createWorker();
