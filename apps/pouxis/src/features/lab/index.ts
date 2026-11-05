/**
 * Innovation lab (#/lab): experimental features beyond the brief, each self-contained in its own
 * folder. See docs/product/NEW_FEATURES.md for the scored candidates and why these were built.
 */
import type { ComponentType } from 'react';
import { translate, type MessageKey } from '../../i18n/index.ts';
import { store } from '../../store/index.ts';
import { BreakCoach } from './breaks/BreakCoach.tsx';
import { EnergyCheckIn } from './energy/EnergyCheckIn.tsx';
import { IntentionBuilder } from './intention/IntentionBuilder.tsx';
import { withEvidence } from './shared/Evidence.tsx';
import { ShutdownRitual } from './shutdown/ShutdownRitual.tsx';
import { WinsJar } from './wins/WinsJar.tsx';

export interface LabFeature {
  id: string;
  title: string;
  description: string;
  Component: ComponentType;
}

export type LabFeatureId = 'intention' | 'energy' | 'breaks' | 'wins' | 'shutdown';

/**
 * Title and description are getters so they follow the current locale: the shell reads them on
 * every render, and a locale change re-renders it.
 */
function feature(id: LabFeatureId, Component: ComponentType): LabFeature {
  const text = (field: 'title' | 'description') =>
    translate(store.prefs().locale, `lab.${id}.${field}` as MessageKey);
  return {
    id,
    get title() {
      return text('title');
    },
    get description() {
      return text('description');
    },
    Component: withEvidence(id, Component),
  };
}

/** In the order of a day: set an intention, check energy, pace breaks, collect wins, close. */
export const labFeatures: LabFeature[] = [
  feature('intention', IntentionBuilder),
  feature('energy', EnergyCheckIn),
  feature('breaks', BreakCoach),
  feature('wins', WinsJar),
  feature('shutdown', ShutdownRitual),
];

export { labEnergyProfile } from './energy/energy.ts';
