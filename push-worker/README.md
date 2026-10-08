# Backend push

Richiede Node 22.12+ e pnpm. Dipendenze bloccate nel lockfile: @mmmike/web-push 1.3.0, Wrangler 4.148.0. La libreria usa Web Crypto, aes128gcm RFC 8291 e VAPID RFC 8292 senza shim Node.

## Riproduzione del deployment

1. `pnpm install --frozen-lockfile`
2. `pnpm exec wrangler login`
3. `pnpm exec wrangler d1 migrations apply morning-briefing-push --remote`
4. Solo alla prima installazione: `node provision-secrets.mjs`. **Non rieseguire su un sistema in uso**: ruota chiavi e token e richiede nuove sottoscrizioni.
5. `node test.mjs`
6. `pnpm exec wrangler deploy`

Il database è dedicato a questo progetto; non modificare altri database. `generate-keys.mjs` delega al provisioner: nessun segreto viene stampato. La chiave privata viene generata in memoria e inviata a `wrangler secret bulk` tramite stdin, senza file temporanei. I tre segreti sono VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e PUBLISH_TOKEN. Il token locale in `.admin.secrets.json` è escluso dal repository: conservarlo in modo riservato. Non aggiungere il file a Git.

## API

- GET /api/health: accesso D1 e configurazione presente.
- GET /api/config: chiave VAPID pubblica.
- POST /api/subscribe: oggetto PushSubscription.toJSON(). Upsert per endpoint; massimo 20 dispositivi.
- POST /api/unsubscribe: stesso oggetto, verificato contro la chiave auth salvata.
- POST /api/test: amministrativo; JSON `{subscription: <PushSubscription.toJSON()>}`. Invio esclusivamente al dispositivo specificato, senza acquisire una data.
- POST /api/publish: amministrativo; JSON `{date: "YYYY-MM-DD"}`. Richiede manifest pubblico pubblicato e data identica. HTTP 409 per date già acquisite.

Gli endpoint amministrativi richiedono Authorization Bearer PUBLISH_TOKEN. La CORS ammette solo https://gabberthomson.github.io; non sostituisce l'autenticazione. JSON massimo 6000 caratteri, chiavi auth/p256dh controllate, endpoint limitati ai servizi push dei browser. Non stampare sottoscrizioni o errori della libreria che potrebbero includere capability URL.

`node live-check.mjs` verifica health, configurazione e rifiuti amministrativi; usa il token locale senza stamparlo. Per il test fisico `node phone-test.mjs` seleziona l'unica sottoscrizione presente in D1 e invia una notifica di test autorizzata. Se ne esiste più di una si interrompe per evitare invii ad altri dispositivi.
