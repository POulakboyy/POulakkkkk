/**
 * Programmable fields (2.8): numbers, text, checkboxes and formulas with a live result. A
 * formula error says what is wrong and where, in the user's words.
 */
import { useId, useState, type FormEvent } from 'react';
import type { Task } from '@pouxis/core';
import { store } from '../../store/index.ts';
import { Button, Checkbox, IconButton, IconClose, IconPlus, TextField } from '../../ui/index.ts';
import { useTasks } from './context.ts';
import {
  formulaError,
  isValidFieldName,
  parseFieldValue,
  previewFormula,
  resolveFields,
  type FieldEntry,
  type FieldKind,
  type FieldResult,
} from './fields.ts';
import s from './Tasks.module.css';

const KINDS: readonly FieldKind[] = ['number', 'text', 'checkbox', 'formula'];

function setField(task: Task, name: string, value: number | string | boolean | undefined) {
  const fields = { ...(task.fields ?? {}) };
  if (value === undefined) delete fields[name];
  else fields[name] = value;
  store.update('tasks', task.id, { fields: Object.keys(fields).length ? fields : undefined });
}

export function FieldsSection({ task }: { task: Task }) {
  const { t } = useTasks();
  const entries = resolveFields(task);
  return (
    <section className={s.section} aria-labelledby={`fields-${task.id}`}>
      <header className={s.sectionHeader}>
        <h3 id={`fields-${task.id}`} className={s.sectionTitle}>
          {t('tasks.formulas.title')}
        </h3>
      </header>
      {entries.length === 0 ? (
        <p className={s.muted}>{t('tasks.formulas.empty')}</p>
      ) : (
        <ul className={s.fieldList}>
          {entries.map((entry) => (
            <FieldRow key={entry.name} task={task} entry={entry} />
          ))}
        </ul>
      )}
      <AddField task={task} />
    </section>
  );
}

function FieldRow({ task, entry }: { task: Task; entry: FieldEntry }) {
  const { t } = useTasks();
  const remove = (
    <IconButton
      size="sm"
      variant="ghost"
      icon={<IconClose />}
      label={t('tasks.formulas.remove', { name: entry.name })}
      onClick={() => setField(task, entry.name, undefined)}
    />
  );
  if (entry.kind === 'checkbox') {
    return (
      <li className={s.fieldRow}>
        <Checkbox
          label={entry.name}
          checked={entry.value === true}
          onCheckedChange={(checked) => setField(task, entry.name, checked)}
        />
        {remove}
      </li>
    );
  }
  if (entry.kind === 'formula') {
    return (
      <li className={s.fieldRow}>
        <FormulaInput
          task={task}
          name={entry.name}
          initial={String(entry.value)}
          onCommit={(source) =>
            setField(task, entry.name, parseFieldValue('formula', source) ?? undefined)
          }
        />
        {remove}
      </li>
    );
  }
  return (
    <li className={s.fieldRow}>
      <ValueInput
        label={entry.name}
        kind={entry.kind}
        initial={String(entry.value)}
        onCommit={(value) => setField(task, entry.name, value)}
      />
      {remove}
    </li>
  );
}

function ValueInput({
  label,
  kind,
  initial,
  onCommit,
}: {
  label: string;
  kind: 'number' | 'text';
  initial: string;
  onCommit: (value: number | string) => void;
}) {
  const [value, setValue] = useState(initial);
  const parsed = parseFieldValue(kind, value);
  return (
    <TextField
      label={label}
      value={value}
      inputMode={kind === 'number' ? 'decimal' : undefined}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (parsed !== null && typeof parsed !== 'boolean') onCommit(parsed);
      }}
      wrapperClassName={s.grow}
    />
  );
}

/** Formula source input with its live result or error. */
export function FormulaInput({
  task,
  name,
  initial,
  onCommit,
  onSourceChange,
  label,
}: {
  task: Task;
  name: string;
  initial: string;
  onCommit?: (source: string) => void;
  onSourceChange?: (source: string) => void;
  label?: string;
}) {
  const { t, fmt } = useTasks();
  const [source, setSource] = useState(initial);
  const result = previewFormula(task, name || '_', source);
  const feedback = source.trim() ? describeResult(source, result, t, fmt.number) : null;
  return (
    <TextField
      label={label ?? `${name} =`}
      value={source}
      placeholder={t('tasks.formulas.placeholder')}
      onChange={(e) => {
        setSource(e.target.value);
        onSourceChange?.(e.target.value);
      }}
      onBlur={() => onCommit?.(source)}
      spellCheck={false}
      autoCapitalize="off"
      className={s.mono}
      wrapperClassName={s.grow}
      {...(feedback?.ok === false
        ? { error: feedback.text }
        : { hint: feedback?.text ?? t('tasks.formulas.help') })}
    />
  );
}

function describeResult(
  source: string,
  result: FieldResult,
  t: ReturnType<typeof useTasks>['t'],
  number: (n: number) => string,
): { ok: boolean; text: string } {
  if (result.ok) {
    const v = result.value;
    const shown = typeof v === 'number' ? number(v) : typeof v === 'boolean' ? (v ? '✓' : '✗') : v;
    return { ok: true, text: t('tasks.formulas.preview', { value: shown }) };
  }
  const { key, vars } = formulaError(source, result);
  return { ok: false, text: t(key, vars) };
}

function AddField({ task }: { task: Task }) {
  const { t } = useTasks();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<FieldKind>('number');
  const [value, setValue] = useState('');
  const trimmed = name.trim();
  const nameError = !trimmed
    ? null
    : !isValidFieldName(trimmed)
      ? t('tasks.formulas.invalidName')
      : task.fields && trimmed in task.fields
        ? t('tasks.formulas.duplicateName')
        : null;

  if (!open) {
    return (
      <Button size="sm" variant="ghost" iconStart={<IconPlus />} onClick={() => setOpen(true)}>
        {t('tasks.formulas.add')}
      </Button>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || nameError) return;
    const parsed = kind === 'checkbox' ? false : parseFieldValue(kind, value);
    if (parsed === null) return;
    setField(task, trimmed, parsed);
    setName('');
    setValue('');
    setOpen(false);
  };

  return (
    <form className={s.addField} onSubmit={submit} aria-label={t('tasks.formulas.add')}>
      <div className={s.addFieldRow}>
        <TextField
          label={t('tasks.formulas.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError ?? undefined}
          autoCapitalize="off"
          spellCheck={false}
          wrapperClassName={s.grow}
          autoFocus
        />
        <div className={s.selectField}>
          <label htmlFor={`${id}-kind`} className={s.pickerLabel}>
            {t('tasks.formulas.type')}
          </label>
          <select
            id={`${id}-kind`}
            className={s.select}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as FieldKind);
              setValue('');
            }}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`tasks.formulas.types.${k}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {kind === 'formula' ? (
        <FormulaInput
          key="formula"
          task={task}
          name={trimmed}
          initial=""
          label={t('tasks.formulas.formula')}
          onSourceChange={setValue}
        />
      ) : kind !== 'checkbox' ? (
        <TextField
          label={t('tasks.formulas.value')}
          value={value}
          inputMode={kind === 'number' ? 'decimal' : undefined}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : null}
      <div className={s.actions}>
        <Button size="sm" type="submit" disabled={!trimmed || nameError !== null}>
          {t('common.actions.add')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
