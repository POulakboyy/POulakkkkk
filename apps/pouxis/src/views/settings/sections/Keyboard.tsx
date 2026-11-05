import { Fragment, useId, useMemo, useState } from 'react';
import { setAppPrefs, useAppPrefs, type KeymapPreset } from '../../../app/appPrefs.ts';
import {
  KEYMAP_ACTIONS,
  overridesTemplate,
  presetKeymap,
  resolveKeymap,
  type KeymapAction,
  type KeymapError,
} from '../../../app/keymap.ts';
import { useT, type MessageKey } from '../../../i18n/index.ts';
import { Button, IconCheck, Kbd, SegmentedControl, TextArea, toast } from '../../../ui/index.ts';
import { Group, Row } from '../controls.tsx';
import s from '../Settings.module.css';

/** `command.open` → `settings.keyboard.actions.commandOpen`. */
export function actionLabelKey(action: KeymapAction): MessageKey {
  const [head = '', tail = ''] = action.split('.');
  return `settings.keyboard.actions.${head}${tail.charAt(0).toUpperCase()}${tail.slice(1)}` as MessageKey;
}

function useErrorText() {
  const t = useT();
  return (error: KeymapError): string => {
    const reason = t(`settings.keyboard.errors.${error.code}`, {
      detail: error.detail ?? '',
      other: error.other ? t(actionLabelKey(error.other)) : '',
    });
    return t('settings.keyboard.invalidFile', { line: error.line, reason });
  };
}

function Binding({ binding, then }: { binding: string; then: string }) {
  const steps = binding.trim().split(/\s+/);
  return (
    <span className={s.binding}>
      {steps.map((step, i) => (
        <Fragment key={i}>
          {i > 0 && <span className={s.then}>{then}</span>}
          <Kbd keys={step} />
        </Fragment>
      ))}
    </span>
  );
}

export function KeyboardSection() {
  const t = useT();
  const prefs = useAppPrefs();
  const errorText = useErrorText();
  const editorId = useId();
  const [draft, setDraft] = useState(prefs.keymap);
  const preview = useMemo(
    () => resolveKeymap(prefs.keymapPreset, draft),
    [prefs.keymapPreset, draft],
  );
  const active = useMemo(
    () => resolveKeymap(prefs.keymapPreset, prefs.keymap).keymap,
    [prefs.keymapPreset, prefs.keymap],
  );
  const dirty = draft !== prefs.keymap;

  const apply = () => {
    if (preview.error) return;
    setAppPrefs({ keymap: draft });
    toast({ id: 'keymap', title: t('settings.keyboard.applied'), tone: 'success' });
  };

  return (
    <Group
      id="keyboard"
      title={t('settings.sections.keyboard')}
      description={t('settings.keyboard.hint')}
    >
      <Row label={t('settings.keyboard.preset')} hint={t('settings.keyboard.vimHint')}>
        <SegmentedControl<KeymapPreset>
          label={t('settings.keyboard.preset')}
          value={prefs.keymapPreset}
          options={[
            { value: 'default', label: t('settings.keyboard.presets.default') },
            { value: 'vim', label: t('settings.keyboard.presets.vim') },
          ]}
          onChange={(keymapPreset) => setAppPrefs({ keymapPreset })}
        />
      </Row>

      <Row label={t('settings.keyboard.editor')} hint={t('settings.keyboard.editorHint')} stacked>
        <div className={s.editor}>
          <TextArea
            id={editorId}
            label={t('settings.keyboard.editor')}
            hideLabel
            className={s.code}
            value={draft}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            rows={8}
            placeholder={'{\n  "nav.today": ["alt+1", "g d"]\n}'}
            error={preview.error ? errorText(preview.error) : undefined}
            hint={
              !preview.error && draft.trim() !== '' ? (
                <span className={s.valid}>
                  <IconCheck size={14} /> {t('settings.keyboard.valid')}
                </span>
              ) : undefined
            }
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className={s.inline}>
            <Button size="sm" disabled={!dirty || preview.error !== null} onClick={apply}>
              {t('settings.keyboard.apply')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDraft(overridesTemplate(presetKeymap(prefs.keymapPreset)))}
            >
              {t('settings.keyboard.template')}
            </Button>
            {prefs.keymap !== '' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft('');
                  setAppPrefs({ keymap: '' });
                }}
              >
                {t('settings.keyboard.resetAll')}
              </Button>
            )}
          </div>
        </div>
      </Row>

      <Row label={t('settings.keyboard.table')} stacked>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">{t('settings.keyboard.action')}</th>
              <th scope="col">{t('settings.keyboard.keys')}</th>
            </tr>
          </thead>
          <tbody>
            {KEYMAP_ACTIONS.map((action) => (
              <tr key={action}>
                <th scope="row">{t(actionLabelKey(action))}</th>
                <td>
                  {active[action].length === 0 ? (
                    <span className={s.muted}>{t('settings.keyboard.none')}</span>
                  ) : (
                    <span className={s.bindings}>
                      {active[action].map((b) => (
                        <Binding key={b} binding={b} then={t('settings.keyboard.then')} />
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Row>
    </Group>
  );
}
