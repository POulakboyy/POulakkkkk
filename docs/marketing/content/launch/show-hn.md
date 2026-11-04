# Publication « Show HN »

> En anglais, voix du fondateur en développeur : modeste, technique, sans adjectifs marketing.
> Règles de Show HN à relire avant publication (`https://news.ycombinator.com/showhn.html`) :
> il faut quelque chose que les gens peuvent **essayer** (pas une page d'attente ni une liste
> d'inscription), le titre commence par « Show HN: », pas de demande de votes ni de faux
> commentaires. Publier quand le dépôt est public **et** qu'on peut lancer l'app (build
> téléchargeable ou `npm run dev` documenté). Vérifier chaque affirmation technique contre le
> code au moment de publier.

## Titre

`Show HN: POuxis – an open-source, local-first calendar, task and notes app`

Variante : `Show HN: POuxis – local-first planner with a dependency-free TypeScript engine`

## URL

`{{GITHUB_URL}}` (le dépôt plutôt que le site : le public de HN veut lire le code).

## Texte

> Hi HN,
>
> I'm building POuxis, an app that keeps calendar, tasks and ideas in one place. It is
> local-first: the device holds the real copy of the data, the app works fully offline, and sync
> is an optional service. It runs on macOS, Windows and Linux, with iOS and Android in beta.
> <!-- adjust to the platforms actually available on the day -->
>
> Some technical choices, and why:
>
> **A pure TypeScript domain engine with zero runtime dependencies.** Scheduling, tasks,
> recurrence, natural-language parsing, sync and crypto live in `packages/core`. No DOM and no
> Node APIs in `src/`, so the same code runs in the app, a CLI and tests. Every date carries an
> explicit IANA time zone; the machine's local zone is never used, which removed a whole class
> of DST bugs.
>
> **Sync: hybrid logical clocks + field-level LWW registers, plus block documents.** Each field
> of each record is a last-writer-wins register ordered by an HLC; deletes are tombstones; notes
> are sets of blocks with fractional positions and per-block history. This is deliberately
> simpler than a full sequence CRDT. The ADR lists when we'd move text inside a block to Yjs or
> Automerge (real-time co-editing of the same block, or users reporting lost edits).
>
> **A blind relay.** The sync server stores and forwards envelopes; payloads are encrypted on
> the client with AES-256-GCM via WebCrypto, with metadata bound as associated data and padding
> on the payload. Access uses per-space HMAC tokens. The relay is a small Node service you can
> self-host. Passphrase keys use PBKDF2 for now (it's what WebCrypto offers); Argon2id through a
> native command is planned and the format is versioned for that.
>
> **Tauri 2 for the shell.** One React UI, native shells for desktop and mobile, small bundles.
> Native capabilities (notifications, global capture shortcut, haptics) sit behind a platform
> interface, with documented fallbacks where an OS has no public API.
>
> **Research, with caveats.** A few defaults come from published work: buffers between
> back-to-back meetings (attention residue, Leroy 2009), streaks that can be repaired instead of
> reset (Silverman & Barasch 2022). There's a public document listing each source, its
> confidence level, and the popular claims we chose _not_ to repeat (21-day habits, "23 minutes
> to refocus", 25-minute optimal focus).
>
> What's not there: no AI features, no collaboration, no web version for distribution. The
> original brief has 100 features; the first release is 19 of them, forming one loop: capture →
> plan → focus → review.
>
> Licences: MPL-2.0 for the engine, AGPL-3.0-or-later for the apps and the relay.
>
> I'd especially like feedback on the sync design (field-level LWW: where will it hurt?) and on
> the engine API. Happy to answer anything.

## Préparer les réponses (FAQ probable)

| Question attendue                              | Éléments de réponse (vérifier avant)                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| « Pourquoi pas Yjs / Automerge directement ? » | ADR 0002 : besoins actuels = un écrivain par bloc ; zéro dépendance ; seuils de bascule écrits.              |
| « LWW perd des modifications. »                | Oui, au niveau d'un champ ; historique des versions par bloc pour restaurer ; c'est un compromis assumé.     |
| « Pourquoi PBKDF2 ? »                          | Seul KDF de mot de passe dans WebCrypto ; 600 000 itérations (recommandation OWASP) ; Argon2id prévu.        |
| « Pourquoi AGPL ? »                            | `docs/legal/LICENSING.md` : empêcher un relais modifié fermé ; le moteur reste en MPL pour la réutilisation. |
| « Encore une app de productivité. »            | Ne pas argumenter : montrer le dépôt, dire ce qui est différent (local-first, ouvert), accepter la critique. |
| « Le nom ? »                                   | Ne pas inventer d'étymologie ; répondre seulement si le fondateur a tranché (BRAND.md §9).                   |

Ton des réponses : remercier pour les critiques précises, corriger publiquement une erreur
signalée, ne jamais répondre sur un ton défensif.
