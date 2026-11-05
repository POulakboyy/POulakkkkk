# Publications Reddit

> Les règles changent et diffèrent d'une communauté à l'autre : **avant chaque publication**,
> relire la barre latérale et le règlement épinglé du subreddit, et l'appliquer à la lettre
> (autopromotion, jour dédié, _flair_ obligatoire, liens autorisés). Ce document propose des textes
> et une check-list ; il ne remplace pas cette lecture. Principes communs : publier depuis un
> compte qui participe déjà à la communauté, une seule communauté par jour, pas de publication
> croisée identique, dire clairement « je suis le développeur », répondre à chaque commentaire,
> ne jamais demander de votes.

## Check-list avant envoi

- [ ] Règles du subreddit relues aujourd'hui ; autopromotion autorisée sous cette forme ?
- [ ] _Flair_ choisi si exigé ; titre conforme au format demandé.
- [ ] Le lien mène à quelque chose d'utilisable (dépôt, build), pas seulement à une liste d'attente.
- [ ] Chaque fonction citée est cochée dans le [registre](../../stores/claims-register.md).
- [ ] Je suis disponible pendant les heures qui suivent pour répondre.

## r/selfhosted (EN) — angle : relais auto-hébergeable

**Titre** : `I built an end-to-end encrypted sync relay for my local-first planner app (self-hostable, AGPL)`

> Hi all, I'm the developer of POuxis, an open-source calendar/tasks/notes app that works offline
> first. Sync is optional and goes through a small relay that you can run yourself.
>
> - The relay never sees content: clients encrypt payloads (AES-256-GCM) before sending.
> - Storage is an append-only JSONL log; access uses per-space HMAC tokens.
> - Ships with a Dockerfile and a compose file. <!-- verify on the day -->
> - Licence: AGPL-3.0-or-later.
>
> Repo and relay docs: {{GITHUB_URL}}
>
> I'd value feedback from people who run this kind of thing: what would you need (backups,
> metrics, auth integration) before trusting it with your data?

## r/opensource (EN) — angle : choix des licences et gouvernance

**Titre** : `POuxis: an open-source, local-first planner — MPL-2.0 engine, AGPL apps. Feedback on the licensing split?`

> I'm releasing POuxis, a calendar + tasks + ideas app. The domain engine is plain TypeScript
> with no runtime dependencies and is MPL-2.0 so plugins and third-party clients can reuse it;
> the apps and sync relay are AGPL-3.0-or-later; docs are CC-BY-4.0; the name and logo are
> covered by a trademark policy so forks can't present themselves as the original.
>
> The reasoning is written up in the repo (`docs/legal/LICENSING.md`). Does this split make sense
> to you, and is there anything that would stop you from contributing?
>
> {{GITHUB_URL}}

## r/SideProject (EN) — angle : construire en public

**Titre** : `I had seven apps for one day, so I'm building one (open source, offline-first)`

> I make videos about time and attention, and I'm building the planner I always wanted, in
> public. One loop: capture a sentence → the day gets planned around fixed events → focus on one
> task → weekly review. It works offline and the code is open.
>
> What I'd love feedback on: the first five minutes. What's confusing?
>
> Repo: {{GITHUB_URL}} · launch video: {{YOUTUBE_URL}}

## r/productivity (EN) — angle : la science, avec ses limites

> Plusieurs communautés « productivité » limitent fortement l'autopromotion : vérifier s'il existe
> un fil dédié aux outils et y publier plutôt qu'en sujet principal si c'est la règle.

**Titre** : `What I learned reading the research behind "productivity" features (and the numbers I couldn't find)`

> While building a planner app, I tried to source every feature idea. Some held up, some didn't:
>
> - **Attention residue** (Leroy, 2009): switching before finishing a task leaves part of your
>   attention behind. Writing a one-line "ready-to-resume" plan reduced it (Leroy & Glomb, 2018).
>   No study I found gives an ideal buffer length.
> - **Broken streaks** (Silverman & Barasch, 2022): a broken streak lowers engagement, less so
>   when it can be repaired.
> - **"21 days to form a habit"**: in Lally et al. (2010) the median was 66 days, ranging from 18
>   to 254.
> - **"23 minutes to refocus"**: not in the experimental paper it's usually attributed to (Mark
>   et al., 2008).
>
> Full write-up with DOIs and confidence levels: {{GITHUB_URL}}/blob/main/docs/research/SCIENTIFIC_BASIS.md
>
> (Disclosure: I'm building an open-source app, POuxis, that uses some of this. The write-up is
> useful without it.)

## r/developpeurs (FR) — angle : technique, en français

> Communauté francophone : vérifier son existence, son activité et ses règles au moment de
> publier ; à défaut, préférer un autre espace francophone (forum, Discord) plutôt que d'adapter le
> texte à une communauté qui ne s'y prête pas.

**Titre** : `Je développe une app d'agenda local-first open source : moteur TypeScript sans dépendance, CRDT maison, Tauri 2`

> Bonjour à tous,
>
> Je développe POuxis, une app qui réunit agenda, tâches et idées, et qui fonctionne d'abord
> hors-ligne. Quelques choix techniques sur lesquels j'aimerais vos avis :
>
> - moteur de domaine en TypeScript pur, zéro dépendance, fuseau IANA explicite partout ;
> - synchronisation par horloge logique hybride et registres « dernier écrivain gagne » par
>   champ, documents en blocs ; relais aveugle, contenu chiffré côté client (AES-256-GCM) ;
> - client React, coque native Tauri 2 pour bureau et mobile.
>
> Le code et les ADR sont ici : {{GITHUB_URL}}
>
> Qu'est-ce qui vous paraît fragile ?
