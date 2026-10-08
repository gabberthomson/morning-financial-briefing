import {generateVapidKeys} from '@mmmike/web-push/vapid';
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const keys=await generateVapidKeys();
const token=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','bulk'],{stdio:['pipe','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
child.stdin.end(JSON.stringify({VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,PUBLISH_TOKEN:token}));
let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
child.on('exit',code=>{if(code!==0){console.error('Secret upload failed; output withheld.');process.exitCode=1;}else{writeFileSync('.admin.secrets.json',JSON.stringify({token}));console.log('Secrets uploaded. Private VAPID key was never written to disk.');}});
