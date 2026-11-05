/**
 * WIP limit dialog (2.15): one priority too many on a day. Instead of refusing, it offers
 * three ways out — swap with a planned priority, plan it tomorrow, or lower its priority.
 */
import { useState } from 'react';
import { tasks as engine } from '@pouxis/core';
import { navigate } from '../../app/router.ts';
import { Button, Dialog } from '../../ui/index.ts';
import { useTasks } from './context.ts';
import type { WipConflict, WipResolution } from './rules.ts';
import s from './Tasks.module.css';

export function WipDialog({
  conflict,
  onResolve,
}: {
  conflict: WipConflict | null;
  onResolve: (choice: WipResolution) => void;
}) {
  const { t, prefs } = useTasks();
  const [swapping, setSwapping] = useState(false);
  const close = (choice: WipResolution) => {
    setSwapping(false);
    onResolve(choice);
  };

  return (
    <Dialog
      open={conflict !== null}
      onOpenChange={(open) => !open && close({ kind: 'cancel' })}
      role="alertdialog"
      size="sm"
      title={t('tasks.wip.title', { limit: conflict?.limit ?? prefs.wipLimit })}
      description={t('tasks.wip.body')}
      footer={
        <Button variant="ghost" onClick={() => close({ kind: 'cancel' })}>
          {t('common.cancel')}
        </Button>
      }
    >
      {conflict && (
        <div className={s.wip}>
          <p
            className={s.wipCounter}
            aria-label={t('tasks.wip.counterA11y', {
              count: conflict.count,
              limit: conflict.limit,
            })}
          >
            {t('tasks.wip.counter', { count: conflict.count, limit: conflict.limit })}
          </p>
          {swapping ? (
            <fieldset className={s.wipSwap}>
              <legend className={s.fieldLabel}>{t('tasks.wip.swapPick')}</legend>
              {conflict.others.map((other) => (
                <Button
                  key={other.id}
                  variant="secondary"
                  fullWidth
                  onClick={() => close({ kind: 'swap', other })}
                >
                  {other.title}
                </Button>
              ))}
            </fieldset>
          ) : (
            <div className={s.wipChoices}>
              {conflict.others.length > 0 && (
                <Button fullWidth onClick={() => setSwapping(true)}>
                  {t('tasks.wip.swap')}
                </Button>
              )}
              <Button variant="secondary" fullWidth onClick={() => close({ kind: 'tomorrow' })}>
                {t('tasks.wip.tomorrow')}
              </Button>
              <Button variant="secondary" fullWidth onClick={() => close({ kind: 'lower' })}>
                {t('tasks.wip.withoutPriority')}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  close({ kind: 'cancel' });
                  navigate('settings');
                }}
              >
                {t('tasks.wip.changeLimit')}
              </Button>
            </div>
          )}
          <p className={s.wipWhy}>{engine.wipReasonText(conflict.reason, prefs.locale)}</p>
        </div>
      )}
    </Dialog>
  );
}
