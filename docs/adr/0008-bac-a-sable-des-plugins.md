# 0008 — Bac à sable des plugins

- **Statut** : proposé
- **Date** : 2026-11-04
- **Décideurs** : équipe cœur POuxis, sécurité
- **Liens** : `docs/security/THREAT_MODEL.md` § 3.7, ARCHITECTURE § 12.1

## Contexte et problème

La fonction 6.3 ouvre POuxis à des commandes « / », widgets et blocs écrits par la communauté en
JavaScript/TypeScript ; 4.4 (nœuds enrichis) et 5.9 (banques d'assets) en dépendent. Un plugin
malveillant ou vulnérable ne doit pouvoir ni lire des données qui ne lui sont pas accordées, ni
exfiltrer, ni accéder aux clés, ni appeler les capacités natives Tauri.

## Options considérées

1. **iframe `sandbox`** (sans `allow-same-origin`), origine opaque, CSP stricte, communication par
   `postMessage` avec un protocole typé et des capacités accordées.
2. **Web Worker** avec API injectée.
3. **Interpréteur JS embarqué en WASM** (moteur JS compilé en WASM) exécutant le plugin isolé.
4. **Exécution dans la page** (modèle des extensions classiques), revue manuelle.

## Décision proposée

**Option 1 pour les plugins avec interface, option 2 pour les plugins sans interface**, les deux
derrière le même protocole de messages :

- manifeste déclarant les **capacités** demandées (lire telle collection, insérer un bloc, réseau
  vers des domaines listés), accordées par la personne et révocables ;
- aucun accès direct au `Store`, à l'IPC Tauri, aux clés ni aux coffres : l'hôte filtre chaque
  requête et ne transmet que des copies ;
- écritures traduites en ops CRDT ordinaires, attribuées au plugin (journal d'audit 6.5) ;
- quotas de temps et de mémoire, arrêt de l'iframe ou du worker en cas de dépassement.

L'option 3 offre l'isolation la plus forte et le contrôle déterministe des ressources ; elle est
gardée comme repli si les WebView cibles ne garantissent pas l'isolation des iframes `sandbox`.
L'option 4 est exclue.

## Conséquences

- **Positives** : surface d'attaque réduite au protocole ; consentement lisible ; compatible web et
  natif.
- **Négatives** : API asynchrone uniquement ; rendu des widgets dans une iframe (styles et tailles
  à négocier) ; maintenance d'un protocole versionné.
- À valider avant 1.0 : tests d'évasion du bac à sable sur chaque moteur de WebView.
