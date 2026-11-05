import { describe, expect, it } from 'vitest';
import * as scheduler from './index.ts';

describe('scheduler public API', () => {
  it('exposes every engine function', () => {
    expect(Object.keys(scheduler).sort()).toEqual([
      'bufferLengthMs',
      'checkMakerSchedule',
      'compareSnapshots',
      'formatDuration',
      'insertBuffers',
      'largestFocusBlock',
      'magnetize',
      'periodBounds',
      'progress',
      'propagateDelay',
      'route',
      'snapshot',
      'suggestAlternatives',
    ]);
  });
});
