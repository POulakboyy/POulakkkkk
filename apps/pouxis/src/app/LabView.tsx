import { Suspense, useEffect, useState, type ComponentType } from 'react';
import { useT } from '../i18n/index.ts';
import { Card, EmptyState, IconLayers, SectionHeader, Skeleton } from '../ui/index.ts';
import s from './LabView.module.css';

/** Shape exported by `src/features/lab/index.ts` (built by the lab feature owner). */
export interface LabFeature {
  id: string;
  title: string;
  description: string;
  Component: ComponentType;
}

type LabModule = { labFeatures?: readonly LabFeature[] };

/**
 * `import.meta.glob` resolves to an empty map when the lab module does not exist yet, so the
 * shell builds and runs whether or not experimental features ship in this build.
 */
const labModules = import.meta.glob<LabModule>('../features/lab/index.{ts,tsx}');

export async function loadLabFeatures(
  modules: Record<string, () => Promise<LabModule>> = labModules,
): Promise<readonly LabFeature[]> {
  const loader = Object.values(modules)[0];
  if (!loader) return [];
  try {
    const mod = await loader();
    return Array.isArray(mod.labFeatures) ? mod.labFeatures : [];
  } catch (error) {
    console.warn('[lab] could not load experimental features', error);
    return [];
  }
}

export default function LabView() {
  const t = useT();
  const [features, setFeatures] = useState<readonly LabFeature[] | null>(null);

  useEffect(() => {
    let alive = true;
    void loadLabFeatures().then((list) => {
      if (alive) setFeatures(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={s.lab}>
      <SectionHeader
        level={1}
        size="display"
        eyebrow={t('common.state.beta')}
        title={t('nav.lab')}
        subtitle={t('nav.labIntro')}
      />
      {features === null ? (
        <div className={s.grid} aria-busy="true">
          <Skeleton shape="rect" height={160} />
          <Skeleton shape="rect" height={160} />
        </div>
      ) : features.length === 0 ? (
        <EmptyState
          icon={<IconLayers size={32} />}
          title={t('nav.labEmpty')}
          description={t('nav.labEmptyHint')}
        />
      ) : (
        <ul role="list" className={s.grid}>
          {features.map(({ id, title, description, Component }) => (
            <Card as="li" key={id} variant="outlined" padding="lg" className={s.feature}>
              <h2 className={s.title}>{title}</h2>
              <p className={s.description}>{description}</p>
              <Suspense fallback={<Skeleton shape="rect" />}>
                <Component />
              </Suspense>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
