/**
 * Generic empty states (what this is · why it's empty · how to start). Feature-specific ones live
 * in their namespace (`tasks.empty.*`, `today.empty`…); these cover shared components.
 */
export const empty = {
  generic: {
    title: 'Rien ici pour l’instant',
    body: 'Ce qui sera ajouté apparaîtra ici.',
  },
  search: {
    title: 'Aucun résultat',
    body: 'Essayez un autre mot, ou une idée proche : la recherche comprend le sens.',
  },
  filtered: {
    title: 'Rien ne correspond aux filtres',
    body: 'Retirez un filtre pour élargir.',
    action: 'Effacer les filtres',
  },
  archive: {
    title: 'Aucune archive',
    body: 'Ce que vous archivez est rangé ici, jamais supprimé.',
  },
  journal: {
    title: 'Journal vide',
    body: 'Quelques lignes en fin de journée suffisent pour garder le fil.',
    action: 'Écrire une entrée',
  },
  trash: {
    title: 'Corbeille vide',
    body: 'Les éléments supprimés y restent 30 jours avant de disparaître.',
  },
  offline: {
    title: 'Rien à afficher hors ligne',
    body: 'Ce contenu n’est pas encore sur cet appareil. Il arrivera à la prochaine synchronisation.',
  },
};
