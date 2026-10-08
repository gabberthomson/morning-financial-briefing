import {readFileSync} from 'node:fs';
const base='https://morning-briefing-push.gabbriellini.workers.dev';
for(const path of ['/api/health','/api/config']){const r=await fetch(base+path);const v=await r.json();console.log(path,r.status,path.endsWith('config')?{publicKeyLength:v.vapidPublicKey?.length}:v);}
const {token}=JSON.parse(readFileSync('.admin.secrets.json'));
for(const [name,headers,value] of [['unauthorized',{},{}],['invalid date',{authorization:'Bearer '+token},{date:'2026-02-30'}],['unpublished',{authorization:'Bearer '+token},{date:'2026-10-09'}]]){const r=await fetch(base+'/api/publish',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(value)});console.log(name,r.status,await r.text());}
