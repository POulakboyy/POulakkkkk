# Liste de contrôle de publication

À dérouler pour **chaque** version, même un simple correctif. Copiez cette liste dans l'issue
ou la pull request de préparation de la version et cochez au fur et à mesure.

**Version :** `vX.Y.Z` · **Date :** AAAA-MM-JJ · **Responsable :** @…

## 1. Avant de taguer

- [ ] La CI est verte sur le commit de `main` à publier (CI, Rust, CodeQL).
- [ ] Aucune issue ouverte étiquetée bloquante pour cette version.
- [ ] Le numéro choisi respecte [VERSIONING.md](VERSIONING.md) ; pour une préversion, l'identifiant
      est **numérique** (`vX.Y.Z-N`), sinon le MSI Windows ne se construit pas.
- [ ] La version est identique dans tous les manifestes : `package.json` (racine, `packages/core`,
      `apps/pouxis`, `apps/sync-server`, `apps/cli`), `apps/pouxis/src-tauri/Cargo.toml`, et
      `tauri.conf.json` si la version y est littérale ; `package-lock.json` et `Cargo.lock`
      régénérés.
- [ ] `node .github/scripts/app-version.mjs --expect-tag vX.Y.Z` réussit sans avertissement.
- [ ] Migrations de données locales : testées depuis la version précédente, sur une copie de base
      réelle, sans perte.
- [ ] Protocole de synchronisation : un client de la version précédente et un client de la
      nouvelle version se synchronisent via le nouveau serveur (et inversement si la majeure ne
      change pas).
- [ ] Notes de version rédigées en français : nouveautés, corrections, changements incompatibles
      et actions requises des utilisateurs.
- [ ] Certificats et clés valides au-delà de la date de publication (voir le tableau en bas).

## 2. Répétition générale (recommandée pour une mineure ou une majeure)

- [ ] Lancer **Release** à la main (`workflow_dispatch`) sur le commit candidat.
- [ ] Les trois builds réussissent et le brouillon contient les installateurs attendus.
- [ ] Supprimer ce brouillon de répétition avant de poser le vrai tag (le workflow refuse de
      réutiliser une release publiée, mais réutiliserait ce brouillon).

## 3. Publication

- [ ] Créer et pousser le tag annoté depuis `main` à jour :

      ```sh
      git tag -a vX.Y.Z -m "POuxis vX.Y.Z"
      git push origin vX.Y.Z
      ```

- [ ] Workflow **Release** : `prepare` puis les trois jobs `desktop` sont verts ; aucun
      avertissement « non signé » dans les résumés.
- [ ] Workflow **Sync server image** : l'image `ghcr.io/…/pouxis-sync-server:X.Y.Z` est publiée
      avec provenance et SBOM.
- [ ] Workflow **Mobile** lancé à la main sur le tag ; artefacts APK, AAB et IPA récupérés.

## 4. Vérifications avant de rendre publique

Sur des machines propres (ou des machines virtuelles), installer depuis le brouillon :

- [ ] **macOS** (Apple Silicon et Intel) : l'application s'ouvre sans alerte Gatekeeper ;
      `spctl -a -vvv /Applications/POuxis.app` indique « Notarized Developer ID ».
- [ ] **Windows** : l'installateur affiche l'éditeur vérifié ; SmartScreen ne bloque pas.
- [ ] **Linux** : `.deb` et AppImage se lancent sur la distribution de référence.
- [ ] Parcours clés sur chaque plate-forme : créer une tâche, la planifier, lancer une session de
      focus, retrouver les données après redémarrage, synchroniser deux appareils.
- [ ] Mise à jour intégrée : une installation de la version précédente détecte et applique la
      nouvelle version (`latest.json` présent dans la release).
- [ ] Serveur : `docker run` de la nouvelle image démarre, et un client s'y connecte.

## 5. Mise à disposition

- [ ] Relire puis **publier** le brouillon (marqué « préversion » automatiquement si besoin).
- [ ] Envoyer l'AAB à Google Play et l'IPA à App Store Connect ; suivre la revue.
- [ ] Mettre à jour le site (`website/`) et la documentation si besoin.
- [ ] Annoncer la version aux canaux du projet.
- [ ] Fermer le jalon et les issues livrées.

## 6. Après la publication (premières 48 heures)

- [ ] Surveiller les nouvelles issues étiquetées `bug` portant sur cette version.
- [ ] Surveiller les retours des stores (plantages signalés, avis).

## Critères de retour arrière

Décidés **avant** la publication ; si l'un est atteint, appliquer la procédure ci-dessous.

- Perte ou corruption de données confirmée chez au moins un utilisateur.
- Synchronisation impossible entre la nouvelle version et la précédente.
- L'application ne démarre pas sur une plate-forme prise en charge.
- Faille de sécurité introduite par la version.

**Procédure** :

1. Repasser la release en brouillon (ou la supprimer) pour stopper les téléchargements et
   retirer `latest.json` de la distribution, ce qui stoppe la mise à jour automatique.
2. Dans les stores, suspendre le déploiement progressif.
3. Pour le serveur, redéployer l'image précédente (`ghcr.io/…:X.Y.(Z-1)`).
4. Publier un correctif `vX.Y.(Z+1)` : un tag publié n'est jamais réutilisé.
5. Rédiger un post-mortem sans recherche de coupable.

## Échéances des certificats

| Élément                             | Expire le                                 | Renouvelé par |
| ----------------------------------- | ----------------------------------------- | ------------- |
| Certificat Developer ID (macOS)     | à compléter                               | à compléter   |
| Certificat de distribution iOS      | à compléter                               | à compléter   |
| Profil de provisionnement iOS       | à compléter                               | à compléter   |
| Certificat Authenticode (Windows)   | à compléter                               | à compléter   |
| Mot de passe pour application Apple | sans échéance, à révoquer en cas de doute | —             |
