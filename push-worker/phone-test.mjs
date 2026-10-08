import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const result=JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','morning-briefing-push','--remote','--command','SELECT payload FROM subscriptions','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const rows=result[0].results;
if(rows.length!==1)throw Error('Expected exactly one subscription; found '+rows.length+'. No notification sent.');
const {token}=JSON.parse(readFileSync('.admin.secrets.json'));
const r=await fetch('https://morning-briefing-push.gabbriellini.workers.dev/api/test',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({subscription:JSON.parse(rows[0].payload)})});
console.log('Authorized single-device test:',r.status,await r.text());
