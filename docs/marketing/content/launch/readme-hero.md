# Propositions d'en-tête pour le `README.md`

> Le `README.md` racine n'appartient pas à ce dossier : ces propositions sont à intégrer par son
> propriétaire. Le README d'un dépôt international est en anglais ; une version française peut
> vivre dans `README.fr.md`. Ne mentionner que ce qui est livré ; badges seulement s'ils
> renvoient à une source réelle (CI, licence, version publiée).

## Option A — sobre (recommandée)

```markdown
<p align="center">
  <img src="docs/brand/assets/lockup-horizontal.svg" alt="POuxis" width="280">
</p>

<p align="center"><strong>Your time, made clear.</strong></p>

<p align="center">
  Calendar, tasks and ideas in one app. Local-first, end-to-end encrypted sync, open source.<br>
  macOS · Windows · Linux · iOS · Android
</p>

<p align="center">
  <a href="{{SITE_URL}}/beta">Try the beta</a> ·
  <a href="docs/BRIEF.md">Vision</a> ·
  <a href="docs/research/SCIENTIFIC_BASIS.md">Research</a> ·
  <a href="{{DISCORD_URL}}">Discord</a>
</p>
```

Puis, juste en dessous, une capture réelle de la vue du jour (clair et sombre via
`<picture>` + `prefers-color-scheme`) et trois lignes :

```markdown
- **Plan in one sentence.** "Team sync Tuesday 2–4pm" becomes an event; tasks fit around it.
- **Yours, offline.** Data lives on your device. Sync is optional and the relay can't read it.
- **Open.** Pure-TypeScript engine with zero runtime dependencies, Tauri 2 apps, AGPL/MPL.
```

## Option B — orientée développeurs

```markdown
# POuxis

Local-first calendar, tasks and notes. A dependency-free TypeScript engine (`@pouxis/core`),
a React + Tauri 2 client for desktop and mobile, and a blind, end-to-end encrypted sync relay
you can self-host.

[Quick start](#quick-start) · [Architecture](docs/architecture/ARCHITECTURE.md) ·
[ADRs](docs/adr/README.md) · [Contributing](CONTRIBUTING.md)
```

> Lien `CONTRIBUTING.md` à retirer s'il n'existe pas au moment de l'intégration.

## Option C — française (`README.fr.md`)

```markdown
<p align="center"><strong>Votre temps, en clair.</strong></p>

<p align="center">
  Agenda, tâches et idées au même endroit. Hors-ligne d'abord, synchronisation chiffrée de bout
  en bout, code ouvert.
</p>
```

## Ce qu'il faut éviter dans le README

- Des captures de maquettes présentées comme le produit.
- Des chiffres de performance non mesurés (« 0 ms de latence ») : le brief en parle, aucune
  mesure publiée ne l'établit.
- La liste des 100 fonctionnalités : renvoyer vers `docs/BRIEF.md` et la feuille de route.
