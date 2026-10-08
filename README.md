# Morning Financial Briefing

PWA: https://gabberthomson.github.io/morning-financial-briefing/
Worker: https://morning-briefing-push.gabbriellini.workers.dev

GitHub Pages ospita la PWA; Cloudflare Workers e D1 gestiscono Web Push standard con VAPID. Nessun Firebase, dominio o piano a pagamento.

## Uso

Aprire la PWA e premere **Attiva notifiche**, poi autorizzare il browser. Il pulsante diventa **Disattiva notifiche**. La disattivazione elimina prima la registrazione D1, poi la sottoscrizione locale. Su iPhone/iPad installare nella schermata Home e avviare da lì (iOS 16.4+). Il rifiuto dei permessi si risolve nelle impostazioni del browser.

## Pubblicazione e invio

Il briefing corrente è dimostrativo: `publication.json` contiene `status: demo` e non abilita notifiche di edizione. Per una vera edizione:

1. Aggiornare il contenuto e `publication.json` con `{"date":"YYYY-MM-DD","status":"published"}` nello stesso commit.
2. Pubblicare su GitHub Pages e verificare che la nuova edizione sia accessibile.
3. Solo dopo chiamare `POST /api/publish` con JSON `{"date":"YYYY-MM-DD"}` e header `Authorization: Bearer <PUBLISH_TOKEN>`.

Il Worker legge il manifest dal sito pubblico, verifica data/stato e acquisisce atomicamente la data in D1. Un secondo invio, anche simultaneo, riceve HTTP 409. Il token non va mai nel frontend. Generazione, pubblicazione e invio restano separati; non è stata configurata un'automazione ChatGPT.

## Gestione e sicurezza

Vedere [push-worker/README.md](push-worker/README.md). La chiave VAPID privata esiste esclusivamente nei segreti Cloudflare; il generatore non la stampa. Il token amministrativo locale è in un file ignorato da Git. Endpoint e chiavi delle sottoscrizioni sono memorizzati solo in D1; i log contengono esclusivamente conteggi.

La configurazione iniziale supporta **20 dispositivi**, per contenere i subrequest anche in caso di endpoint scaduti entro il piano Workers gratuito. La capacità è applicata atomicamente da un trigger D1; nessuna sottoscrizione viene accettata oltre questo limite. Prima di ampliare la platea occorre introdurre invii a lotti e una coda, senza passare automaticamente a un piano a pagamento.

La deduplicazione privilegia l'assenza di doppioni: una data acquisita non viene reinviata automaticamente, neppure dopo un arresto del Worker o un errore transitorio. Gli endpoint 404/410 vengono eliminati; gli altri errori conservano la sottoscrizione. Il successo dell'API push indica accettazione dal servizio del browser, non lettura sul dispositivo.

## Verifiche

`cd push-worker` e `node test.mjs`: sottoscrizione, host consentiti, CORS, autenticazione, data valida, blocco delle edizioni non pubblicate, invii simultanei senza doppioni, errori transitori, pulizia endpoint scaduti e disattivazione.

Build Worker: `pnpm exec wrangler deploy --dry-run`. Deploy: `pnpm exec wrangler deploy`. La PWA è statica e non richiede compilazione. GitHub Pages pubblica il branch main dalla radice.

La ricezione e l'apertura su telefono richiedono la prova fisica dell'utente. I dati finanziari dimostrativi non si aggiornano automaticamente.
