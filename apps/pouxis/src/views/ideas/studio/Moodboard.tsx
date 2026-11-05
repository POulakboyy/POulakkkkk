/** Moodboard (5.2): drop images, read their palette, copy any colour as hex. */
import { useId, useState, type DragEvent } from 'react';
import { ideation } from '@pouxis/core';
import { useT } from '../../../i18n/index.ts';
import {
  Button,
  cx,
  IconButton,
  IconClose,
  IconCopy,
  IconImage,
  toast,
} from '../../../ui/index.ts';
import { copyText } from './clipboard.ts';
import { boardPalette, moodboard, useMoodboard, type MoodImage } from './moodboard.ts';
import { ToolHeader } from './ToolHeader.tsx';
import s from './Studio.module.css';

export function Moodboard() {
  const t = useT();
  const images = useMoodboard();
  const inputId = useId();
  const [over, setOver] = useState(false);
  const palette = boardPalette(images);

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setOver(false);
    void moodboard.add(e.dataTransfer.files);
  };

  const copyAll = async () => {
    if (await copyText(palette.join('\n'))) toast({ title: t('ideas.moodboard.copiedAll') });
  };

  return (
    <section className={s.tool} aria-labelledby="moodboard-title">
      <ToolHeader
        id="moodboard-title"
        title={t('ideas.moodboard.title')}
        hint={t('ideas.moodboard.hint')}
        action={
          palette.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              iconStart={<IconCopy />}
              onClick={() => void copyAll()}
            >
              {t('ideas.moodboard.copyAll')}
            </Button>
          ) : undefined
        }
      />
      <label
        htmlFor={inputId}
        className={cx(s.drop, over && s.dropOver)}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <IconImage size={24} />
        <span className={s.dropText}>{t('ideas.moodboard.drop')}</span>
        <span className={s.dropBrowse}>{t('ideas.moodboard.browse')}</span>
        <input
          id={inputId}
          className={s.fileInput}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            if (e.target.files) void moodboard.add(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {images.length > 0 && (
        <ul className={s.moodGrid}>
          {images.map((img) => (
            <MoodCard key={img.id} image={img} />
          ))}
        </ul>
      )}
    </section>
  );
}

function MoodCard({ image }: { image: MoodImage }) {
  const t = useT();
  return (
    <li className={s.moodCard}>
      <div className={s.moodThumb}>
        <img src={image.url} alt={image.name} loading="lazy" decoding="async" />
        <IconButton
          className={s.moodRemove}
          label={t('ideas.moodboard.remove', { name: image.name })}
          icon={<IconClose />}
          size="sm"
          variant="secondary"
          onClick={() => moodboard.remove(image.id)}
        />
      </div>
      {image.palette === 'error' ? (
        <p className={s.muted} role="alert">
          {t('ideas.moodboard.unreadable', { name: image.name })}
        </p>
      ) : (
        <ul
          className={s.swatches}
          aria-label={t('ideas.moodboard.swatches', { name: image.name })}
          aria-busy={image.palette === null}
        >
          {(image.palette ?? []).map((hex) => (
            <li key={hex}>
              <Swatch hex={hex} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Swatch({ hex }: { hex: string }) {
  const t = useT();
  const ink = ideation.readableInk(hex, ['#1c1b18', '#f6f4ef']);
  return (
    <button
      type="button"
      className={s.swatch}
      style={{ background: hex, color: ink }}
      aria-label={t('ideas.moodboard.copyHex', { hex })}
      onClick={async () => {
        if (await copyText(hex)) toast({ title: t('ideas.moodboard.copied', { hex }) });
      }}
    >
      <span className={s.swatchHex}>{hex}</span>
    </button>
  );
}
