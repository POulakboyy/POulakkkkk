/**
 * Errors: what happened, why (if useful), what to do. Never blame the user, never expose raw
 * codes in the title (put them in `details`). Data safety is stated whenever it's true.
 */
export const errors = {
  generic: {
    title: 'Quelque chose n’a pas fonctionné',
    body: 'Vos données sont intactes. Réessayez ; si le problème revient, redémarrez l’app.',
  },
  details: 'Détails techniques',
  code: 'Code : {code}',
  copyDetails: 'Copier les détails',
  report: 'Signaler le problème',

  boundary: {
    title: 'Cette vue a rencontré un problème',
    body: 'Le reste de l’app fonctionne. Rechargez la vue pour continuer.',
    reload: 'Recharger la vue',
    home: 'Revenir à Aujourd’hui',
  },

  notFound: {
    title: 'Page introuvable',
    body: 'Ce lien ne mène nulle part, ou l’élément a été supprimé.',
    action: 'Revenir à Aujourd’hui',
  },

  offline: {
    title: 'Vous êtes hors ligne',
    body: 'Tout continue de fonctionner. Les modifications se synchroniseront au retour du réseau.',
  },

  sync: {
    failed: 'Synchronisation en pause : le serveur ne répond pas. Nouvel essai automatique.',
    auth: 'Le serveur de synchronisation a refusé l’accès. Reconnectez cet appareil dans les réglages.',
    conflict: 'Deux modifications se sont croisées. Les deux versions sont gardées.',
    tooOld: 'Ce serveur utilise une version plus ancienne. Mettez-le à jour pour synchroniser.',
  },

  storage: {
    full: 'L’espace de stockage est plein. Libérez de la place pour continuer à enregistrer.',
    unavailable:
      'Le stockage local est inaccessible. Vos modifications ne sont pas enregistrées pour l’instant.',
    quotaHint: 'En navigation privée, certains navigateurs limitent le stockage.',
  },

  network: {
    timeout: 'Le serveur met trop de temps à répondre. Réessayez dans un moment.',
    unreachable: 'Impossible de joindre {host}. Vérifiez l’adresse et votre connexion.',
  },

  permission: {
    denied:
      'POuxis n’a pas l’autorisation pour {capability}. Vous pouvez la donner dans les réglages du système.',
    capability: {
      notifications: 'les notifications',
      location: 'la position',
      microphone: 'le micro',
      dnd: 'le mode Ne pas déranger',
      clipboard: 'le presse-papiers',
    },
  },

  import: {
    unreadable:
      'Ce fichier ne peut pas être lu. Vérifiez qu’il s’agit d’une archive POuxis, d’un .md ou d’un .ics.',
    partial:
      '{count, plural, one {# élément n’a pas pu être importé} other {# éléments n’ont pas pu être importés}}. Le reste est bien arrivé.',
  },

  export: {
    failed: 'L’export n’a pas abouti. Vérifiez l’espace disponible et réessayez.',
  },

  clipboard: {
    failed: 'Impossible de copier. Sélectionnez le texte et copiez-le à la main.',
  },
};
