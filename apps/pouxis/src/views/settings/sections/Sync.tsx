import { useState, type FormEvent } from 'react';
import { crypto as pxCrypto } from '@pouxis/core';
import { setAppPrefs, useAppPrefs } from '../../../app/appPrefs.ts';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, useSyncStatus } from '../../../store/index.ts';
import {
  Button,
  IconButton,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconLock,
  TextField,
  toast,
} from '../../../ui/index.ts';
import { Group, Row } from '../controls.tsx';
import s from '../Settings.module.css';

export const MIN_PASSPHRASE = 15;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function PassphraseField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      label={t('settings.sync.passphrase')}
      type={visible ? 'text' : 'password'}
      autoComplete="new-password"
      spellCheck={false}
      value={value}
      minLength={MIN_PASSPHRASE}
      required
      hint={t('settings.sync.passphraseHint')}
      error={error}
      onChange={(e) => onChange(e.target.value)}
      trailing={
        <IconButton
          size="sm"
          variant="ghost"
          label={t(visible ? 'settings.sync.hide' : 'settings.sync.show')}
          icon={visible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          onClick={() => setVisible(!visible)}
        />
      }
    />
  );
}

function SetupForm() {
  const t = useT();
  const app = useAppPrefs();
  const [url, setUrl] = useState(app.relayUrl);
  const [token, setToken] = useState('');
  const [space, setSpace] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  // Same measure as the store (code points), so the form never accepts what sync rejects.
  const short = pxCrypto.passphraseLength(passphrase) < MIN_PASSPHRASE;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (short || url.trim() === '' || token.trim() === '') return;
    setBusy(true);
    setFailure(null);
    try {
      await store.configureSync({
        url: url.trim(),
        token: token.trim(),
        passphrase,
        ...(space.trim() ? { space: space.trim() } : {}),
      });
      setAppPrefs({ syncEnabled: true, relayUrl: url.trim() });
      toast({ id: 'sync', title: t('settings.sync.connected'), tone: 'success' });
    } catch (error) {
      setFailure(t('settings.sync.failed', { reason: errorMessage(error) }));
    } finally {
      setPassphrase('');
      setBusy(false);
    }
  };

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <TextField
        label={t('settings.sync.url')}
        hint={t('settings.sync.urlHint')}
        type="url"
        inputMode="url"
        placeholder="https://"
        autoComplete="url"
        spellCheck={false}
        required
        value={url}
        error={touched && url.trim() === '' ? t('common.form.invalidUrl') : undefined}
        onChange={(e) => setUrl(e.target.value)}
      />
      <TextField
        label={t('settings.sync.token')}
        hint={t('settings.sync.tokenHint')}
        autoComplete="off"
        spellCheck={false}
        required
        value={token}
        error={touched && token.trim() === '' ? t('common.form.required') : undefined}
        onChange={(e) => setToken(e.target.value)}
      />
      <TextField
        label={t('settings.sync.space')}
        hint={t('settings.sync.spaceHint')}
        optionalText={t('common.state.optional')}
        autoComplete="off"
        spellCheck={false}
        value={space}
        onChange={(e) => setSpace(e.target.value)}
      />
      <PassphraseField
        value={passphrase}
        onChange={setPassphrase}
        error={touched && short ? t('settings.sync.passphraseShort') : undefined}
      />
      {failure && (
        <p className={s.error} role="alert">
          {failure}
        </p>
      )}
      <div className={s.inline}>
        <Button type="submit" loading={busy} iconStart={<IconLock size={16} />}>
          {t('settings.sync.connect')}
        </Button>
      </div>
    </form>
  );
}

function UnlockForm() {
  const t = useT();
  const [passphrase, setPassphrase] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFailure(null);
    try {
      await store.unlockSync(passphrase);
    } catch (error) {
      setFailure(t('settings.sync.failed', { reason: errorMessage(error) }));
    } finally {
      setPassphrase('');
      setBusy(false);
    }
  };

  return (
    <form className={s.form} onSubmit={submit}>
      <p className={s.rowHint}>{t('settings.sync.locked')}</p>
      <PassphraseField value={passphrase} onChange={setPassphrase} />
      {failure && (
        <p className={s.error} role="alert">
          {failure}
        </p>
      )}
      <div className={s.inline}>
        <Button type="submit" loading={busy}>
          {t('settings.sync.unlock')}
        </Button>
      </div>
    </form>
  );
}

export function SyncSection() {
  const t = useT();
  const f = useFormat();
  const status = useSyncStatus(); // re-renders on every sync change
  const info = store.syncInfo();

  const disable = async () => {
    await store.disableSync();
    setAppPrefs({ syncEnabled: false });
    toast({ id: 'sync', title: t('settings.sync.disabled') });
  };

  const copySpace = async () => {
    if (!info.space) return;
    try {
      await navigator.clipboard.writeText(info.space);
      toast({ id: 'copy', title: t('common.toast.copied') });
    } catch {
      // Clipboard refused: the id stays visible and selectable.
    }
  };

  return (
    <Group
      id="sync"
      title={t('settings.sections.sync')}
      description={t('settings.sync.encryption')}
    >
      {!info.configured ? (
        <>
          <Row label={t('settings.sync.localOnly')} hint={t('settings.sync.localOnlyHint')} />
          <Row label={t('settings.sync.enable')} stacked>
            <SetupForm />
          </Row>
        </>
      ) : (
        <>
          <Row
            label={t('settings.sync.status', { status: t(`common.sync.${status}`) })}
            hint={
              info.lastSyncedAt
                ? t('settings.sync.lastSync', { time: f.relativeTime(info.lastSyncedAt) })
                : t('settings.sync.pending', { count: info.pending })
            }
          >
            <Button size="sm" variant="secondary" onClick={() => store.syncNow()}>
              {t('settings.sync.syncNow')}
            </Button>
          </Row>
          {info.url && <Row label={t('settings.sync.url')} hint={info.url} />}
          {info.space && (
            <Row
              label={t('settings.sync.space')}
              hint={<code className={s.mono}>{info.space}</code>}
            >
              <IconButton
                size="sm"
                variant="ghost"
                label={t('common.actions.copy')}
                icon={<IconCopy size={16} />}
                onClick={copySpace}
              />
            </Row>
          )}
          {info.issue && (
            <p className={s.error} role="status">
              {t('settings.sync.failed', { reason: info.issue.message })}
            </p>
          )}
          {info.locked && (
            <Row label={t('settings.sync.passphrase')} stacked>
              <UnlockForm />
            </Row>
          )}
          <Row label={t('settings.sync.disable')} hint={t('settings.sync.disabled')}>
            <Button size="sm" variant="danger-soft" onClick={disable}>
              {t('settings.sync.disable')}
            </Button>
          </Row>
        </>
      )}
    </Group>
  );
}
