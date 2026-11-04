# Carte insight — gabarit

> Une carte par insight ([`USER_RESEARCH.md`](../USER_RESEARCH.md) § 9). Un insight relie des
> observations à une explication **et** à une conséquence produit. Sans contre-preuve recherchée, ce
> n'est pas un insight. Copier le bloc ci-dessous ; un fichier ou une section par carte.

```markdown
### INS-### — [Énoncé en une phrase, formulé comme une découverte, pas comme une solution]

- **Statut :** Signal | Insight | Remis en cause (voir INS-###)
- **Confiance :** Faible | Moyen | Fort — [justification selon § 9.2 : nb de participants,
  nb de méthodes, segments]
- **Risque / hypothèse :** R# · H#x — [soutient | affaiblit | nuance]
- **Segments concernés :** PP# (observés : x/n) ; segments non concernés : [..]

**Ce que nous avons observé** (faits, avec effectifs)

- [x/n participants …] — OBS-###, OBS-###
- [..]

**Ce que les personnes disent** (2 à 3 citations au plus, pseudonymisées, avec consentement C5 si
la carte est publiée)

- « … » — P##
- « … » — P##

**Pourquoi, à notre avis** (interprétation, clairement marquée comme telle)
[Mécanisme proposé ; lien éventuel avec la littérature, citée et vérifiée.]

**Contre-preuves et limites**

- [Ce qui va dans l'autre sens, qui n'a pas ce comportement, biais possibles]

**Conséquence pour le produit**

- Opportunité : « Comment pourrions-nous … ? »
- Fonctionnalités concernées : m.n, m.n
- Ce que nous ne devrions **pas** faire : [..]

**Pour aller plus loin**

- Question restante : [..]
- Comment la tester : [méthode, n, critère]

**Décisions liées :** DEC-### · **Date :** AAAA-MM-JJ · **Rédaction :** [rôle]
```

---

## Exemple — **FICTIF, à titre d'illustration uniquement**

Aucune donnée n'a été collectée : cet exemple montre le niveau de précision attendu.

### INS-000 — (EXEMPLE FICTIF) Les personnes acceptent un plan automatique quand elles peuvent en « figer » une partie

- **Statut :** Signal
- **Confiance :** Faible — 3 participants, une seule méthode (test d'utilisabilité, round 1)
- **Risque / hypothèse :** R1 · H1a, H1c — soutient H1c, nuance H1a
- **Segments concernés :** PP2 (2/2), PP4 (1/2) ; non observé chez PP3 (0/2)

**Ce que nous avons observé**

- 3/8 participants ont épinglé une tâche avant même de lire le plan proposé — OBS-031, OBS-044,
  OBS-052
- 2/8 ont annulé le plan entier après le déplacement d'une tâche qu'ils considéraient comme fixe —
  OBS-047, OBS-058

**Ce que les personnes disent**

- « (citation fictive) Ça, c'est mon créneau, on n'y touche pas. » — P0X

**Pourquoi, à notre avis**
L'épinglage servirait d'abord à protéger des « zones sacrées », avant d'être un outil de correction ;
cohérent avec l'idée que le contrôle, même partiel, favorise l'acceptation d'un algorithme
(Dietvorst, Simmons & Massey, 2018).

**Contre-preuves et limites**

- PP3 n'a jamais épinglé ; données fictives, donc enjeu moindre qu'un vrai agenda.

**Conséquence pour le produit**

- Opportunité : « Comment pourrions-nous déclarer ses zones protégées avant le premier plan ? »
- Fonctionnalités : 1.1, 1.15
- À ne pas faire : déplacer une tâche épinglée, même pour « optimiser ».

**Pour aller plus loin**

- Question : les zones protégées sont-elles stables d'une semaine à l'autre ?
- Test : étude journal, question J8 ; n = 12 ; critère : zones déclarées vs déplacements observés.

**Décisions liées :** — · **Date :** — · **Rédaction :** —
