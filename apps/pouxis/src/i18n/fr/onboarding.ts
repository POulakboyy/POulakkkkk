/**
 * Onboarding: four calm screens, one idea each, every step skippable. Permission primers are
 * shown *before* the OS prompt and always offer « Pas maintenant ».
 */
export const onboarding = {
  a11y: 'Introduction à POuxis',
  skip: 'Passer l’introduction',
  progress: 'Étape {current} sur {total}',

  welcome: {
    title: 'Bienvenue dans POuxis',
    body: 'Un seul endroit pour votre temps, vos tâches et vos idées. Tout reste sur votre appareil.',
    language: 'Langue de l’interface',
    example: 'Appeler Léa demain 15h #perso',
    exampleCaption: 'Écrivez comme il vient : la date, l’heure et les étiquettes sont reconnues.',
    action: 'Commencer',
  },

  hours: {
    title: 'Vos heures de travail',
    body: 'POuxis place vos tâches dans ces horaires et garde le reste de la journée libre. Vous pourrez tout changer dans les réglages.',
    start: 'Début',
    end: 'Fin',
    days: 'Jours travaillés',
    summary: 'Je travaille de {start} à {end}',
    invalid: 'L’heure de fin doit venir après l’heure de début.',
    action: 'Suivant',
  },

  rhythm: {
    title: 'À quel moment êtes-vous le plus vif ?',
    body: 'Une première estimation pour placer le travail exigeant au bon moment. Le bilan l’affine ensuite avec vos journées réelles.',
    morning: 'Plutôt le matin',
    morningHint: 'Les idées viennent tôt, l’énergie baisse en soirée.',
    intermediate: 'Entre les deux',
    intermediateHint: 'Pas de moment nettement meilleur qu’un autre.',
    evening: 'Plutôt le soir',
    eveningHint: 'Démarrage lent, pleine forme en fin de journée.',
    unsure: 'Je ne sais pas encore',
    action: 'Suivant',
  },

  ready: {
    title: 'Deux autorisations, si vous le souhaitez',
    body: 'Rien n’est obligatoire. Vous pourrez les accorder plus tard, au moment où elles servent.',
  },

  /** Shown before the system dialog. One benefit, honest scope, no pressure. */
  permissions: {
    notifications: {
      title: 'Un petit signal au bon moment',
      body: 'Pour vous prévenir quand un focus se termine ou qu’une tâche se débloque. Jamais de rappels insistants.',
      allow: 'Autoriser les notifications',
    },
    dnd: {
      title: 'Couper les distractions pendant le focus',
      body: 'POuxis peut activer Ne pas déranger pendant vos sessions et le désactiver juste après.',
      allow: 'Autoriser',
    },
    microphone: {
      title: 'Dicter vos idées',
      body: 'Pour transformer quelques phrases dites à voix haute en tâches. Selon le navigateur, la reconnaissance vocale peut passer par le service de son éditeur.',
      allow: 'Autoriser le micro',
    },
    notNow: 'Pas maintenant',
    granted: 'Autorisé',
    unavailable: 'Non disponible sur cet appareil',
    denied: 'Autorisation refusée. Vous pouvez la donner plus tard dans les réglages du système.',
    openSystemSettings: 'Ouvrir les réglages du système',
  },

  done: {
    title: 'Tout est prêt',
    body: 'Commencez par ce qui vous occupe l’esprit en ce moment.',
    action: 'Ouvrir ma journée',
  },
};
