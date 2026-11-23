import { beforeEach, describe, expect, it } from 'vitest';
import { useQuality } from './quality';

describe('quality tiers', () => {
  beforeEach(() => useQuality.getState().setMode('auto'));
  it('auto starts at Balanced and only steps down', () => {
    expect(useQuality.getState().tier).toBe('balanced');
    useQuality.getState().decline();
    expect(useQuality.getState().tier).toBe('lite');
    useQuality.getState().decline();
    expect(useQuality.getState().tier).toBe('lite');
  });
  it('manual tiers ignore the performance monitor', () => {
    useQuality.getState().setMode('high');
    useQuality.getState().decline();
    expect(useQuality.getState().tier).toBe('high');
  });
});
