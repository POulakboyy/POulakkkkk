import { useRef, useState, type ReactNode } from 'react';
import { useT } from '../i18n/index.ts';
import { Button } from './actions/Button.tsx';
import { IconButton } from './actions/IconButton.tsx';
import { Chip, Pill, PillGroup } from './actions/Pill.tsx';
import { Avatar } from './display/Avatar.tsx';
import { Badge } from './display/Badge.tsx';
import { Card, cardLinkClassName } from './display/Card.tsx';
import { EmptyState } from './display/EmptyState.tsx';
import { Kbd } from './display/Kbd.tsx';
import { ListRow } from './display/ListRow.tsx';
import { SectionHeader } from './display/SectionHeader.tsx';
import { Skeleton, SkeletonText } from './display/Skeleton.tsx';
import { ProgressBar } from './feedback/ProgressBar.tsx';
import { ProgressRing } from './feedback/ProgressRing.tsx';
import { Spinner } from './feedback/Spinner.tsx';
import { Toaster } from './feedback/Toaster.tsx';
import { toast } from './feedback/toastStore.ts';
import { Checkbox } from './forms/Checkbox.tsx';
import { Switch } from './forms/Switch.tsx';
import { TextArea } from './forms/TextArea.tsx';
import { TextField } from './forms/TextField.tsx';
import { SwipeableRow } from './gestures/SwipeableRow.tsx';
import {
  IconArchive,
  IconBell,
  IconBolt,
  IconCalendar,
  IconClock,
  IconCopy,
  IconEdit,
  IconFilter,
  IconFlag,
  IconHeart,
  IconIdeas,
  IconInbox,
  IconMoon,
  IconMore,
  IconPlay,
  IconPlus,
  IconSearch,
  IconShare,
  IconSparkle,
  IconSun,
  IconTrash,
} from './icons.tsx';
import { SegmentedControl } from './navigation/SegmentedControl.tsx';
import { Tabs } from './navigation/Tabs.tsx';
import { Dialog } from './overlays/Dialog.tsx';
import { Menu } from './overlays/Menu.tsx';
import { Popover } from './overlays/Popover.tsx';
import { Sheet } from './overlays/Sheet.tsx';
import { Tooltip } from './overlays/Tooltip.tsx';
import s from './Gallery.module.css';

export interface GalleryProps {
  /** Mount a {@link Toaster} (standalone previews). The app shell normally mounts its own. */
  withToaster?: boolean;
}

/**
 * Living style guide: every primitive in every state, in the current theme. Used for visual
 * QA and as executable documentation (route `#/settings?gallery=1`).
 */
