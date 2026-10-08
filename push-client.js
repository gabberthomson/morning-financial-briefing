const PUSH_API='https://morning-briefing-push.gabbriellini.workers.dev';
const button=document.getElementById('subscribe');
const status=document.getElementById('push-status');
const supported='serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
let registration,subscription;
const toBytes=v=>Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-v.length%4)%4)),c=>c.charCodeAt(0));
async function api(path,value){const r=await fetch(PUSH_API+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)});if(!r.ok)throw Error('Servizio notifiche non disponibile ('+r.status+'). Riprova.');return r.json();}
function show(message){status.textContent=message;button.textContent=subscription?'Disattiva notifiche':'Attiva notifiche';button.disabled=!supported||Notification.permission==='denied';if(supported&&Notification.permission==='denied'){button.textContent='Autorizzazione negata';status.textContent='Consenti le notifiche nelle impostazioni del browser per riattivarle.';}}
async function init(){
 if(!supported){button.disabled=true;button.textContent='Notifiche non supportate';status.textContent='Su iPhone installa la PWA nella schermata Home e aprila da lì.';return;}
 try{registration=await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;subscription=await registration.pushManager.getSubscription();if(subscription)await api('/api/subscribe',subscription.toJSON());show(subscription?'Notifiche attive':'Notifiche disponibili');}catch{show('Impossibile verificare il servizio. Riprova.');}
}
button.onclick=async()=>{
 button.disabled=true;
 const permissionRequest=!subscription&&Notification.permission==='default'?Notification.requestPermission():Promise.resolve(Notification.permission);
 try{
  if(!registration){registration=await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;}
  subscription=await registration.pushManager.getSubscription();
  if(subscription){await api('/api/unsubscribe',subscription.toJSON());if(!await subscription.unsubscribe())throw Error('Disattivazione locale non riuscita. Riprova.');subscription=null;show('Notifiche disattivate');}
  else{
   const permission=await permissionRequest;if(permission!=='granted'){show('Autorizzazione non concessa');return;}
   const r=await fetch(PUSH_API+'/api/config');if(!r.ok)throw Error('Configurazione non disponibile');const cfg=await r.json();
   subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:toBytes(cfg.vapidPublicKey)});
   try{await api('/api/subscribe',subscription.toJSON());}catch(e){await subscription.unsubscribe();subscription=null;throw e;}
   show('Notifiche attive');
  }
 }catch(e){show(e.message);}finally{button.disabled=!supported||Notification.permission==='denied';}
};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&registration)registration.pushManager.getSubscription().then(s=>{subscription=s;show(s?'Notifiche attive':'Notifiche disattivate');});});
init();
