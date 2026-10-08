# Verifiche eseguite l'8 ottobre 2026

- Worker distribuito: https://morning-briefing-push.gabbriellini.workers.dev
- Versione Cloudflare: 8181a682-f47f-406d-8d57-b0c0a98eb97e, seguita dal deployment della correzione fetch (vedere cronologia Cloudflare).
- GitHub Pages: build/deploy riuscito per 66166a010c83aee73f516c618a9bac94c956495e.
- Endpoint live: health 200 con D1 disponibile e segreti presenti; config 200 con chiave pubblica P-256 di 87 caratteri; amministrazione senza token 401; data impossibile 400; edizione non pubblicata 409.
- Test logica Worker: registrazione, validazione host e chiavi, CORS, token amministrativo, gate di pubblicazione, deduplicazione simultanea, errori transitori, eliminazione endpoint scaduti e disattivazione: PASS.
- Test libreria reale: payload aes128gcm decifrato con implementazione indipendente, firma ECDSA VAPID verificata, audience e scadenza verificate: PASS.
- Test SQLite con migrazioni effettive: capacità atomica, upsert a capacità piena, unicità delle edizioni: PASS (`python sql-test.py`).
- Browser: PWA caricata e stato «Notifiche disponibili» visibile. Corretto un ReferenceError preesistente nella navigazione delle schede.
- Telefono: IN ATTESA dell'attivazione da parte dell'utente. Nessuna ricezione fisica o apertura tramite notifica dichiarata come verificata.

Le simulazioni degli errori non equivalgono a una consegna push fisica. Per completare: sottoscrivere il telefono, eseguire `node phone-test.mjs`, confermare ricezione e apertura; disattivare nella PWA e verificare la rimozione D1. Non inviare notifiche di edizione sul briefing dimostrativo.
