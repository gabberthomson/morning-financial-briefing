const PUSH_API='https://morning-briefing-push.gabbriellini.workers.dev';
const button=document.getElementById('subscribe');
const status=document.getElementById('push-status');
const diagnostics=document.getElementById('push-diagnostics');
const diagnosticPanel=document.getElementById('push-diagnostic-panel');
const check={version:'5',before:null,result:null,gesture:null,stage:'avvio',permissionApi:'in verifica',error:null};
function inspect(){
 if(!diagnostics)return;
 diagnostics.textContent=[
  'Versione pagina: '+check.version,
  'Dominio: '+(globalThis.location?.origin||'non disponibile'),
  'Pagina HTTPS: '+(globalThis.isSecureContext?'sì':'no'),
  'Pagina autonoma: '+(window.top===window?'sì':'no'),
  'Permesso attuale (Notification): '+(typeof Notification==='undefined'?'non supportato':Notification.permission),
  'Permesso (Permissions API): '+check.permissionApi,
  'Permesso prima del clic: '+(check.before??'nessun clic'),
  'Clic riconosciuto dal browser: '+(check.gesture===null?'non verificato':check.gesture?'sì':'no'),
  'Risposta alla richiesta: '+(check.result??'nessuna richiesta'),
  'Fase: '+check.stage,
  ...(check.error?['Errore: '+check.error]:[])
 ].join('\n');
}
const supported='serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
let registration,subscription,busy=false,wantEnable=false;
const toBytes=v=>Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-v.length%4)%4)),c=>c.charCodeAt(0));
async function api(path,value){const r=await fetch(PUSH_API+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)});if(!r.ok)throw Error('Servizio notifiche non disponibile ('+r.status+'). Riprova.');return r.json();}
function show(message){status.textContent=message;button.textContent=subscription?'Disattiva notifiche':'Attiva notifiche';button.disabled=busy||!supported||Notification.permission==='denied';if(supported&&Notification.permission==='denied'){button.textContent='Permesso browser: negato';status.textContent=message==='Notifiche disponibili'?'Il browser restituisce un permesso negato. Apri «Verifica notifiche» per vedere il controllo.':message;if(diagnosticPanel)diagnosticPanel.open=true;}inspect();}
async function ready(){if(!registration){registration=await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;}return registration;}
async function enable(){
 await ready();
 subscription=await registration.pushManager.getSubscription();
 if(!subscription){const r=await fetch(PUSH_API+'/api/config');if(!r.ok)throw Error('Configurazione non disponibile');const cfg=await r.json();subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:toBytes(cfg.vapidPublicKey)});}
 try{await api('/api/subscribe',subscription.toJSON());}catch(e){await subscription.unsubscribe();subscription=null;throw e;}
 wantEnable=false;show('Notifiche attive');
}
async function init(){
 if(!supported){button.disabled=true;button.textContent='Notifiche non supportate';status.textContent='Su iPhone installa la PWA nella schermata Home e aprila da lì. Usa un browser compatibile in navigazione normale.';return;}
 try{await ready();subscription=await registration.pushManager.getSubscription();if(subscription)await api('/api/subscribe',subscription.toJSON());show(subscription?'Notifiche attive':'Notifiche disponibili');}catch{show('Impossibile verificare il servizio. Riprova.');}
}
button.onclick=async()=>{
 if(busy)return;
 busy=true;button.disabled=true;
 check.before=Notification.permission;check.gesture=navigator.userActivation?.isActive??null;check.error=null;check.stage='richiesta permesso';inspect();
 try{
  // Call synchronously in the click gesture, before any awaited operation.
  const permissionRequest=!subscription&&Notification.permission==='default'?Notification.requestPermission():Promise.resolve(Notification.permission);
  await ready();subscription=await registration.pushManager.getSubscription();
  if(subscription){wantEnable=false;await api('/api/unsubscribe',subscription.toJSON());if(!await subscription.unsubscribe())throw Error('Disattivazione locale non riuscita. Riprova.');subscription=null;show('Notifiche disattivate');}
  else{
   wantEnable=true;
   const permission=await permissionRequest;
   check.result=permission;check.stage='risposta del browser';
   if(permission!=='granted'){if(diagnosticPanel)diagnosticPanel.open=true;show(permission==='denied'?'La richiesta ha restituito «denied». Il controllo nella pagina mostra i valori ricevuti dal browser.':'La richiesta ha restituito «default»: nessuna autorizzazione confermata.');return;}
   check.stage='sottoscrizione push';
   await enable();
  }
 }catch(e){check.error=e.name+': '+e.message;show(e.message);}finally{busy=false;button.disabled=!supported||Notification.permission==='denied';inspect();}
};
if(supported&&navigator.permissions){navigator.permissions.query({name:'notifications'}).then(p=>{check.permissionApi=p.state;inspect();p.onchange=async()=>{check.permissionApi=p.state;inspect();if(busy)return;if(p.state==='granted'&&wantEnable){busy=true;button.disabled=true;try{await enable();}catch(e){show(e.message);}finally{busy=false;button.disabled=Notification.permission==='denied';}}else show(subscription?'Notifiche attive':'Notifiche disponibili');};}).catch(()=>{check.permissionApi='non disponibile';inspect();});}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&registration&&!busy)registration.pushManager.getSubscription().then(s=>{subscription=s;show(s?'Notifiche attive':'Notifiche disattivate');});});
init();
