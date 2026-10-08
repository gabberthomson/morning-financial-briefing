# Cloudflare Worker per notifiche Web Push

Questo codice è predisposto ma **non ancora distribuito** sul tuo account Cloudflare.

## Installazione
1. Da questa directory: `npm install`
2. Genera VAPID: `npm run keys`. Non inserire mai la chiave privata su GitHub.
3. Crea DB: `npx wrangler d1 create morning-briefing-push`, copia il database ID nel file wrangler.toml.
4. Crea tabelle: `npx wrangler d1 execute morning-briefing-push --remote --file=schema.sql`.
5. Configura secrets: `npx wrangler secret put VAPID_PRIVATE_KEY`; `npx wrangler secret put PUBLISH_TOKEN` e `npx wrangler secret put VAPID_SUBJECT` (es. mailto:indirizzo@example.com).
6. Aggiungi la chiave pubblica tramite `npx wrangler secret put VAPID_PUBLIC_KEY` (oppure una var).
7. Pubblica: `npm run deploy`.
8. Nel file `index.html` del sito GitHub, sostituisci `const PUSH_API='';` con l'URL HTTPS del Worker, senza slash finale. Aspetta il deployment di GitHub Pages.
9. Installa la PWA e usa “Attiva notifiche”. Su iOS la PWA va installata sulla schermata Home.

## Invio
Dopo che il report sia davvero pubblicato, esegui:
```
curl -X POST https://TUO-WORKER.workers.dev/api/publish \
 -H 'Authorization: Bearer TUO_PUBLISH_TOKEN' \
 -H 'Content-Type: application/json' \
 -d '{"date":"2026-10-08"}'
```
Proteggi il token. Il controllo sulla data impedisce il doppio invio; un fallimento parziale non viene automaticamente ritentato. Non esiste ancora un'integrazione con lo Scheduled Task ChatGPT.

La sottoscrizione contiene un endpoint e chiavi pubbliche del browser: usala solo per le notifiche richieste e prevedi informativa e cancellazione quando allarghi la diffusione.
