// Builds docs/marketing/pitch/POuxis-pitch.pptx (FR).
// Run: NODE_PATH=<modules> node build.cjs <repoRoot> <pptxSkillDir>  (the skill provides apply_theme.js)
const path = require('path');
// Needs pptxgenjs and sharp resolvable (e.g. NODE_PATH=<dir>/node_modules); not a repo dependency.
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');

const [repo, skillDir] = process.argv.slice(2);
const { applyTheme } = require(path.join(skillDir, 'scripts/apply_theme.js'));
const OUT = path.join(repo, 'docs/marketing/pitch/POuxis-pitch.pptx');

const HEX = {
  paper: 'F6F4EF',
  ink: '1C1B18',
  muted: '5A564E',
  tint: 'ECE8DF',
  coral: 'FF8F70',
  line: 'D6D1C6',
};
const THEME = {
  name: 'POuxis',
  headFontFace: 'Cambria',
  bodyFontFace: 'Calibri',
  colors: {
    dk1: HEX.ink,
    lt1: HEX.paper,
    dk2: HEX.muted,
    lt2: HEX.tint,
    accent1: HEX.coral,
    accent2: 'E8775A',
    accent3: HEX.line,
    accent4: '8A847A',
    accent5: '3A3833',
    accent6: 'FFD2C4',
    hlink: HEX.ink,
    folHlink: HEX.muted,
  },
};

async function svgPng(file, width) {
  const buf = await sharp(path.join(repo, 'docs/brand/assets', file), { density: 600 })
    .resize({ width })
    .png()
    .toBuffer();
  return 'image/png;base64,' + buf.toString('base64');
}

