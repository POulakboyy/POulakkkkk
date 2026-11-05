import { useRef, useState } from 'react';
import { appActions } from '../../../app/actions.ts';
import { resetAppPrefs } from '../../../app/appPrefs.ts';
import { useT } from '../../../i18n/index.ts';
import { store } from '../../../store/index.ts';
import {
  Button,
  Dialog,
  IconShare,
  IconTrash,
  SegmentedControl,
  TextField,
  toast,
} from '../../../ui/index.ts';
import { Group, Row } from '../controls.tsx';
import type { ExportFormat } from '../export.ts';
import s from '../Settings.module.css';

function DeleteAll() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const keep = useRef<HTMLButtonElement>(null);
  const word = t('settings.data.deleteAll.confirmWord');

  const confirm = async () => {
    setBusy(true);
    try {
      await store.wipe();
      resetAppPrefs();
      toast({ id: 'wipe', title: t('settings.deleted') });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="danger-soft"
        iconStart={<IconTrash size={16} />}
        onClick={() => {
          setTyped('');
          setOpen(true);
        }}
      >
        {t('settings.data.deleteAll.action')}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        role="alertdialog"
        size="sm"
        title={t('settings.data.deleteAll.confirmTitle')}
        description={t('settings.data.deleteAll.confirmBody')}
        initialFocus={keep}
        footer={
          <>
            <Button ref={keep} variant="secondary" onClick={() => setOpen(false)}>
              {t('settings.data.deleteAll.keep')}
            </Button>
            <Button
              variant="danger"
              loading={busy}
              disabled={typed.trim() !== word}
              onClick={confirm}
            >
              {t('settings.data.deleteAll.action')}
            </Button>
          </>
        }
      >
        <TextField
          label={t('settings.data.deleteAll.confirmType', { word })}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </Dialog>
    </>
  );
}

export function DataSection() {
  const t = useT();
  const [format, setFormat] = useState<ExportFormat>('zip');
  return (
    <Group id="data" title={t('settings.sections.data')}>
      <Row label={t('settings.data.export.label')} hint={t('settings.data.export.hint')} stacked>
        <div className={s.inline}>
          <SegmentedControl<ExportFormat>
            label={t('settings.exportFormat.label')}
            size="sm"
            value={format}
            options={[
              { value: 'zip', label: t('settings.exportFormat.zip') },
              { value: 'json', label: t('settings.exportFormat.json') },
            ]}
            onChange={setFormat}
          />
          <Button
            size="sm"
            iconStart={<IconShare size={16} />}
            onClick={() => appActions.exportData(format)}
          >
            {t('settings.data.export.action')}
          </Button>
        </div>
      </Row>
      <Row label={t('settings.data.deleteAll.label')} hint={t('settings.data.deleteAll.hint')}>
        <DeleteAll />
      </Row>
    </Group>
  );
}
