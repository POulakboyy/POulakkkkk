/**
 * Innovation lab (#/lab): experimental features beyond the brief. `{time}` comes from
 * `formatTime`, `{duration}` from `formatDuration`, `{when}` from `formatRelativeTime`.
 */
export const lab = {
  title: 'Labo',
  eyebrow: 'Expériences',
  subtitle:
    'Des outils en essai, fondés sur la recherche. Ils utilisent vos données locales et peuvent évoluer.',
  experimental: 'Expérimental',
  pick: 'Choisir une expérience',
  evidence: 'Fondement',

  intention: {
    title: 'Intention du jour',
    description: 'Une chose importante, avec un moment et un lieu précis pour s’y mettre.',
    evidence: 'Intentions de mise en œuvre (Gollwitzer et Sheeran, 2006)',
    heading: 'Qu’est-ce qui compterait aujourd’hui ?',
    lead: 'Choisissez une tâche, puis le moment où vous vous y mettrez. « Quand X, je fais Y » aide à passer à l’acte.',
    candidates: 'Suggestions du jour',
    noCandidates: 'Aucune tâche prévue aujourd’hui. Écrivez votre intention ci-dessous.',
    action: 'Je m’y mets',
    actionHint: 'Une action concrète, par exemple « Écrire l’introduction »',
    when: 'Quand',
    whenHint: 'Un repère précis : une heure ou un moment de votre routine',
    where: 'Où',
    whereHint: 'Le lieu où vous serez',
    cues: 'Repères',
    cue: {
      coffee: 'après mon café',
      arrive: 'en arrivant au bureau',
      lunch: 'après le déjeuner',
      meeting: 'après ma première réunion',
    },
    atTime: 'il sera {time}',
    slot: 'Réserver {range}',
    slotHint: 'Premier créneau libre aujourd’hui dans vos heures de travail',
    slotNone: 'Aucun créneau libre aujourd’hui pour cette durée',
    slotBooked: 'Créneau réservé · {range}',
    preview: 'Votre intention',
    sentence: 'Quand {when}, je m’y mets : {action}.',
    sentenceWhere: 'Quand {when}, {where}, je m’y mets : {action}.',
    save: 'Enregistrer l’intention',
    saved: 'Intention enregistrée',
    today: 'Votre intention du jour',
    change: 'Changer d’intention',
    missing: 'Indiquez l’action et le moment',
  },

  shutdown: {
    title: 'Clôture de journée',
    description:
      'Fermer la journée en quelques gestes : ce qui est fait, ce qui reste, par quoi reprendre.',
    evidence:
      'Plan et buts inachevés (Masicampo et Baumeister, 2011) ; plan de reprise (Leroy et Glomb, 2018)',
    stepLabel: 'Étape {current} sur {total}',
    next: 'Continuer',
    back: 'Retour',
    done: {
      title: 'Ce qui est fait',
      lead: 'Prenez un instant pour le voir.',
      empty: 'Rien de coché aujourd’hui. Une journée de réflexion ou de repos compte aussi.',
    },
    open: {
      title: 'Ce qui reste',
      lead: 'Choisissez pour chaque tâche. Rien n’est perdu.',
      empty: 'Rien d’ouvert pour aujourd’hui.',
      choices: 'Que faire de « {title} » ?',
      tomorrow: 'Demain',
      later: 'Plus tard',
      keep: 'Laisser',
    },
    resume: {
      title: 'Pour reprendre demain',
      lead: 'Écrire où vous en êtes allège l’esprit ce soir et facilite la reprise demain.',
      first: 'Demain, je commence par',
      firstHint: 'La toute première action, par exemple « Relire le plan de la vidéo »',
      friction: 'Ce qui a coincé',
      frictionHint: 'Il rejoindra votre journal de friction et votre bilan de la semaine',
      close: 'Clore la journée',
    },
    closed: {
      title: 'Journée close.',
      highlight: 'Le meilleur moment : {title}',
      summary:
        '{done, plural, =0 {Aucune tâche terminée} one {# tâche terminée} other {# tâches terminées}} · {moved, plural, =0 {rien de déplacé} one {# reportée à demain} other {# reportées à demain}}',
      at: 'Close à {time}',
      resume: 'Demain : {first}',
      reopen: 'Rouvrir la clôture',
      toast: 'Journée close',
    },
  },

  energy: {
    title: 'Check-in d’énergie',
    description: 'Dites comment vous vous sentez ; POuxis propose ce qui vous va maintenant.',
    evidence: 'Chronotype (Horne et Östberg, 1976) ; moment de la journée (Wieth et Zacks, 2011)',
    heading: 'Comment va votre énergie ?',
    levels: 'Niveau d’énergie',
    level: {
      low: 'Basse',
      medium: 'Moyenne',
      high: 'Haute',
    },
    levelHint: {
      low: 'Tâches courtes et simples',
      medium: 'Travail courant',
      high: 'Travail exigeant ou créatif',
    },
    last: 'Noté {when}',
    entry: 'Check-in d’énergie : {level}',
    saved: 'Énergie notée',
    fits: 'Ce qui vous va maintenant',
    fitsEmpty: 'Aucune tâche ouverte ne correspond. Une pause compte aussi.',
    curve: 'Votre courbe d’énergie',
    curveHint:
      'Vos check-ins ajustent la courbe que le placement automatique utilise pour choisir vos créneaux.',
    peak: 'Pic vers {hour} h',
    hourA11y: '{hour} h : {percent}',
    checkIns:
      '{count, plural, =0 {Aucun check-in} one {# check-in} other {# check-ins}} sur 4 semaines',
  },

  wins: {
    title: 'Bocal des victoires',
    description:
      'Gardez une trace des progrès, même petits. Ils nourrissent votre bilan de la semaine.',
    evidence:
      'Principe du progrès (Amabile et Kramer, 2011) ; règle pic-fin (Kahneman et al., 1993)',
    heading: 'Vos victoires de la semaine',
    count:
      '{count, plural, =0 {Le bocal est vide pour l’instant} one {# victoire cette semaine} other {# victoires cette semaine}}',
    jar: 'Bocal contenant {count, plural, =0 {aucune victoire} one {# victoire} other {# victoires}}',
    more: '+{count}',
    add: 'Ajouter',
    input: 'Une victoire, même petite',
    inputHint: 'Par exemple « Premier jet du script terminé »',
    added: 'Victoire ajoutée',
    fromTasks: 'Terminées aujourd’hui',
    fromTasksHint: 'Touchez pour les mettre dans le bocal',
    memory: 'Souvenir',
    memoryNone: 'Vos victoires passées réapparaîtront ici.',
    another: 'Un autre souvenir',
    list: 'Cette semaine',
  },

  breaks: {
    title: 'Pauses au bon moment',
    description: 'Une pause proposée selon votre temps de focus, adaptée au type de travail.',
    evidence:
      'Pauses planifiées (Biwer et al., 2023 ; Ariga et Lleras, 2011) ; marche (Oppezzo et Schwartz, 2014)',
    since: 'de focus depuis la dernière pause',
    rested: 'En pause depuis {duration}',
    none: 'Aucune session de focus aujourd’hui. Les suggestions apparaîtront pendant que vous travaillez.',
    progress: 'Avant la prochaine pause',
    progressValue: '{duration} restantes',
    rhythm: 'Rythme',
    rhythmHint:
      'Les rythmes 12/3 et 24/6 sont ceux comparés par Biwer et al. (2023). Aucune durée n’est démontrée optimale.',
    rhythmOption: '{focus}/{rest}',
    free: 'Libre',
    freeHint: 'Pas de suggestion automatique : prenez vos pauses quand vous le sentez.',
    suggestion: 'Suggestion',
    notYet: 'Continuez, la prochaine pause est dans {duration}.',
    kind: {
      micro: {
        title: 'Une micro-pause',
        body: 'Regardez au loin, relâchez les épaules, respirez. Une brève coupure aide à rester attentif sur la durée.',
      },
      move: {
        title: 'Une pause en marchant',
        body: 'Vous êtes sur un travail créatif : marcher quelques minutes favorise les idées, et laisser mûrir un problème aide aussi.',
      },
      rest: {
        title: 'Une vraie pause',
        body: 'Long moment de focus : levez-vous, buvez de l’eau, changez d’air avant de reprendre.',
      },
    },
    start: 'Commencer la pause · {duration}',
    later: 'Pas maintenant',
    running: 'Pause en cours',
    remaining: 'Temps restant',
    end: 'Terminer la pause',
    ended: 'Pause terminée',
  },
};
