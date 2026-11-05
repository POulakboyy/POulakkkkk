import type { ReactNode } from 'react';
import s from './Studio.module.css';

export function ToolHeader(props: { id: string; title: string; hint: string; action?: ReactNode }) {
  return (
    <header className={s.toolHeader}>
      <div className={s.toolHeading}>
        <h2 id={props.id} className={s.toolTitle}>
          {props.title}
        </h2>
        {props.action}
      </div>
      <p className={s.toolHint}>{props.hint}</p>
    </header>
  );
}
