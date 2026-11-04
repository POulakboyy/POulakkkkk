# Décisions d'architecture (ADR)

Ce dossier consigne les décisions structurantes de POuxis au format
[MADR](https://adr.github.io/madr/) : contexte, facteurs de décision, options considérées,
décision, conséquences. Une décision acceptée n'est pas réécrite : on la remplace par un nouvel
ADR qui la marque « remplacée par ». La vue d'ensemble est dans
[`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md).

| N°   | Décision                                                                                                                | Statut  |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | ------- |
| 0001 | [Shell multiplateforme : Tauri 2](0001-shell-multiplateforme-tauri-2.md) (vs Flutter, React Native, Electron, natif)    | Accepté |
| 0002 | [Convergence : HLC maison, LWW par champ et CRDT de blocs](0002-crdt-hlc-lww-par-champ-et-blocs.md) (vs Automerge, Yjs) | Accepté |
| 0003 | [Stockage local par plateforme, derrière l'interface `Store`](0003-stockage-par-plateforme-derriere-store.md)           | Accepté |
| 0004 | [Relais de synchronisation aveugle chiffré de bout en bout](0004-relais-de-synchronisation-e2ee.md)                     | Accepté |
| 0005 | [Moteur de domaine en TypeScript pur, sans dépendance](0005-moteur-ts-pur-sans-dependance.md)                           | Accepté |
| 0006 | [Chemin de rendu du canvas infini](0006-rendu-du-canvas.md)                                                             | Proposé |
| 0007 | [IA sur l'appareil d'abord, cloud sur consentement](0007-ia-sur-l-appareil-d-abord.md)                                  | Accepté |
| 0008 | [Bac à sable des plugins](0008-bac-a-sable-des-plugins.md)                                                              | Proposé |
| 0009 | [Routage par hash, vues découpées, CSS Modules et tokens](0009-routage-hash-vues-decoupees-css-modules.md)              | Accepté |
| 0010 | [Internationalisation typée, français canonique](0010-i18n-typee-francais-canonique.md)                                 | Accepté |

Décision de sécurité liée : **ADR-SEC-001** (PBKDF2 aujourd'hui, Argon2id ensuite), consignée dans
[`docs/security/SECURITY_ARCHITECTURE.md`](../security/SECURITY_ARCHITECTURE.md) § 4.1.

## Rédiger un nouvel ADR

1. Copier la structure d'un ADR existant ; numéroter à la suite (`0011-titre-court.md`).
2. Statut initial « proposé » ; passer à « accepté » après revue.
3. Toujours lister au moins deux options réellement envisagées et les conditions de réévaluation.
4. Ne citer que des faits vérifiés (documentation officielle, code du dépôt, publications) ;
   aucun chiffre de performance non mesuré présenté comme un résultat.
5. Ajouter la ligne au tableau ci-dessus.
