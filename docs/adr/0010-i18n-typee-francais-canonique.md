# 0010 — Internationalisation typée, français canonique

- **Statut** : accepté
- **Date** : 2026-11-04
- **Décideurs** : équipe cœur POuxis, rédaction UX
- **Liens** : `apps/pouxis/src/i18n/`, `apps/cli/src/i18n/`, `docs/design/UX_WRITING.md`

## Contexte et problème

POuxis est conçu en français et publié au moins en français et en anglais. Les erreurs à
éviter : clés manquantes découvertes en production, chaînes codées en dur, formats de date
ignorant le fuseau, typographie française négligée (espaces insécables avant `: ; ! ?`,
guillemets « »).

## Options considérées

1. **Dictionnaires TypeScript typés**, français canonique, anglais miroir vérifié par le compilateur.
2. Bibliothèque i18n avec fichiers JSON (ICU MessageFormat).
3. Extraction automatique des chaînes depuis le code.

## Décision

**Option 1.**

- Un fichier par namespace (`src/i18n/fr/tasks.ts`, …) ; le type des clés (`MessageKey`) dérive du
  dictionnaire **français** ; l'anglais doit avoir exactement les mêmes clés (erreur de
  compilation sinon) ; un test vérifie la complétude et les paramètres.
- `useT()` pour les messages, `useFormat()` pour dates et nombres via `Intl`, **toujours** avec le
  fuseau IANA des préférences, jamais celui de la machine.
- Typographie française appliquée par un module dédié (`typography.ts`) et testée.
- La CLI suit le même principe avec ses propres dictionnaires `fr`/`en`.

## Conséquences

- **Positives** : aucune clé manquante ne peut être publiée ; autocomplétion des clés ; pas de
  dépendance ; le français est soigné en premier, conformément à la langue du produit.
- **Négatives** : ajout d'une langue = ajout d'un dossier complet et revue ; pluriels gérés
  par un sous-ensemble de la syntaxe ICU (`plural`, `message.ts`) appuyé sur `Intl.PluralRules`,
  pas par un moteur ICU complet ;
  les traducteurs bénévoles éditent du TypeScript (un export vers un format d'échange pourra être
  ajouté si la communauté le demande).
