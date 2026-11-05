import type { Note } from '@pouxis/core';
import { useT } from '../../../i18n/index.ts';
import { Constraints } from './Constraints.tsx';
import { DeadEnds } from './DeadEnds.tsx';
import { Methods } from './Methods.tsx';
import { Moodboard } from './Moodboard.tsx';
import { Serendipity } from './Serendipity.tsx';
import s from './Studio.module.css';

export interface StudioProps {
  /** Linkable notes (no sandbox, no vault). */
  notes: readonly Note[];
  onOpen: (id: string) => void;
}

/** The creative toolbox: each tool is self-contained and works without any setup. */
export function Studio({ notes, onOpen }: StudioProps) {
  const t = useT();
  return (
    <div className={s.studio} role="region" aria-label={t('ideas.studio.label')}>
      <div className={s.featured}>
        <Serendipity notes={notes} onOpen={onOpen} />
      </div>
      <Constraints />
      <div className={s.wide}>
        <Methods onSaved={onOpen} />
      </div>
      <Moodboard />
      <DeadEnds notes={notes} onOpen={onOpen} />
    </div>
  );
}
