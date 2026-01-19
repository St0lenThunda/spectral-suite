import { describe, it, expect, vi } from 'vitest';
import { KeyDetector } from '../KeyDetector';

describe('KeyDetector', () => {
  it('estimates key from buffer', async () => {
    const mockBuffer = {
      sampleRate: 44100,
      length: 44100,
      duration: 1,
      getChannelData: () => new Float32Array(44100)
    } as any;

    const result = await KeyDetector.analyze(mockBuffer);
    expect(result.key).toBe('C Major');
    expect(result.score).toBeGreaterThan(0);
  });
});