export function Gallery({ withToaster = false }: GalleryProps) {
  const t = useT();
  return (
    <div className={s.gallery}>
      <SectionHeader
        level={1}
        size="display"
        eyebrow="POuxis · Design system"
        title="Composants"
        subtitle="Chaque primitive, dans chaque état, avec les tokens du thème courant."
        action={<ThemeSwitcher />}
      />
      <Buttons />
      <Selection />
      <Display />
      <Forms />
      <Overlays />
      <Feedback />
      <Swipe />
      <footer className={s.footer}>
        <p>
          {t('common.appName')} — <Kbd keys="mod+k" /> <Kbd keys="shift+?" /> <Kbd keys="esc" />
        </p>
      </footer>
      {withToaster && <Toaster />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={s.section} aria-label={title}>
      <SectionHeader title={title} size="lg" />
      <div className={s.stack}>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className={s.rowWrap}>
      {label && <p className={s.label}>{label}</p>}
      <div className={s.row}>{children}</div>
    </div>
  );
}

function ThemeSwitcher() {
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark' | 'eink'>(
    () =>
      (document.documentElement.dataset.theme as 'light' | 'dark' | 'eink' | undefined) ?? 'auto',
  );
  const apply = (next: typeof theme) => {
    setTheme(next);
    if (next === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
  };
  return (
    <SegmentedControl
      label="Thème"
      size="sm"
      value={theme}
      onChange={apply}
      options={[
        { value: 'auto', label: 'Auto' },
        { value: 'light', label: 'Clair', icon: <IconSun /> },
        { value: 'dark', label: 'Sombre', icon: <IconMoon /> },
        { value: 'eink', label: 'E-ink' },
      ]}
    />
  );
}

function Buttons() {
  const [loading, setLoading] = useState(false);
  const [starred, setStarred] = useState(false);
  return (
    <Section title="Boutons">
      <Row label="Variantes">
        <Button variant="primary" iconStart={<IconPlus />}>
          Nouvelle tâche
        </Button>
        <Button>Secondaire</Button>
        <Button variant="ghost">Discret</Button>
        <Button variant="danger" iconStart={<IconTrash />}>
          Supprimer
        </Button>
        <Button variant="danger-soft">Archiver tout</Button>
      </Row>
      <Row label="Tailles">
        <Button variant="primary" size="sm">
          Petit
        </Button>
        <Button variant="primary">Moyen</Button>
        <Button variant="primary" size="lg" iconEnd={<IconPlay />}>
          Lancer le focus
        </Button>
      </Row>
      <Row label="États">
        <Button
          variant="primary"
          loading={loading}
          onClick={() => {
            setLoading(true);
            window.setTimeout(() => setLoading(false), 1600);
          }}
        >
          Synchroniser
        </Button>
        <Button loading>Chargement</Button>
        <Button disabled>Désactivé</Button>
        <Button variant="primary" disabled>
          Désactivé
        </Button>
      </Row>
      <Row label="Pleine largeur">
        <Button variant="primary" size="lg" fullWidth>
          Continuer
        </Button>
      </Row>
      <Row label="Boutons icône">
        <IconButton label="Rechercher" icon={<IconSearch />} />
        <IconButton label="Ajouter" icon={<IconPlus />} variant="secondary" />
        <IconButton label="Démarrer" icon={<IconPlay />} variant="primary" />
        <IconButton
          label="Favori"
          icon={<IconHeart />}
          pressed={starred}
          onClick={() => setStarred(!starred)}
        />
        <IconButton label="Petit" icon={<IconEdit />} size="sm" />
        <IconButton label="Désactivé" icon={<IconShare />} disabled />
      </Row>
    </Section>
  );
}

function Selection() {
  const [filters, setFilters] = useState<Record<string, boolean>>({ deep: true });
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const toggle = (k: string) => (on: boolean) => setFilters((f) => ({ ...f, [k]: on }));
  return (
    <Section title="Sélection">
      <Row label="Pastilles (filtres)">
        <PillGroup label="Filtres">
          <Pill icon={<IconBolt />} selected={!!filters.deep} onSelectedChange={toggle('deep')}>
            Travail profond
          </Pill>
          <Pill icon={<IconIdeas />} selected={!!filters.ideas} onSelectedChange={toggle('ideas')}>
            Idées
          </Pill>
          <Pill
            icon={<IconClock />}
            selected={!!filters.short}
            onSelectedChange={toggle('short')}
            count={12}
          >
            Moins de 15 min
          </Pill>
          <Pill icon={<IconFlag />} selected={!!filters.flag} onSelectedChange={toggle('flag')}>
            Prioritaires
          </Pill>
          <Pill size="sm" disabled>
            Indisponible
          </Pill>
        </PillGroup>
      </Row>
      <Row label="Étiquettes">
        <Chip category={1}>Écriture</Chip>
        <Chip category={4}>Recherche</Chip>
        <Chip category={3} onRemove={() => undefined} removeLabel="Retirer l’étiquette Santé">
          Santé
        </Chip>
        <Chip icon={<IconCalendar />}>Demain</Chip>
      </Row>
      <Row label="Contrôle segmenté">
        <SegmentedControl
          label="Période"
          value={view}
          onChange={setView}
          options={[
            { value: 'day', label: 'Jour' },
            { value: 'week', label: 'Semaine' },
            { value: 'month', label: 'Mois' },
          ]}
        />
        <SegmentedControl
          label="Disposition"
          iconOnly
          defaultValue="list"
          options={[
            { value: 'list', label: 'Liste', icon: <IconInbox /> },
            { value: 'board', label: 'Tableau', icon: <IconFilter /> },
            { value: 'calendar', label: 'Calendrier', icon: <IconCalendar /> },
          ]}
        />
      </Row>
      <Tabs
        label="Sections"
        items={[
          {
            value: 'all',
            label: 'Tout',
            badge: <Badge count={8} />,
            panel: <p>Toutes les tâches.</p>,
          },
          { value: 'today', label: 'Aujourd’hui', panel: <p>Ce qui compte aujourd’hui.</p> },
          { value: 'later', label: 'Plus tard', panel: <p>Pour plus tard.</p> },
          { value: 'off', label: 'Archivées', disabled: true, panel: null },
        ]}
      />
    </Section>
  );
}

function Display() {
  return (
    <Section title="Affichage">
      <div className={s.grid}>
        <Card variant="plain">
          <SectionHeader size="md" title="Carte simple" subtitle="Bordure fine, fond surface." />
        </Card>
        <Card variant="elevated">
          <SectionHeader size="md" title="Carte en relief" subtitle="Ombre douce." />
        </Card>
        <Card variant="outlined">
          <SectionHeader size="md" title="Carte contour" subtitle="Pour les zones secondaires." />
        </Card>
        <Card variant="tinted" interactive category={5}>
          <a href="#/ideas" className={cardLinkClassName}>
            <SectionHeader
              size="md"
              title="Carte cliquable"
              subtitle="Un seul lien couvre la carte."
            />
          </a>
        </Card>
      </div>
      <Card padding="none">
        <ListRow
          title="Écrire l’introduction"
          description="Projet Livre · 45 min"
          leading={<Checkbox aria-label="Terminer « Écrire l’introduction »" shape="circle" />}
          meta="09:30"
          divider
        />
        <ListRow
          title="Notifications"
          description="Rappels doux, jamais pendant le focus"
          leading={<IconBell />}
          href="#/settings"
          divider
        />
        <ListRow
          title="Mode sombre automatique"
          leading={<IconMoon />}
          trailing={<Switch aria-label="Mode sombre automatique" defaultChecked />}
          divider
        />
        <ListRow
          title="Sélectionnée"
          leading={<IconSparkle />}
          selected
          onClick={() => undefined}
        />
        <ListRow title="Désactivée" leading={<IconArchive />} disabled onClick={() => undefined} />
      </Card>
      <Row label="Badges">
        <Badge>Neutre</Badge>
        <Badge tone="accent" dot>
          Nouveau
        </Badge>
        <Badge tone="success">Terminé</Badge>
        <Badge tone="warning">En retard</Badge>
        <Badge tone="danger" variant="solid">
          Urgent
        </Badge>
        <Badge tone="create" variant="outline">
          Création
        </Badge>
        <Badge tone="execute">Exécution</Badge>
        <Badge tone="accent" variant="solid" count={128} />
      </Row>
      <Row label="Avatars">
        <Avatar name="Ada Lovelace" />
        <Avatar name="Émile Zola" ring />
        <Avatar name="Grace Hopper" size={56} />
        <Avatar name="Kacper" size={32} />
      </Row>
      <Row label="Raccourcis">
        <Kbd keys="mod+k" />
        <Kbd keys="mod+shift+p" />
        <Kbd keys="alt+enter" />
      </Row>
      <Row label="Squelettes">
        <div className={s.skeleton} aria-busy="true">
          <Skeleton shape="circle" />
          <div className={s.grow}>
            <SkeletonText lines={2} />
          </div>
        </div>
        <Skeleton shape="rect" width={160} height={96} />
      </Row>
      <Card variant="tinted" padding="none">
        <EmptyState
          size="compact"
          icon={<IconInbox />}
          title="Boîte de réception vide"
          description="Tout est rangé. Capturez une idée dès qu’elle arrive."
          action={
            <Button variant="primary" iconStart={<IconPlus />}>
              Capturer
            </Button>
          }
        />
      </Card>
    </Section>
  );
}

function Forms() {
  const [title, setTitle] = useState('');
  return (
    <Section title="Formulaires">
      <Row label="Cases à cocher">
        <Checkbox label="Par défaut" />
        <Checkbox label="Cochée" defaultChecked />
        <Checkbox label="Mixte" indeterminate checked onCheckedChange={() => undefined} />
        <Checkbox
          label="Ronde (tâche)"
          shape="circle"
          size="lg"
          description="Avec retour haptique"
        />
        <Checkbox label="Désactivée" disabled />
      </Row>
      <Row label="Interrupteurs">
        <Switch
          label="Ne pas déranger"
          description="Pendant les sessions de focus"
          defaultChecked
        />
        <Switch label="Sons" />
        <Switch label="Désactivé" disabled />
      </Row>
      <div className={s.formGrid}>
        <TextField
          label="Titre"
          placeholder="Que voulez-vous accomplir ?"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          hint="Un verbe d’action aide à démarrer."
          required
        />
        <TextField
          label="Recherche"
          hideLabel
          type="search"
          placeholder="Rechercher"
          iconStart={<IconSearch />}
        />
        <TextField
          label="Durée estimée"
          inputMode="numeric"
          defaultValue="abc"
          error="Entrez un nombre de minutes."
          trailing={<span>min</span>}
        />
        <TextField label="Lieu" optionalText="facultatif" size="lg" />
        <TextArea
          label="Notes"
          placeholder="Écrivez librement…"
          hint="La zone s’agrandit avec le texte."
          maxLength={280}
        />
      </div>
    </Section>
  );
}

function Overlays() {
  const t = useT();
  const [dialog, setDialog] = useState(false);
  const [alert, setAlert] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [side, setSide] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Section title="Superpositions">
      <Row>
        <Button onClick={() => setDialog(true)}>Dialogue</Button>
        <Button variant="danger-soft" onClick={() => setAlert(true)}>
          Confirmation
        </Button>
        <Button onClick={() => setSheet(true)}>Feuille (mobile)</Button>
        <Button onClick={() => setSide(true)}>Panneau latéral</Button>
        <Popover label="Filtres" trigger={<Button iconStart={<IconFilter />}>Popover</Button>}>
          {({ close }) => (
            <div className={s.stack}>
              <Switch label="Masquer les terminées" defaultChecked />
              <Checkbox label="Seulement aujourd’hui" />
              <Button size="sm" variant="primary" onClick={close}>
                {t('common.actions.apply')}
              </Button>
            </div>
          )}
        </Popover>
        <Menu
          label="Actions"
          trigger={
            <IconButton label={t('common.actions.more')} icon={<IconMore />} variant="secondary" />
          }
          items={[
            {
              id: 'edit',
              label: 'Modifier',
              icon: <IconEdit />,
              shortcut: 'e',
              onSelect: () => undefined,
            },
            {
              id: 'copy',
              label: 'Dupliquer',
              icon: <IconCopy />,
              shortcut: 'mod+d',
              onSelect: () => undefined,
            },
            { id: 'share', label: 'Partager', icon: <IconShare />, onSelect: () => undefined },
            {
              id: 'pin',
              type: 'checkbox',
              label: 'Épinglée',
              checked: true,
              onCheckedChange: () => undefined,
            },
            { id: 'sep', type: 'separator' },
            { id: 'off', label: 'Indisponible', disabled: true, onSelect: () => undefined },
            {
              id: 'del',
              label: 'Supprimer',
              icon: <IconTrash />,
              danger: true,
              onSelect: () => undefined,
            },
          ]}
        />
        <Tooltip content="Lancer une session de focus" shortcut="f">
          <IconButton label="Focus" icon={<IconPlay />} noTitle variant="secondary" />
        </Tooltip>
      </Row>
      <Dialog
        open={dialog}
        onOpenChange={setDialog}
        title="Planifier la semaine"
        description="Choisissez trois priorités. Le reste peut attendre."
        footer={
          <>
            <Button onClick={() => setDialog(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={() => setDialog(false)}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <TextField label="Priorité 1" />
      </Dialog>
      <Dialog
        open={alert}
        onOpenChange={setAlert}
        role="alertdialog"
        size="sm"
        title="Supprimer définitivement ?"
        description="Cette idée et ses 3 pièces jointes seront effacées de tous vos appareils."
        initialFocus={cancelRef}
        footer={
          <>
            <Button ref={cancelRef} onClick={() => setAlert(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => setAlert(false)}>
              {t('common.delete')}
            </Button>
          </>
        }
      />
      <Sheet
        open={sheet}
        onOpenChange={setSheet}
        presentation="bottom"
        snapPoints={[0.5, 0.92]}
        defaultSnap={0}
        title="Nouvelle tâche"
        description="Glissez la poignée pour agrandir ou fermer."
        footer={
          <Button variant="primary" fullWidth onClick={() => setSheet(false)}>
            {t('common.actions.add')}
          </Button>
        }
      >
        <div className={s.stack}>
          <TextField label="Titre" />
          <TextArea label="Notes" />
          {Array.from({ length: 8 }, (_, i) => (
            <ListRow key={i} title={`Suggestion ${i + 1}`} leading={<IconSparkle />} divider />
          ))}
        </div>
      </Sheet>
      <Sheet open={side} onOpenChange={setSide} presentation="side" title="Détails">
        <SectionHeader size="md" title="Écrire l’introduction" subtitle="Projet Livre" />
      </Sheet>
    </Section>
  );
}

function Feedback() {
  const t = useT();
  const [value, setValue] = useState(0.62);
  return (
    <Section title="Retours">
      <Row label="Notifications (toasts)">
        <Button
          onClick={() =>
            toast({
              title: t('common.toast.archived'),
              action: {
                label: t('common.undo'),
                onClick: () => toast({ title: t('common.toast.undone') }),
              },
            })
          }
        >
          Archiver (avec annuler)
        </Button>
        <Button onClick={() => toast({ title: t('common.toast.saved'), tone: 'success' })}>
          Succès
        </Button>
        <Button
          onClick={() =>
            toast({
              title: 'Synchronisation interrompue',
              description: 'Nouvel essai dans 30 s.',
              tone: 'danger',
            })
          }
        >
          Erreur
        </Button>
      </Row>
      <Row label="Anneaux">
        <ProgressRing value={value} label="Objectif du jour" valueText="3 tâches sur 5">
          {Math.round(value * 100)}
        </ProgressRing>
        <ProgressRing value={0.4} label="Focus" tone="create" size={72} />
        <ProgressRing
          value={5 / 7}
          segments={7}
          label="Série de la semaine"
          valueText="5 jours sur 7"
          size={72}
          tone="success"
        >
          <Avatar name="Kacper" size={52} decorative />
        </ProgressRing>
        <ProgressRing value={0} label="Vide" />
        <Button size="sm" onClick={() => setValue((v) => (v >= 1 ? 0 : Math.min(1, v + 0.2)))}>
          +20 %
        </Button>
      </Row>
      <div className={s.stack}>
        <ProgressBar
          value={value}
          label="Session de focus"
          valueText="12 min restantes"
          showValue
        />
        <ProgressBar value={0.3} label="Import" tone="create" size="sm" />
        <ProgressBar label="Synchronisation" />
      </div>
      <Row label="Indicateur d’activité">
        <Spinner label={t('common.loading')} />
        <Spinner size={28} label={t('common.loading')} />
      </Row>
    </Section>
  );
}

function Swipe() {
  const t = useT();
  const [items, setItems] = useState([
    'Répondre à Léa',
    'Relire le chapitre 2',
    'Réserver la salle',
  ]);
  const archive = (title: string) => {
    setItems((list) => list.filter((i) => i !== title));
    toast({
      title: t('common.toast.archived'),
      description: title,
      action: { label: t('common.undo'), onClick: () => setItems((list) => [...list, title]) },
    });
  };
  return (
    <Section title="Lignes glissables">
      <p className={s.note}>
        Glissez à droite pour terminer, à gauche pour reporter (long : archiver). Au clavier, le
        bouton « ⋯ » propose les mêmes actions.
      </p>
      <Card padding="none">
        {items.map((title) => (
          <SwipeableRow
            key={title}
            menuLabel={`Actions pour « ${title} »`}
            leading={[
              {
                id: 'done',
                label: 'Terminer',
                icon: <IconSparkle />,
                tone: 'success',
                removes: true,
                onAction: () => archive(title),
              },
            ]}
            trailing={[
              {
                id: 'snooze',
                label: 'Reporter',
                icon: <IconClock />,
                tone: 'warning',
                onAction: () => toast({ title: 'Reporté à demain' }),
              },
              {
                id: 'archive',
                label: 'Archiver',
                icon: <IconArchive />,
                tone: 'danger',
                removes: true,
                onAction: () => archive(title),
              },
            ]}
          >
            <ListRow title={title} description="Glissez-moi" leading={<IconInbox />} />
          </SwipeableRow>
        ))}
      </Card>
    </Section>
  );
}
