/**
 * Onboarding: four calm screens, one idea each, every step skippable. Permission primers are
 * shown *before* the OS prompt and always offer « Pas maintenant ».
 */
export const onboarding = {
  skip: 'Passer l’introduction',
  progress: 'Étape {current} sur {total}',

  welcome: {
    title: 'Bienvenue dans POuxis',
    body: 'Un seul endroit pour votre temps, vos tâches et vos idées. Tout reste sur votre appareil.',
    action: 'Commencer',
  },

  capture: {
    title: 'Capturez sans réfléchir',
    body: 'Une tâche, une idée, un rendez-vous : écrivez-le comme il vient. POuxis reconnaît la date, l’heure et les étiquettes.',
    example: 'Appeler Léa demain 15h #perso',
    action: 'Suivant',
  },

  day: {
    title: 'Une journée qui s’ajuste',
    body: 'Vos tâches se placent dans les créneaux libres. Si quelque chose déborde, la suite se décale, et vos rendez-vous fixes ne bougent pas.',
    action: 'Suivant',
  },

  setup: {
    title: 'Vos heures, votre rythme',
    body: 'Indiquez quand vous travaillez. Vous pourrez tout changer plus tard dans les réglages.',
    hours: 'Je travaille de {start} à {end}',
    language: 'Langue',
    theme: 'Thème',
    action: 'C’est parti',
  },

  /** Shown before the system dialog. One benefit, honest scope, no pressure. */
  permissions: {
    notifications: {
      title: 'Un petit signal au bon moment ?',
      body: 'Pour vous prévenir quand un focus se termine ou qu’une tâche se débloque. Jamais de rappels insistants.',
      allow: 'Autoriser les notifications',
    },
    dnd: {
      title: 'Couper les distractions pendant le focus',
      body: 'POuxis peut activer Ne pas déranger pendant vos sessions et le désactiver juste après.',
      allow: 'Autoriser',
    },
    location: {
      title: 'Des rappels au bon endroit',
      body: 'Pour vous rappeler la liste de courses en arrivant au magasin. Votre position reste sur l’appareil.',
      allow: 'Autoriser la position',
    },
    microphone: {
      title: 'Dicter vos idées',
      body: 'Pour transformer un mémo vocal en tâche. L’audio est traité sur cet appareil.',
      allow: 'Autoriser le micro',
    },
    notNow: 'Pas maintenant',
    denied: 'Autorisation refusée. Vous pouvez la donner plus tard dans les réglages du système.',
    openSystemSettings: 'Ouvrir les réglages du système',
  },

  done: {
    title: 'Tout est prêt',
    body: 'Commencez par ce qui vous occupe l’esprit en ce moment.',
    action: 'Ouvrir ma journée',
  },
};
