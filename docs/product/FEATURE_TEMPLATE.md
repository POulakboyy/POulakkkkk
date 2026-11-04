# Gabarit de spécification de fonctionnalité

> Copier ce fichier, le renommer `docs/product/features/<id>-<nom-court>.md` (par exemple
> `1.1-routage-dynamique.md`) et remplir chaque section. Une section sans objet est conservée
> avec la mention « Sans objet » et une phrase d'explication. Les fonctions hors des 100 du
> [brief](../BRIEF.md) utilisent l'identifiant `X.n` jusqu'à leur intégration dans la
> [feuille de route](./ROADMAP.md).

---

## En-tête

| Champ                | Valeur                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Identifiant          | `m.n`                                                                                    |
| Nom                  |                                                                                          |
| Module               | 1 Temps · 2 Tâches · 3 Stockage · 4 Graphes · 5 Idéation · 6 Collaboration · 7 Interface |
| Phase visée          | 0.1 · 0.2 · 0.3 · 1.0 · 2.0+ · Recherche                                                 |
| Complexité           | S · M · L · XL                                                                           |
| Statut               | Proposition · Acceptée · En cours · Livrée · Rejetée                                     |
| Responsable          |                                                                                          |
| Dernière mise à jour | AAAA-MM-JJ                                                                               |

## 1. Problème

Quel problème, pour qui, dans quelle situation ? Une ou deux phrases, sans décrire la solution.

## 2. Personnes concernées

Proto-personas (`PP1`–`PP5`, [`PERSONAS.md`](../research/PERSONAS.md)) et risque de recherche
lié (`R1`–`R7`, [`USER_RESEARCH.md`](../research/USER_RESEARCH.md)). Préciser pour qui la fonction
pourrait **nuire**.

## 3. Place dans la boucle

Quel maillon renforce-t-elle (Capturer, Planifier, Se concentrer, Faire le bilan, socle) ? Si
aucun : quelle fonction existante remplace-t-elle, ou pourquoi mérite-t-elle d'allonger le
produit ? (Voir [`ROADMAP.md` § 1](./ROADMAP.md#1-principes-de-priorisation).)

## 4. Hypothèse et éléments probants

- **Hypothèse** : « Nous pensons que … pour … ; nous le saurons quand … ».
- **Éléments probants** : uniquement des sources **vérifiées** (référence complète : auteurs,
  année, titre, revue ou éditeur). Distinguer ce qui est démontré, ce qui est une inspiration et
  ce qui est une supposition. Aucune statistique ni citation inventée.
- **Ce qui invaliderait l'hypothèse** :

## 5. Périmètre

- **Inclus** :
- **Exclu (et pourquoi)** :
- **Variante dégradée** si une plateforme ne permet pas la version complète :

## 6. Expérience

Parcours principal en étapes numérotées, états (vide, chargement, erreur, hors-ligne), textes clés
en français et en anglais. Indiquer les animations (`transform`/`opacity`, tokens `--dur-*`) et
leur comportement sous `prefers-reduced-motion`.

## 7. Récits utilisateur et critères d'acceptation

**US-x — Titre.** En tant que …, je veux … afin de …

- **AC-x.1** — Étant donné …, quand …, alors ….
- **AC-x.2** — Étant donné …, quand …, alors ….

Couvrir au minimum : cas nominal, cas limite (fuseaux, changement d'heure, données vides, volume
important), hors-ligne, conflit de synchronisation, annulation.

## 8. Conception technique

- **Moteur** (`packages/core/src/<module>/`) : fonctions publiques, complexité algorithmique,
  déterminisme.
- **Modèle de données** : changement nécessaire à `packages/core/src/model.ts` ? Ce fichier est un
  contrat partagé : décrire la modification proposée et sa migration.
- **Synchronisation** : comportement des fusions concurrentes, règle de résolution.
- **Interface** (`apps/pouxis/src/views/…` ou `src/features/…`) : composants, store utilisé.
- **Natif** (`apps/pouxis/src-tauri/`) : API OS par plateforme, autorisations requises.
- **Dépendances** : autres fonctions (`m.n`) ; toute nouvelle dépendance npm doit être justifiée
  (le moteur n'en accepte aucune).

## 9. Plateformes

| Plateforme | Prise en charge (complète / dégradée / aucune) | API ou mécanisme | Remarques |
| ---------- | ---------------------------------------------- | ---------------- | --------- |
| iOS        |                                                |                  |           |
| Android    |                                                |                  |           |
| macOS      |                                                |                  |           |
| Windows    |                                                |                  |           |
| Linux      |                                                |                  |           |

## 10. Vie privée et cadre juridique

- Données personnelles traitées (et catégories particulières : santé, biométrie, localisation) :
- Traitement local uniquement, ou envoi réseau ? Vers qui ? Chiffré de bout en bout ?
- Appel à un service tiers, clé d'API, coût récurrent :
- Textes potentiellement applicables à faire vérifier (RGPD, règlement IA, règlement sur les
  services numériques, droit du travail, licences, marques) :
- Valeur par défaut (activée / désactivée) et justification :
- Avis juridique requis ? Oui / non.

## 11. Accessibilité (WCAG 2.2 AA)

- Utilisation complète au clavier ; ordre de focus ; focus jamais masqué (2.4.11).
- Alternative à tout glisser-déposer (2.5.7) ; cibles ≥ 44 × 44 px.
- Noms accessibles, annonces des changements d'état pour les lecteurs d'écran.
- Contrastes (texte 4,5:1, composants 3:1) en thèmes clair, sombre et E-Ink.
- Aucun délai imposé (2.2.1) ; mouvement réduit respecté.

## 12. Internationalisation

Nouvelles clés (namespace `src/i18n/<fr|en>/…`), formats de date et de nombre, expressions à
reconnaître dans les deux langues le cas échéant.

## 13. Performance

Budget propre à la fonction, cohérent avec [`MVP_SPEC.md` § 5](./MVP_SPEC.md#5-budgets-de-performance),
et méthode de mesure.

## 14. Mesure locale

Événements ajoutés au plan d'analytique locale ([`MVP_SPEC.md` § 6](./MVP_SPEC.md#6-plan-danalytique-locale)) :
nom, propriétés (jamais de contenu), question à laquelle ils répondent.

## 15. Tests

- Unitaires (moteur) :
- Composants (interface, jsdom) :
- Bout en bout (Playwright) :
- Manuels (appareils réels, technologies d'assistance) :

## 16. Déploiement

Réglage d'activation, valeur par défaut, migration de données, notes de version, documentation
utilisateur à écrire.

## 17. Risques et questions ouvertes

Risques à reporter dans [`RISKS.md`](./RISKS.md) s'ils dépassent la fonction ; questions avec la
personne ou la méthode qui y répondra.

## 18. Journal des décisions

| Date | Décision | Raison |
| ---- | -------- | ------ |
|      |          |        |
