import assert from 'node:assert/strict';
import {createECDH,randomBytes,hkdfSync,createDecipheriv,createPublicKey,verify} from 'node:crypto';
import {generateVapidKeys} from '@mmmike/web-push/vapid';
import {sendPushNotification} from '@mmmike/web-push/send';
const receiver=createECDH('prime256v1');receiver.generateKeys();
const auth=randomBytes(16),keys=await generateVapidKeys();
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/cryptographic-test',keys:{auth:auth.toString('base64url'),p256dh:receiver.getPublicKey().toString('base64url')}};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 assert.equal(url,subscription.endpoint);
 const headers=new Headers(options.headers);assert.equal(headers.get('content-encoding'),'aes128gcm');
 const authorization=headers.get('authorization');assert.ok(authorization.startsWith('vapid '));
 const jwt=authorization.match(/t=([^, ]+)/)[1],parts=jwt.split('.');
 const claims=JSON.parse(Buffer.from(parts[1],'base64url'));assert.equal(claims.aud,'https://fcm.googleapis.com');assert.ok(claims.exp>Date.now()/1000&&claims.exp<Date.now()/1000+86401);
 const key=Buffer.from(keys.publicKey,'base64url');
 const pub=createPublicKey({key:{kty:'EC',crv:'P-256',x:key.subarray(1,33).toString('base64url'),y:key.subarray(33).toString('base64url')},format:'jwk'});
 assert.ok(verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key:pub,dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url')));
 const data=Buffer.from(options.body),salt=data.subarray(0,16),keyLength=data[20],sender=data.subarray(21,21+keyLength);
 const secret=receiver.computeSecret(sender);
 const info=Buffer.concat([Buffer.from('WebPush: info\0'),receiver.getPublicKey(),sender]);
 const ikm=Buffer.from(hkdfSync('sha256',secret,auth,info,32));
 const cek=Buffer.from(hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16));
 const nonce=Buffer.from(hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12));
 const encrypted=data.subarray(21+keyLength),decipher=createDecipheriv('aes-128-gcm',cek,nonce);decipher.setAuthTag(encrypted.subarray(-16));
 const clear=Buffer.concat([decipher.update(encrypted.subarray(0,-16)),decipher.final()]);assert.equal(clear.at(-1),2);
 const payload=JSON.parse(clear.subarray(0,-1));assert.equal(payload.title,'Morning test');assert.equal(payload.url,'https://example.com/');
 return new Response('',{status:201});
};
try{assert.equal(await sendPushNotification(subscription,{title:'Morning test',url:'https://example.com/'},{...keys,subject:'https://github.com/gabberthomson/morning-financial-briefing'}),true);console.log('PASS: real library encryption decrypted independently, VAPID signature and audience/expiry verified.');}finally{globalThis.fetch=originalFetch;}
