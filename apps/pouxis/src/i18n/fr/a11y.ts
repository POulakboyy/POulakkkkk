/**
 * Labels read by screen readers only (`aria-label`, live regions). Describe the purpose, not the
 * look; no « bouton » / « icône » (the role already says it).
 */
export const a11y = {
  skipToContent: 'Aller au contenu',
  mainContent: 'Contenu principal',
  dialog: 'Boîte de dialogue',
  closeDialog: 'Fermer la boîte de dialogue',
  menu: 'Menu',
  openMenu: 'Ouvrir le menu',
  toast: 'Notification',
  toastRegion: 'Notifications',
  loading: 'Chargement en cours',
  loaded: 'Chargement terminé',
  required: 'obligatoire',
  newWindow: 's’ouvre dans une nouvelle fenêtre',
  selected: 'sélectionné',
  notSelected: 'non sélectionné',
  checkbox: {
    checked: 'coché',
    unchecked: 'non coché',
  },
  dragHandle: 'Poignée de déplacement',
  dragStart: '« {item} » saisi. Flèches pour déplacer, Espace pour déposer, Échap pour annuler.',
  dragMove: 'Position {position} sur {total}',
  dragDrop: '« {item} » déposé en position {position}',
  dragCancel: 'Déplacement annulé',
  swipeHint: 'Actions disponibles : {actions}',
  colorSwatch: 'Couleur {name}',
  progress: '{percent} terminé',
  rating: '{value} sur {max}',
  shortcut: 'Raccourci : {keys}',
  sortAsc: 'Trié par ordre croissant',
  sortDesc: 'Trié par ordre décroissant',
  pageOf: 'Page {current} sur {total}',
  liveTimer: 'Il reste {duration}',
};
