/**
 * Serendipity engine (5.1): a short deck of remote note pairs, browsed like stories — swipe,
 * arrow keys or the buttons. "Link them" records the association both ways.
 */
import { useRef, useState, type PointerEvent } from 'react';
import { ideation, type Note } from '@pouxis/core';
import { useT } from '../../../i18n/index.ts';
import { store, usePrefs } from '../../../store/index.ts';
import {
  Button,
  cx,
  IconButton,
  IconChevronLeft,
  IconChevronRight,
  IconLink,
  IconRepeat,
  IconSparkle,
  toast,
} from '../../../ui/index.ts';
import { excerpt, linkPatches } from '../lib/notes.ts';
import { ToolHeader } from './ToolHeader.tsx';
import { buildDeck, swipeDirection, type Pair } from './deck.ts';
import s from './Studio.module.css';

export interface SerendipityProps {
  notes: readonly Note[];
  onOpen: (id: string) => void;
}

export function Serendipity({ notes, onOpen }: SerendipityProps) {
  const t = useT();
  const rng = useRef(ideation.mulberry32(Date.now() >>> 0));
  const seen = useRef<Array<readonly [string, string]>>([]);
  const [deck, setDeck] = useState<Pair[] | null>(null);
  const [index, setIndex] = useState(0);
  const [linked, setLinked] = useState<ReadonlySet<string>>(new Set());

  const deal = () => {
    let next = buildDeck(notes, rng.current, 5, seen.current);
    if (next.length === 0 && seen.current.length > 0) {
      seen.current = [];
      next = buildDeck(notes, rng.current, 5);
    }
    for (const pair of next) seen.current.push([pair.a.id, pair.b.id]);
    setDeck(next);
    setIndex(0);
  };

  const link = (pair: Pair) => {
    const a = store.get('notes', pair.a.id);
    const b = store.get('notes', pair.b.id);
    if (!a || !b) return;
    store.batch(() => {
      for (const patch of linkPatches(a, b))
        store.update('notes', patch.id, { links: patch.links });
    });
    setLinked((prev) => new Set(prev).add(ideation.pairKey(a.id, b.id)));
    toast({ title: t('ideas.serendipity.linked'), tone: 'success' });
  };

  return (
    <section className={s.tool} aria-labelledby="serendipity-title">
      <ToolHeader
        id="serendipity-title"
        title={t('ideas.serendipity.title')}
        hint={t('ideas.serendipity.hint')}
      />
      {deck === null ? (
        <div className={s.intro}>
          <Button variant="primary" iconStart={<IconSparkle />} onClick={deal}>
            {t('ideas.serendipity.action')}
          </Button>
        </div>
      ) : deck.length === 0 ? (
        <p className={s.muted}>{t('ideas.serendipity.tooFew')}</p>
      ) : (
        <StoryDeck
          deck={deck}
          index={index}
          onIndex={setIndex}
          linked={linked}
          onLink={link}
          onOpen={onOpen}
          onAgain={deal}
        />
      )}
    </section>
  );
}

interface StoryDeckProps {
  deck: readonly Pair[];
  index: number;
  onIndex: (index: number) => void;
  linked: ReadonlySet<string>;
  onLink: (pair: Pair) => void;
  onOpen: (id: string) => void;
  onAgain: () => void;
}

function StoryDeck({ deck, index, onIndex, linked, onLink, onOpen, onAgain }: StoryDeckProps) {
  const t = useT();
  const { locale } = usePrefs();
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; id: number } | null>(null);
  const pair = deck[index];
  if (!pair) return null;

  const go = (dir: number) => {
    const next = index + dir;
    if (next >= 0 && next < deck.length) onIndex(next);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { x: e.clientX, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) setDx(e.clientX - drag.current.x);
  };
  const onPointerEnd = () => {
    if (!drag.current) return;
    drag.current = null;
    go(swipeDirection(dx));
    setDx(0);
  };

  const isLinked = linked.has(ideation.pairKey(pair.a.id, pair.b.id));
  const meta =
    pair.sharedTags.length > 0
      ? t('ideas.serendipity.shared', { tags: pair.sharedTags.map((tag) => `#${tag}`).join(' ') })
      : pair.distance === null
        ? t('ideas.serendipity.unrelated')
        : t('ideas.serendipity.distance', { count: pair.distance - 1 });

  return (
    <div className={s.deck}>
      <div className={s.progress} aria-hidden="true">
        {deck.map((p, i) => (
          <span key={ideation.pairKey(p.a.id, p.b.id)} className={s.segment}>
            <span className={cx(s.segmentFill, i <= index && s.segmentOn)} />
          </span>
        ))}
      </div>

      <div
        className={cx(s.story, dx !== 0 && s.dragging)}
        role="group"
        aria-roledescription={t('ideas.serendipity.title')}
        aria-label={t('ideas.serendipity.card', { current: index + 1, total: deck.length })}
        tabIndex={0}
        style={dx ? { transform: `translateX(${dx}px) rotate(${dx / 40}deg)` } : undefined}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1);
          else if (e.key === 'ArrowLeft') go(-1);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div key={index} className={s.storyInner}>
          <PairNote note={pair.a} onOpen={onOpen} />
          <p className={s.prompt}>{pair.prompt[locale]}</p>
          <PairNote note={pair.b} onOpen={onOpen} />
          <p className={s.storyMeta}>{meta}</p>
        </div>
      </div>
      <p className={s.srHint}>{t('ideas.serendipity.swipe')}</p>

      <div className={s.deckActions}>
        <IconButton
          label={t('ideas.serendipity.previous')}
          icon={<IconChevronLeft />}
          variant="secondary"
          disabled={index === 0}
          onClick={() => go(-1)}
        />
        <Button
          variant={isLinked ? 'secondary' : 'primary'}
          iconStart={<IconLink />}
          disabled={isLinked}
          onClick={() => onLink(pair)}
        >
          {isLinked ? t('ideas.serendipity.linked') : t('ideas.serendipity.link')}
        </Button>
        {index < deck.length - 1 ? (
          <IconButton
            label={t('ideas.serendipity.next')}
            icon={<IconChevronRight />}
            variant="secondary"
            onClick={() => go(1)}
          />
        ) : (
          <IconButton
            label={t('ideas.serendipity.again')}
            icon={<IconRepeat />}
            variant="secondary"
            onClick={onAgain}
          />
        )}
      </div>
    </div>
  );
}

function PairNote({ note, onOpen }: { note: Note; onOpen: (id: string) => void }) {
  const t = useT();
  const title = note.title.trim() || t('ideas.notes.untitled');
  const preview = excerpt(note.body, 90);
  return (
    <button
      type="button"
      className={s.pairNote}
      aria-label={t('ideas.serendipity.open', { title })}
      onClick={() => onOpen(note.id)}
    >
      <span className={s.pairTitle}>{title}</span>
      {preview && <span className={s.pairExcerpt}>{preview}</span>}
    </button>
  );
}
