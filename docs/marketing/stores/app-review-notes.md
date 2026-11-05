# Notes pour les équipes de revue

Rédigées en anglais (langue lue par toutes les équipes de revue ; Apple accepte toute langue).
Les `{{PLACEHOLDERS}}` sont à remplacer avant soumission : `check-limits.mjs` les signale par un
avertissement. Mettre à jour la section « What's in this version » à chaque soumission : Apple
exige une description précise de chaque nouveauté (2.1).

## Apple — App Review Information › Notes (4 000 octets max.)

Pas de compte de démonstration : laisser « Sign-in required » décoché.

<!-- field: apple.reviewNotes@en -->

```text
POuxis is a local-first planner: calendar, tasks and ideas. No account or sign-in is needed; every feature works offline on the device. There is no ad, analytics or tracking SDK.

How to review the main features (sample data can be loaded from Settings > Sample data):
1. Today: shows the day timeline. Tap Capture (or press Cmd+K on iPad with a keyboard) and type "Project meeting Tuesday 2pm-4pm": a dated event is created.
2. Tasks: add a task with an estimated duration; POuxis places it in an open slot of the day. Extend a running task to see the following ones shift while fixed events stay in place.
3. Focus: open a task and choose Focus to show it alone with a Pomodoro timer.
4. Canvas: open a canvas to see a mind map with automatic layout.
5. Ideas and Insights: inbox of captured ideas, random creative constraints, and weekly insights computed on the device.

Sync (optional): sync between the user's own devices goes through a relay server that only stores end-to-end encrypted envelopes; the relay cannot read content. To test it, pair two devices from Settings > Sync with the relay {{REVIEW_RELAY_URL}}. Sync is not required to use the app.

Encryption: the app uses only standard, published algorithms through the platform WebCrypto API (AES-256-GCM, HKDF-SHA256, PBKDF2-HMAC-SHA256) to encrypt vaults and sync payloads. Export compliance documentation: {{EXPORT_COMPLIANCE_STATUS}}.

Permissions: notifications are requested only when the user enables reminders.

What's in this version: first release.

Contact for the review team: {{REVIEW_CONTACT_EMAIL}}.
```

## Google Play — Contenu de l'app › Accès à l'app

Choisir « Toutes les fonctionnalités sont disponibles sans restriction d'accès ». Le texte
ci-dessous sert d'instructions complémentaires si la console en demande.

<!-- field: play.appAccess@en -->

```text
No account or login is required. All features work offline on the device. Optional sync between the user's own devices uses an end-to-end encrypted relay; to test it, pair two devices from Settings > Sync with the relay {{REVIEW_RELAY_URL}}. Sample data can be loaded from Settings > Sample data.
```

## Microsoft Store — Options de soumission › Notes pour la certification

Limite de caractères non relevée dans la documentation consultée : le script ne lève qu'un
avertissement au-delà de 4 000 caractères.

<!-- field: ms.certificationNotes@en -->

```text
POuxis is a local-first planner (calendar, tasks, ideas). No account or sign-in is needed and every feature works offline. To review: open Today, press Ctrl+K and type "Project meeting Tuesday 2pm-4pm" to create a dated event; add a task with a duration to see it scheduled automatically; open Canvas for an auto-laid-out mind map. The global capture shortcut ({{CAPTURE_SHORTCUT}}) opens a capture line over other apps. Optional sync goes through an end-to-end encrypted relay ({{REVIEW_RELAY_URL}}). Sample data: Settings > Sample data.
```

## Points à confirmer avant de soumettre

- Libellés exacts des menus (« Settings > Sample data », « Settings > Sync ») et raccourcis
  (`Cmd+K` / `Ctrl+K`, raccourci global) dans le build soumis.
- Algorithmes réellement utilisés (`packages/core/src/crypto/kdf.ts`, `aead.ts`) : corriger la
  phrase « Encryption » s'ils diffèrent.
- Existence d'un relais de revue ; sinon retirer les phrases sur la synchronisation.
