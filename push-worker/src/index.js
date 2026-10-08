import { sendPushNotification } from '@mmmike/web-push/send';
const ALLOWED='https://gabberthomson.github.io';
function json(value,status=200,origin=ALLOWED){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':origin,'vary':'Origin','cache-control':'no-store'}})}
function cors(){return new Response(null,{status:204,headers:{'access-control-allow-origin':ALLOWED,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization','access-control-max-age':'3600'}})}
export default {
async fetch(request,env) {
 const url=new URL(request.url);
 if(request.method==='OPTIONS')return cors();
 const origin=request.headers.get('Origin');
 if(origin && origin!==ALLOWED)return json({error:'origin rejected'},403);
 if(request.method==='GET'&&url.pathname==='/api/config')return json({vapidPublicKey:env.VAPID_PUBLIC_KEY});
 if(request.method==='POST'&&url.pathname==='/api/subscribe'){
   let sub;try{sub=await request.json()}catch{return json({error:'invalid json'},400)}
   if(!sub?.endpoint||!sub?.keys?.auth||!sub?.keys?.p256dh||JSON.stringify(sub).length>6000)return json({error:'invalid subscription'},400);
   try {const ep=new URL(sub.endpoint);if(ep.protocol!=='https:')return json({error:'https endpoint required'},400)}catch{return json({error:'invalid endpoint'},400)}
   await env.DB.prepare('INSERT OR REPLACE INTO subscriptions(endpoint,payload) VALUES (?,?)').bind(sub.endpoint,JSON.stringify(sub)).run();
   return json({ok:true});
 }
 if(request.method==='POST'&&url.pathname==='/api/publish'){
   if(!env.PUBLISH_TOKEN||request.headers.get('Authorization')!=='Bearer '+env.PUBLISH_TOKEN)return json({error:'unauthorized'},401);
   let info;try{info=await request.json()}catch{return json({error:'invalid json'},400)}
   const date=info?.date;
   if(typeof date!=='string'||!/^20\d\d-\d\d-\d\d$/.test(date))return json({error:'invalid date'},400);
   const title='Morning Financial Briefing';
   const link='https://gabberthomson.github.io/morning-financial-briefing/';
   const rows=(await env.DB.prepare('SELECT payload FROM subscriptions').all()).results||[];
   const existing=await env.DB.prepare('SELECT report_date FROM dispatches WHERE report_date=?').bind(date).first();
   if(existing)return json({status:'already sent',date},409);
   let ok=0,failed=0;
   for(const row of rows){
    const sub=JSON.parse(row.payload);
    try{
      const sent=await sendPushNotification(sub,{title,body:'Il briefing del '+date+' è disponibile.',data:{url:link}}, {publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY,subject:env.VAPID_SUBJECT});
      if(sent===false){failed++;await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(sub.endpoint).run()}else ok++;
    }catch(e){failed++;console.error('Push failure',String(e).slice(0,180))}
   }
   await env.DB.prepare('INSERT INTO dispatches(report_date,success_count,failure_count) VALUES (?,?,?)').bind(date,ok,failed).run();
   return json({status:'sent',date,ok,failed});
 }
 return json({error:'not found'},404);
}
};