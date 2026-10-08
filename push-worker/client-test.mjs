import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const button={},status={},permissionStatus={state:'prompt'};
let current=null,subscribed=0,deleted=0,permission='default',calls=[];
const reg={pushManager:{async getSubscription(){calls.push('get');return current;},async subscribe(){subscribed++;current={toJSON:()=>({endpoint:'test',keys:{}}),async unsubscribe(){current=null;return true;}};return current;}}};
const notification={get permission(){return permission;},async requestPermission(){calls.push('request');return 'default';}};
const context=vm.createContext({document:{getElementById:id=>id==='subscribe'?button:status,addEventListener(){}},navigator:{serviceWorker:{async register(){return reg;},ready:Promise.resolve(reg)},permissions:{async query(){return permissionStatus;}}},window:{PushManager:{},Notification:notification},Notification:notification,Uint8Array,atob,fetch:async(url,options)=>{if(url.endsWith('/api/unsubscribe'))deleted++;return {ok:true,json:async()=>({vapidPublicKey:'BA'})};}});
vm.runInContext(readFileSync('../push-client.js','utf8'),context);
await new Promise(r=>setImmediate(r));calls=[];
await button.onclick();assert.equal(calls[0],'request');assert.match(status.textContent,/Richiesta non confermata/);assert.equal(subscribed,0);assert.equal(button.disabled,false);
permission='granted';permissionStatus.state='granted';await permissionStatus.onchange();assert.equal(subscribed,1);assert.equal(button.textContent,'Disattiva notifiche');assert.equal(status.textContent,'Notifiche attive');
await button.onclick();assert.equal(deleted,1);assert.equal(current,null);assert.equal(button.textContent,'Attiva notifiche');assert.equal(status.textContent,'Notifiche disattivate');
console.log('PASS: direct click permission request, Chrome quiet timeout, late permission grant, activation, deactivation.');