async function main() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.title = 'POuxis — présentation';
  pres.author = 'POuxis';
  pres.subject = 'Planificateur open source local-first — stratégie et feuille de route';
  const C = pres.SchemeColor;

  const lockupDark = await svgPng('lockup-horizontal-reversed.svg', 1200);
  const LOCKUP_RATIO = 130 / 552.1;

  pres.defineSlideMaster({
    title: 'POUXIS_DARK',
    background: { color: C.text1 },
    objects: [
      {
        placeholder: {
          options: {
            name: 'title',
            type: 'title',
            x: 0.8,
            y: 2.35,
            w: 11.7,
            h: 2.2,
            fontSize: 44,
            bold: false,
            color: C.background1,
            valign: 'top',
            align: 'left',
            margin: 0,
          },
          text: '',
        },
      },
      {
        placeholder: {
          options: {
            name: 'body',
            type: 'body',
            x: 0.8,
            y: 4.75,
            w: 11.0,
            h: 1.2,
            fontSize: 18,
            color: C.background2,
            valign: 'top',
            margin: 0,
          },
          text: '',
        },
      },
    ],
  });
  pres.defineSlideMaster({
    title: 'POUXIS_CONTENT',
    background: { color: C.background1 },
    margin: [0.5, 0.6, 0.6, 0.6],
    objects: [
      {
        placeholder: {
          options: {
            name: 'title',
            type: 'title',
            x: 0.6,
            y: 0.4,
            w: 12.1,
            h: 0.9,
            fontSize: 34,
            color: C.text1,
            valign: 'middle',
            align: 'left',
            margin: 0,
          },
          text: '',
        },
      },
      {
        text: {
          text: 'POuxis · novembre 2026',
          options: { x: 0.6, y: 7.0, w: 6, h: 0.3, fontSize: 10, color: C.text2, margin: 0 },
        },
      },
    ],
    slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.text2, align: 'right' },
  });

  const content = (section, title) => {
    const s = pres.addSlide({ masterName: 'POUXIS_CONTENT', sectionTitle: section });
    s.addText(title, { placeholder: 'title' });
    return s;
  };
  const dot = (s, x, y, d = 0.18, name = 'dot') =>
    s.addShape(pres.shapes.OVAL, {
      x,
      y,
      w: d,
      h: d,
      fill: { color: C.accent1 },
      line: { type: 'none' },
      objectName: name,
    });
  const card = (s, x, y, w, h, fill = C.background2, name = 'card') =>
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x,
      y,
      w,
      h,
      rectRadius: 0.12,
      fill: { color: fill },
      line: { type: 'none' },
      objectName: name,
    });
  // French typography: keep guillemets, units and currency glued to their neighbours.
  const nb = (t) =>
    t
      .replace(/« /g, '«\u00A0')
      .replace(/ »/g, '\u00A0»')
      .replace(/ (\$|€|h\b|min\b|%)/g, '\u00A0$1');
  const fix = (t) => (typeof t === 'string' ? nb(t) : t.map((r) => ({ ...r, text: nb(r.text) })));
  const text = (s, t, o) =>
    s.addText(fix(t), { isTextBox: true, margin: 0, color: C.text1, valign: 'top', ...o });

  // 1 — Title
  pres.addSection({ title: 'Ouverture' });
  {
    const s = pres.addSlide({ masterName: 'POUXIS_DARK', sectionTitle: 'Ouverture' });
    s.addImage({
      data: lockupDark,
      x: 0.8,
      y: 0.8,
      w: 3.0,
      h: 3.0 * LOCKUP_RATIO,
      altText: 'Logo POuxis',
    });
    s.addText('Vos journées, vos tâches, vos idées.\nSur votre appareil.', {
      placeholder: 'title',
      fontFace: 'Cambria',
    });
    s.addText(
      'Le planificateur open source et local-first pour les créatifs. Présentation, novembre 2026.',
      { placeholder: 'body' },
    );
    s.addNotes(
      'Ouverture. POuxis est un planificateur open source, local-first, pour les créatifs et indépendants. Ce support suit docs/marketing/STRATEGY.md ; tous les prix cités sont sourcés dans ce document, tout le reste est présenté comme hypothèse.',
    );
  }

  // 2 — Problem
  pres.addSection({ title: 'Problème et solution' });
  {
    const s = content('Problème et solution', 'Le travail créatif est éclaté entre quatre outils');
    const tools = ['Calendrier', 'Tâches', 'Notes', 'Tableau blanc'];
    tools.forEach((t, i) => {
      const x = 0.6 + i * 3.1;
      card(s, x, 1.8, 2.75, 0.95, C.background2, 'tool-' + i);
      text(s, t, {
        x: x + 0.25,
        y: 1.8,
        w: 2.3,
        h: 0.95,
        fontSize: 20,
        bold: true,
        valign: 'middle',
        fontFace: 'Calibri',
      });
    });
    const pains = [
      [
        'Rien ne se parle',
        'Une idée notée sur le téléphone ne devient jamais un créneau dans l’agenda.',
      ],
      [
        'Tout se replanifie à la main',
        'Une réunion déborde : chaque tâche suivante doit être déplacée une par une.',
      ],
      [
        'Les idées vivent chez un autre',
        'Comptes, nuage propriétaire, export partiel : partir coûte cher.',
      ],
    ];
    pains.forEach(([h, b], i) => {
      const x = 0.6 + i * 4.1;
      dot(s, x, 3.42, 0.2, 'pain-dot-' + i);
      text(s, h, {
        x: x + 0.38,
        y: 3.3,
        w: 3.45,
        h: 0.8,
        fontSize: 20,
        bold: true,
        fontFace: 'Cambria',
      });
      text(s, b, { x, y: 4.25, w: 3.75, h: 1.4, fontSize: 17, color: C.text2 });
    });
    text(
      s,
      'Douleurs tirées des proto-personas (docs/research/PERSONAS.md) : hypothèses à valider en entretien.',
      { x: 0.6, y: 6.25, w: 12, h: 0.4, fontSize: 12, italic: true, color: C.text2 },
    );
    s.addNotes(
      'Le problème n’est pas le manque d’outils mais leur dispersion. Ces trois douleurs viennent des proto-personas ; aucune donnée utilisateur POuxis n’existe encore, la recherche de la phase 1 doit les confirmer.',
    );
  }

  // 3 — Solution
  {
    const s = content('Problème et solution', 'Une boucle, pas une usine à fonctionnalités');
    const steps = [
      ['Capturer', '« Réunion projet mardi 14 h–16 h » devient un événement daté.'],
      ['Planifier', 'Les tâches se placent dans les créneaux libres selon leur durée.'],
      ['Se concentrer', 'Une seule tâche à l’écran, minuteur rattaché à la tâche.'],
      ['Faire le bilan', 'Victoires et blocages de la semaine, sans culpabiliser.'],
    ];
    steps.forEach(([h, b], i) => {
      const x = 0.6 + i * 3.15;
      s.addShape(pres.shapes.OVAL, {
        x: x + 0.85,
        y: 1.7,
        w: 1.1,
        h: 1.1,
        fill: { color: i === 1 ? C.accent1 : C.background2 },
        line: { type: 'none' },
        objectName: 'step-' + i,
      });
      text(s, String(i + 1), {
        x: x + 0.85,
        y: 1.7,
        w: 1.1,
        h: 1.1,
        fontSize: 30,
        align: 'center',
        valign: 'middle',
        fontFace: 'Cambria',
      });
      if (i < 3) {
        s.addShape(pres.shapes.LINE, {
          x: x + 2.15,
          y: 2.25,
          w: 1.75,
          h: 0,
          line: { color: HEX.line, width: 1.5, endArrowType: 'triangle' },
          objectName: 'arrow-' + i,
        });
      }
      text(s, h, {
        x,
        y: 3.1,
        w: 2.8,
        h: 0.5,
        fontSize: 22,
        bold: true,
        align: 'center',
        fontFace: 'Cambria',
      });
      text(s, b, {
        x: x + 0.1,
        y: 3.7,
        w: 2.6,
        h: 1.4,
        fontSize: 15,
        color: C.text2,
        align: 'center',
      });
    });
    card(s, 0.6, 5.55, 12.1, 0.8, C.text1, 'promise');
    text(
      s,
      'Hors ligne  ·  sans compte  ·  synchronisation chiffrée de bout en bout  ·  export complet',
      {
        x: 0.6,
        y: 5.55,
        w: 12.1,
        h: 0.8,
        fontSize: 18,
        align: 'center',
        valign: 'middle',
        color: C.background1,
      },
    );
    s.addNotes(
      'La boucle du MVP 0.1 (ROADMAP.md) : Capturer, Planifier, Se concentrer, Faire le bilan. Le moteur de planification existe dans @pouxis/core ; les vues sont en cours. Aucune de ces capacités n’est encore cochée dans le registre des affirmations : on présente la cible, pas un produit livré.',
    );
  }

  // 4 — 7 modules
  pres.addSection({ title: 'Produit' });
  {
    const s = content('Produit', 'Sept modules, cent fonctionnalités au brief');
    const mods = [
      ['1', 'Temps et calendrier', '15', 'dès 0.1'],
      ['2', 'Exécution et tâches', '15', 'dès 0.1'],
      ['3', 'Stockage et multiplateforme', '15', 'dès 0.1'],
      ['4', 'Graphes et spatialisation', '15', 'dès 0.3'],
      ['5', 'Idéation et créativité', '15', 'dès 0.2'],
      ['6', 'Collaboration et écosystème', '15', '2.0+'],
      ['7', 'Interface et bien-être', '10', 'dès 0.1'],
    ];
    mods.forEach(([n, name, count, phase], i) => {
      const row = i < 4 ? 0 : 1;
      const col = row === 0 ? i : i - 4;
      const w = 2.825;
      const x = 0.6 + col * (w + 0.267);
      const y = 1.6 + row * 2.2;
      card(s, x, y, w, 1.9, C.background2, 'module-' + n);
      dot(s, x + 0.25, y + 0.3, 0.16, 'module-dot-' + n);
      text(s, 'Module ' + n, {
        x: x + 0.5,
        y: y + 0.22,
        w: 2.1,
        h: 0.32,
        fontSize: 12,
        color: C.text2,
      });
      text(s, name, {
        x: x + 0.25,
        y: y + 0.6,
        w: w - 0.5,
        h: 0.75,
        fontSize: 18,
        bold: true,
        fontFace: 'Cambria',
      });
      text(s, count + ' fonctions · ' + phase, {
        x: x + 0.25,
        y: y + 1.4,
        w: w - 0.5,
        h: 0.32,
        fontSize: 13,
        color: C.text2,
      });
    });
    const x = 0.6 + 3 * (2.825 + 0.267);
    card(s, x, 3.8, 2.825, 1.9, C.text1, 'mvp-note');
    text(s, 'La 1.0 n’en livre qu’une partie. Les 100 deviennent une feuille de route votable.', {
      x: x + 0.25,
      y: 3.95,
      w: 2.35,
      h: 1.6,
      fontSize: 15,
      color: C.background1,
      valign: 'middle',
    });
    s.addNotes(
      'Les 100 fonctionnalités du brief, regroupées en sept modules. La première phase de chaque module vient de ROADMAP.md. Message clé : on ne vend pas 100 fonctions, on vend la boucle ; la liste complète sert de feuille de route publique et participative.',
    );
  }

  // 5 — Why now
  {
    const s = content('Produit', 'Pourquoi maintenant');
    const cols = [
      [
        'Le local-first a fait ses preuves',
        'Obsidian, Logseq, Anytype et AFFiNE montrent qu’on peut bâtir un outil grand public sur des données locales.',
      ],
      [
        'Une base de code, cinq plateformes',
        'Tauri 2 cible iOS, Android, macOS, Windows et Linux depuis un même client web.',
      ],
      [
        'La planification automatique reste chère et fermée',
        'Motion 19–29 $, Sunsama 17–22 $, Akiflow 16–34 $, Amie 20–40 $ par mois, tous en nuage propriétaire.',
      ],
    ];
    cols.forEach(([h, b], i) => {
      const x = 0.6 + i * 4.1;
      card(s, x, 1.65, 3.8, 4.3, i === 2 ? C.text1 : C.background2, 'why-' + i);
      const fg = i === 2 ? C.background1 : C.text1;
      dot(s, x + 0.35, 2.05, 0.22, 'why-dot-' + i);
      text(s, h, {
        x: x + 0.35,
        y: 2.5,
        w: 3.1,
        h: 1.3,
        fontSize: 22,
        bold: true,
        fontFace: 'Cambria',
        color: fg,
      });
      text(s, b, {
        x: x + 0.35,
        y: 3.9,
        w: 3.1,
        h: 1.8,
        fontSize: 16,
        color: i === 2 ? C.background2 : C.text2,
      });
    });
    text(
      s,
      'Prix : pages tarifaires officielles consultées le 4 novembre 2026, plans payants, en dollars US (STRATEGY.md § 16).',
      { x: 0.6, y: 6.25, w: 12, h: 0.4, fontSize: 12, italic: true, color: C.text2 },
    );
    s.addNotes(
      'Trois raisons factuelles, sans taille de marché : nous n’en avons vérifié aucune. Les prix sont ceux des pages tarifs (S12, S13, S15, S16), fourchettes annuel/mensuel ou par offre.',
    );
  }

  // 6 — Science
  {
    const s = content('Produit', 'Des choix de conception appuyés sur la recherche');
    const rows = [
      [
        'Changer de tâche laisse un « résidu attentionnel »',
        'Tampons entre réunions (1.6)',
        'Modérée',
      ],
      [
        'Nous sous-estimons nos durées',
        'Plan fondé sur l’historique prévu / réel (1.9)',
        'Forte (biais)',
      ],
      [
        '« Quand X, je fais Y » aide à passer à l’acte',
        'Proposer un créneau précis (1.10)',
        'Forte',
      ],
      ['Une série rompue démotive, sauf si on la répare', 'Séries avec joker (7.3)', 'Modérée'],
    ];
    text(s, [{ text: 'Constat', options: { bold: true } }], {
      x: 0.6,
      y: 1.5,
      w: 4.5,
      h: 0.35,
      fontSize: 13,
      color: C.text2,
    });
    text(s, 'Fonction', {
      x: 5.2,
      y: 1.5,
      w: 3.4,
      h: 0.35,
      fontSize: 13,
      color: C.text2,
      bold: true,
    });
    text(s, 'Confiance', {
      x: 8.55,
      y: 1.5,
      w: 1.6,
      h: 0.35,
      fontSize: 13,
      color: C.text2,
      bold: true,
    });
    rows.forEach(([a, b, c], i) => {
      const y = 1.95 + i * 1.0;
      card(s, 0.6, y, 9.4, 0.85, C.background2, 'sci-row-' + i);
      text(s, a, { x: 0.8, y, w: 4.3, h: 0.85, fontSize: 15, valign: 'middle', bold: true });
      text(s, b, { x: 5.2, y, w: 3.3, h: 0.85, fontSize: 15, valign: 'middle', color: C.text2 });
      text(s, c, { x: 8.55, y, w: 1.4, h: 0.85, fontSize: 14, valign: 'middle' });
    });
    card(s, 10.25, 1.5, 2.45, 4.35, C.text1, 'myths');
    text(
      s,
      [
        {
          text: 'Ce que nous n’affirmons pas',
          options: { bold: true, breakLine: true, fontFace: 'Cambria', fontSize: 15 },
        },
        { text: ' ', options: { breakLine: true, fontSize: 8 } },
        { text: '25 min de Pomodoro « optimales »', options: { breakLine: true } },
        { text: ' ', options: { breakLine: true, fontSize: 8 } },
        { text: 'Couleurs qui « boostent » la créativité', options: { breakLine: true } },
        { text: ' ', options: { breakLine: true, fontSize: 8 } },
        { text: 'Effet Zeigarnik sur la mémoire' },
      ],
      { x: 10.5, y: 1.75, w: 2.0, h: 3.9, fontSize: 14, color: C.background1 },
    );
    text(
      s,
      'Sources et niveaux de confiance : docs/research/SCIENTIFIC_BASIS.md (Leroy 2009 ; Buehler et al. 1994 ; Gollwitzer et Sheeran 2006 ; Silverman et Barasch 2022). Inspiration, pas allégation.',
      { x: 0.6, y: 6.15, w: 12.1, h: 0.55, fontSize: 12, italic: true, color: C.text2 },
    );
    s.addNotes(
      'Chaque fonction est rattachée à une étude et à un niveau de confiance (échelle de SCIENTIFIC_BASIS.md § 3). On montre aussi ce qui ne tient pas : c’est un argument de crédibilité. Aucune formule du type « prouvé scientifiquement » dans la communication.',
    );
  }

  // 7 — Differentiation
  pres.addSection({ title: 'Marché' });
  {
    const s = content('Marché', 'Une case vide : local et ouvert, avec un plan qui se recalcule');
    const ox = 0.9,
      oy = 1.55,
      W = 7.6,
      H = 4.9;
    s.addShape(pres.shapes.LINE, {
      x: ox,
      y: oy + H / 2,
      w: W,
      h: 0,
      line: { color: HEX.muted, width: 1.25 },
      objectName: 'axis-x',
    });
    s.addShape(pres.shapes.LINE, {
      x: ox + W / 2,
      y: oy,
      w: 0,
      h: H,
      line: { color: HEX.muted, width: 1.25 },
      objectName: 'axis-y',
    });
    text(s, 'Planification automatique', {
      x: ox + W / 2 + 0.1,
      y: oy - 0.05,
      w: 3.5,
      h: 0.3,
      fontSize: 12,
      color: C.text2,
    });
    text(s, 'Pas de gestion du temps', {
      x: ox + W / 2 + 0.1,
      y: oy + H - 0.3,
      w: 3.5,
      h: 0.3,
      fontSize: 12,
      color: C.text2,
    });
    text(s, 'Nuage propriétaire', {
      x: ox,
      y: oy + H / 2 + 0.08,
      w: 2.5,
      h: 0.3,
      fontSize: 12,
      color: C.text2,
    });
    text(s, 'Local et ouvert', {
      x: ox + W - 2.0,
      y: oy + H / 2 + 0.08,
      w: 2.0,
      h: 0.3,
      fontSize: 12,
      color: C.text2,
      align: 'right',
    });
    const q = (t, x, y) => text(s, t, { x, y, w: 3.4, h: 1.5, fontSize: 15, color: C.text1 });
    q(
      'Motion · Reclaim · Akiflow\nSunsama · Amie\nStructured · Tiimo (partiel)',
      ox + 0.15,
      oy + 0.45,
    );
    q(
      'Notion · Craft · Todoist\nTickTick · Things\nHeptabase · Capacities',
      ox + 0.15,
      oy + H / 2 + 0.55,
    );
    q('Obsidian · Logseq\nAnytype · AFFiNE', ox + W / 2 + 0.3, oy + H / 2 + 0.55);
    s.addShape(pres.shapes.OVAL, {
      x: ox + W / 2 + 1.6,
      y: oy + 0.6,
      w: 1.6,
      h: 1.6,
      fill: { color: C.accent1 },
      line: { type: 'none' },
      objectName: 'pouxis-mark',
    });
    text(s, 'POuxis', {
      x: ox + W / 2 + 1.6,
      y: oy + 0.6,
      w: 1.6,
      h: 1.6,
      fontSize: 18,
      bold: true,
      align: 'center',
      valign: 'middle',
      fontFace: 'Cambria',
    });
    const diffs = [
      ['Local-first, sans compte', 'Données sur l’appareil, relais chiffré auto-hébergeable.'],
      ['Code ouvert AGPL-3.0', 'Export complet : vos données survivent au projet.'],
      ['Plan algorithmique, sans IA distante', 'Le calendrier se recompose sur l’appareil.'],
      ['Idéation intégrée', 'Sérendipité, contraintes, bac à sable.'],
    ];
    diffs.forEach(([h, b], i) => {
      const y = 1.55 + i * 1.22;
      dot(s, 9.0, y + 0.1, 0.16, 'diff-dot-' + i);
      text(s, h, { x: 9.3, y, w: 3.4, h: 0.4, fontSize: 16, bold: true });
      text(s, b, { x: 9.3, y: y + 0.42, w: 3.4, h: 0.65, fontSize: 14, color: C.text2 });
    });
    s.addNotes(
      'Carte qualitative à partir du tableau concurrentiel vérifié (STRATEGY.md § 3). Le quadrant haut-droit est vide parmi les 19 produits étudiés : opportunité ou piège, car planifier suppose des données de calendrier souvent hébergées chez Google ou Microsoft. Hypothèse R5 à valider : le local-first est-il un critère de choix ou une simple préférence ?',
    );
  }

  // 8 — Business model
  {
    const s = content('Marché', 'Le cœur est libre, on paie le service');
    const tiers = [
      [
        'Libre',
        '0 €',
        'Toute l’app, toutes les fonctions locales, relais auto-hébergeable.',
        false,
      ],
      [
        'Sync',
        '3–5 € / mois',
        'Relais hébergé chiffré de bout en bout, appareils illimités.',
        true,
      ],
      ['Soutien', '≈ 8 € / mois', 'Sync + thèmes, badge, accès anticipé, vote prioritaire.', false],
      [
        'Équipe (2.0+)',
        '6–10 € / siège',
        'Espaces partagés chiffrés, SSO, journal d’audit.',
        false,
      ],
    ];
    tiers.forEach(([name, price, desc, hi], i) => {
      const x = 0.6 + i * 3.1;
      card(s, x, 1.6, 2.85, 3.3, hi ? C.text1 : C.background2, 'tier-' + i);
      const fg = hi ? C.background1 : C.text1;
      text(s, name, { x: x + 0.3, y: 1.9, w: 2.3, h: 0.45, fontSize: 18, bold: true, color: fg });
      text(s, price, {
        x: x + 0.3,
        y: 2.45,
        w: 2.4,
        h: 0.75,
        fontSize: 28,
        fontFace: 'Cambria',
        color: hi ? C.accent1 : C.text1,
      });
      text(s, desc, {
        x: x + 0.3,
        y: 3.35,
        w: 2.3,
        h: 1.9,
        fontSize: 15,
        color: hi ? C.background2 : C.text2,
      });
    });
    text(
      s,
      [
        { text: 'Prix payants = hypothèses', options: { bold: true } },
        {
          text: ', à valider par une enquête Van Westendorp puis un test réel à trois prix. Ancrages vérifiés : Obsidian Sync 4–5 $/mois, Anytype Plus 4 $/mois. Exclus : publicité, revente de données, fonction locale payante.',
        },
      ],
      { x: 0.6, y: 5.3, w: 12.1, h: 0.8, fontSize: 15, color: C.text2 },
    );
    s.addNotes(
      'Recommandation de STRATEGY.md § 5 : tout ce qui tourne sur l’appareil reste gratuit ; le revenu vient de la synchronisation hébergée, puis des équipes. Parrainages et subventions open source en complément dès le premier jour. La simulation du § 5.5 montre que Sync seul ne fait pas vivre un fondateur à 12 mois : coûts fixes proches de zéro.',
    );
  }

  // 9 — GTM
  pres.addSection({ title: 'Mise sur le marché' });
  {
    const s = content('Mise sur le marché', 'Lancement porté par la communauté du fondateur');
    const steps = [
      ['T-8 sem.', 'Liste d’attente, Discord fermé, devlog « pourquoi POuxis »'],
      ['T-4 sem.', 'Bêta élargie, retours réels cités avec accord, presse sous embargo'],
      ['J', 'Vidéo K13 Studios, stores, dépôt GitHub, Show HN'],
      ['J+1 à J+5', 'Product Hunt, Reddit, communautés FR, Indie Hackers, live Q&R'],
      ['+12 sem.', 'Test de prix, bilan de rétention, décision de segment'],
    ];
    const y = 2.55;
    s.addShape(pres.shapes.LINE, {
      x: 0.9,
      y,
      w: 11.5,
      h: 0,
      line: { color: HEX.line, width: 2 },
      objectName: 'timeline',
    });
    steps.forEach(([h, b], i) => {
      const x = 0.6 + i * 2.45;
      s.addShape(pres.shapes.OVAL, {
        x: x + 0.15,
        y: y - 0.2,
        w: 0.4,
        h: 0.4,
        fill: { color: i === 2 ? C.accent1 : C.text1 },
        line: { type: 'none' },
        objectName: 'milestone-' + i,
      });
      text(s, h, { x, y: 1.6, w: 2.3, h: 0.5, fontSize: 20, bold: true, fontFace: 'Cambria' });
      text(s, b, { x, y: 3.0, w: 2.2, h: 1.6, fontSize: 15, color: C.text2 });
    });
    card(s, 0.6, 4.95, 12.1, 1.35, C.background2, 'channels');
    text(
      s,
      [
        { text: 'Canaux : ', options: { bold: true } },
        {
          text: 'YouTube et Instagram K13 Studios (devlogs mensuels, formats courts), GitHub (good first issues, traductions), Discord. ',
        },
        { text: 'Pas de publicité payante', options: { bold: true } },
        { text: ' avant une rétention mesurée. Jamais de demande de votes.' },
      ],
      { x: 0.85, y: 4.95, w: 11.6, h: 1.35, fontSize: 16, valign: 'middle' },
    );
    s.addNotes(
      'Séquence détaillée en STRATEGY.md § 7. J n’est fixé qu’une fois les critères de sortie de la feuille de route atteints ; fenêtres conseillées : rentrée ou janvier. Les règles de chaque communauté sont à relire avant publication.',
    );
  }

  // 10 — Roadmap
  {
    const s = content('Mise sur le marché', 'Feuille de route');
    const phases = [
      [
        '0.1',
        'La boucle',
        'Capturer, planifier, se concentrer, faire le bilan ; sync E2EE bureau ↔ mobile',
        true,
      ],
      [
        '0.2',
        'Confiance et profondeur',
        'Plan explicable, coffres chiffrés, Kanban, premier outil d’idéation, CLI',
        false,
      ],
      [
        '0.3',
        'Penser en graphes',
        'Toile, mise en page automatique, heatmap d’énergie, recherche locale',
        false,
      ],
      ['1.0', 'Stable et publique', 'Stores, formats gelés, audit de sécurité, extensions', false],
      [
        '2.0+',
        'Collaboration',
        'Partage chiffré, SSO, modèles communautaires, IA locale optionnelle',
        false,
      ],
    ];
    phases.forEach(([v, name, desc, current], i) => {
      const y = 1.55 + i * 0.98;
      card(s, 0.6, y, 12.1, 0.82, current ? C.text1 : C.background2, 'phase-' + v);
      const fg = current ? C.background1 : C.text1;
      text(s, v, {
        x: 0.85,
        y,
        w: 1.0,
        h: 0.82,
        fontSize: 22,
        fontFace: 'Cambria',
        valign: 'middle',
        color: current ? C.accent1 : C.text1,
      });
      text(s, name, {
        x: 1.95,
        y,
        w: 3.3,
        h: 0.82,
        fontSize: 18,
        bold: true,
        valign: 'middle',
        color: fg,
      });
      text(s, desc, {
        x: 5.3,
        y,
        w: 6.0,
        h: 0.82,
        fontSize: 15,
        valign: 'middle',
        color: current ? C.background2 : C.text2,
      });
      if (current)
        text(s, 'en cours', {
          x: 11.35,
          y,
          w: 1.2,
          h: 0.82,
          fontSize: 13,
          valign: 'middle',
          align: 'right',
          color: C.accent1,
        });
    });
    text(
      s,
      'Phases et critères de sortie : docs/product/ROADMAP.md. Aucune date annoncée avant les critères de sortie de la 0.1.',
      { x: 0.6, y: 6.5, w: 12.1, h: 0.35, fontSize: 12, italic: true, color: C.text2 },
    );
    s.addNotes(
      'Phases reprises de ROADMAP.md. Chaque phase a des critères de sortie mesurables ; on ne communique pas de date tant qu’ils ne sont pas tenus.',
    );
  }

  // 11 — Risks
  {
    const s = content('Mise sur le marché', 'Les risques, nommés');
    const risks = [
      [
        'Périmètre de 100 fonctions',
        'On annonce la boucle, pas la liste. Registre des affirmations obligatoire.',
      ],
      [
        'Fondateur seul',
        'Code ouvert et export complet ; contributeurs et modérateurs dès la bêta.',
      ],
      [
        'Attentes d’IA',
        'Pas d’IA distante en 1.0, par choix de confidentialité ; IA locale optionnelle plus tard.',
      ],
      [
        'Synchronisation fragile',
        'Bêta longue, tests de convergence, sauvegarde avant chaque fusion.',
      ],
    ];
    risks.forEach(([h, b], i) => {
      const col = i % 2,
        row = Math.floor(i / 2);
      const x = 0.6 + col * 6.15,
        y = 1.6 + row * 2.4;
      card(s, x, y, 5.95, 2.15, C.background2, 'risk-' + i);
      dot(s, x + 0.35, y + 0.42, 0.2, 'risk-dot-' + i);
      text(s, h, {
        x: x + 0.75,
        y: y + 0.3,
        w: 4.9,
        h: 0.45,
        fontSize: 20,
        bold: true,
        fontFace: 'Cambria',
      });
      text(s, b, { x: x + 0.35, y: y + 0.95, w: 5.3, h: 1.0, fontSize: 16, color: C.text2 });
    });
    s.addNotes(
      'Les quatre risques principaux de STRATEGY.md § 2.5 et § 14. Les nommer d’emblée renforce la crédibilité auprès des communautés open source.',
    );
  }

  // 12 — Team & ask
  pres.addSection({ title: 'Conclusion' });
  {
    const s = pres.addSlide({ masterName: 'POUXIS_DARK', sectionTitle: 'Conclusion' });
    s.addImage({
      data: lockupDark,
      x: 0.8,
      y: 0.7,
      w: 2.4,
      h: 2.4 * LOCKUP_RATIO,
      altText: 'Logo POuxis',
    });
    text(s, 'Un fondateur, une communauté à construire', {
      x: 0.8,
      y: 1.55,
      w: 11.7,
      h: 0.9,
      fontSize: 34,
      color: C.background1,
      fontFace: 'Cambria',
    });
    text(
      s,
      'Fondateur de K13 Studios (YouTube, Instagram) : produit, design, contenu. Projet ouvert dès le premier jour.',
      { x: 0.8, y: 2.45, w: 11.5, h: 0.7, fontSize: 17, color: C.background2 },
    );
    const asks = [
      ['Bêta-testeurs', 'Cohortes de 14 jours, dans et hors de l’audience K13'],
      ['Contributeurs', 'Traductions, tests du moteur, thèmes, documentation'],
      ['Soutiens', 'Parrainages et programmes de financement open source'],
      ['Partenaires', 'Écoles de design et d’informatique, créateurs d’outils'],
    ];
    asks.forEach(([h, b], i) => {
      const x = 0.8 + i * 2.98;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x,
        y: 3.6,
        w: 2.75,
        h: 2.35,
        rectRadius: 0.12,
        fill: { color: '3A3833' },
        line: { type: 'none' },
        objectName: 'ask-' + i,
      });
      dot(s, x + 0.3, 3.92, 0.2, 'ask-dot-' + i);
      text(s, h, {
        x: x + 0.3,
        y: 4.3,
        w: 2.2,
        h: 0.45,
        fontSize: 19,
        bold: true,
        color: C.background1,
      });
      text(s, b, { x: x + 0.3, y: 4.85, w: 2.2, h: 1.0, fontSize: 14, color: C.background2 });
    });
    text(s, 'Ce que nous cherchons, dès maintenant', {
      x: 0.8,
      y: 3.2,
      w: 8,
      h: 0.35,
      fontSize: 14,
      color: C.accent1,
      bold: true,
    });
    s.addNotes(
      'Équipe et demande. Pas de levée de fonds chiffrée : le modèle recommandé (STRATEGY.md § 5) vise des coûts fixes proches de zéro. On demande du temps et de l’attention : tester, contribuer, soutenir, s’associer.',
    );
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log('wrote', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
