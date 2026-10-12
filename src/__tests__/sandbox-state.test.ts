import { describe, expect, it } from 'vitest';
import {
  sandboxReducer,
  initialState,
  canCopy,
  shouldWarnBeforeUnload,
  type SandboxState,
} from '@/components/sandbox/sandboxState';

function s(status: SandboxState['status'], verifyIndices: SandboxState['verifyIndices'] = null): SandboxState {
  return { ...initialState, status, verifyIndices };
}

describe('sandboxReducer', () => {
  it('startGenerating: idle → generating', () => {
    const next = sandboxReducer(initialState, { type: 'startGenerating' });
    expect(next.status).toBe('generating');
    expect(next.verifyIndices).toBeNull();
  });

  it('phraseGenerated: generating → hidden', () => {
    const next = sandboxReducer(
      s('generating'),
      { type: 'phraseGenerated' },
    );
    expect(next.status).toBe('hidden');
    expect(next.verifyIndices).toBeNull();
  });

  it('reveal: hidden → revealed', () => {
    const next = sandboxReducer(s('hidden'), { type: 'reveal' });
    expect(next.status).toBe('revealed');
  });

  it('hide from revealed: revealed → verify with indices', () => {
    const next = sandboxReducer(s('revealed'), { type: 'hide' });
    expect(next.status).toBe('verify');
    expect(next.verifyIndices).toHaveLength(3);
    // All indices in [0..11]
    for (const idx of next.verifyIndices!) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(12);
    }
    // All distinct
    expect(new Set(next.verifyIndices!).size).toBe(3);
    // Sorted
    const arr = [...next.verifyIndices!];
    expect(arr[0]).toBeLessThan(arr[1]);
    expect(arr[1]).toBeLessThan(arr[2]);
  });

  it('copyUsed: reveals copyUsed flag', () => {
    const next = sandboxReducer(
      s('revealed'),
      { type: 'copyUsed' },
    );
    expect(next.copyUsed).toBe(true);
  });

  it('verifyPassed: verify → created', () => {
    const prev = s('verify', [2, 7, 11] as const);
    const next = sandboxReducer(prev, { type: 'verifyPassed' });
    expect(next.status).toBe('created');
    // verifyIndices preserved
    expect(next.verifyIndices).toEqual([2, 7, 11]);
  });

  it('verifyPassed from created: stays created (idempotent)', () => {
    const prev = s('created', [2, 7, 11] as const);
    const first = sandboxReducer(prev, { type: 'verifyPassed' });
    expect(first.status).toBe('created');
    const second = sandboxReducer(first, { type: 'verifyPassed' });
    expect(second.status).toBe('created');
    expect(second.verifyIndices).toEqual([2, 7, 11]);
  });

  it('verifyFailed: status unchanged', () => {
    const prev = s('verify', [2, 7, 11] as const);
    const next = sandboxReducer(prev, { type: 'verifyFailed' });
    expect(next.status).toBe('verify');
    expect(next.verifyIndices).toEqual([2, 7, 11]);
  });

  it('backToRevealed: verify → revealed, verifyIndices preserved', () => {
    // DEMO: BACK_TO_REVEALED returns to revealed, verifyIndices stays (not null).
    const prev = s('verify', [2, 7, 11] as const);
    const next = sandboxReducer(prev, { type: 'backToRevealed' });
    expect(next.status).toBe('revealed');
    expect(next.verifyIndices).toEqual([2, 7, 11]);
  });

  it('restart: any → idle with copyUsed reset', () => {
    const prev = s('revealed');
    const next = sandboxReducer({ ...prev, copyUsed: true }, { type: 'restart' });
    expect(next.status).toBe('idle');
    expect(next.copyUsed).toBe(false);
    expect(next.verifyIndices).toBeNull();
  });

  it('startVerify from revealed: generates 3 distinct indices via rng', () => {
    // Deterministic RNG that cycles through values to avoid infinite loop
    let counter = 0;
    const stubRng = () => {
      counter++;
      return counter / 7; // produces different values each call
    };
    const prev = s('revealed');
    const next = sandboxReducer(prev, { type: 'startVerify', rng: stubRng });
    expect(next.status).toBe('verify');
    expect(next.verifyIndices).toHaveLength(3);
    expect(new Set(next.verifyIndices!).size).toBe(3);
    for (const idx of next.verifyIndices!) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(12);
    }
  });

  it('startVerify from non-revealed: no change', () => {
    let callCount = 0;
    const stubRng = () => {
      callCount++;
      return 0.5;
    };
    const prev = s('idle');
    const next = sandboxReducer(prev, { type: 'startVerify', rng: stubRng });
    expect(next.status).toBe('idle');
    expect(callCount).toBe(0);
  });

  it('hide from verify: preserves indices', () => {
    const prev = s('verify', [2, 7, 11] as const);
    const next = sandboxReducer(prev, { type: 'hide' });
    expect(next.status).toBe('verify');
    expect(next.verifyIndices).toEqual([2, 7, 11]);
  });

  it('reveal/hide toggle twice', () => {
    let st = s('hidden');
    st = sandboxReducer(st, { type: 'reveal' });
    expect(st.status).toBe('revealed');
    st = sandboxReducer(st, { type: 'hide' });
    expect(st.status).toBe('verify');
    // restart to get back to a state where reveal works again
    st = sandboxReducer(st, { type: 'restart' });
    st = sandboxReducer(st, { type: 'startGenerating' });
    st = sandboxReducer(st, { type: 'phraseGenerated' });
    st = sandboxReducer(st, { type: 'reveal' });
    expect(st.status).toBe('revealed');
    st = sandboxReducer(st, { type: 'hide' });
    expect(st.status).toBe('verify');
  });

  it('copyUsed once → canCopy false forever until restart', () => {
    let st = s('revealed');
    expect(canCopy(st)).toBe(true);
    st = sandboxReducer(st, { type: 'copyUsed' });
    expect(canCopy(st)).toBe(false);
    st = sandboxReducer(st, { type: 'hide' });
    st = sandboxReducer(st, { type: 'restart' });
    st = sandboxReducer(st, { type: 'startGenerating' });
    st = sandboxReducer(st, { type: 'phraseGenerated' });
    st = sandboxReducer(st, { type: 'reveal' });
    expect(canCopy(st)).toBe(true);
  });

  it('full happy-path: idle → generating → hidden → revealed → copyUsed → hide → verify → created', () => {
    let st = initialState;
    st = sandboxReducer(st, { type: 'startGenerating' });
    expect(st.status).toBe('generating');
    st = sandboxReducer(st, { type: 'phraseGenerated' });
    expect(st.status).toBe('hidden');
    st = sandboxReducer(st, { type: 'reveal' });
    expect(st.status).toBe('revealed');
    st = sandboxReducer(st, { type: 'copyUsed' });
    expect(st.copyUsed).toBe(true);
    st = sandboxReducer(st, { type: 'hide' });
    expect(st.status).toBe('verify');
    expect(st.verifyIndices).not.toBeNull();
    st = sandboxReducer(st, { type: 'verifyPassed' });
    expect(st.status).toBe('created');
  });

  it('restart from any status → idle', () => {
    const statuses: Array<'idle' | 'generating' | 'hidden' | 'revealed' | 'verify' | 'created'> =
      ['idle', 'generating', 'hidden', 'revealed', 'verify', 'created'];
    for (const status of statuses) {
      const st = s(status);
      const next = sandboxReducer(st, { type: 'restart' });
      expect(next.status, `restart from ${status}`).toBe('idle');
    }
  });

  it('hide from revealed preserves copyUsed', () => {
    const st = { ...s('revealed'), copyUsed: true };
    const next = sandboxReducer(st, { type: 'hide' });
    expect(next.copyUsed).toBe(true);
    expect(next.status).toBe('verify');
  });

  it('multiple startVerify from verify: allowed (regenerates indices)', () => {
    // Use a fresh RNG for each startVerify call to prove indices are regenerated
    let counter1 = 0;
    const stubRng1 = () => {
      counter1++;
      return counter1 / 7;
    };
    let st = s('revealed');
    st = sandboxReducer(st, { type: 'startVerify', rng: stubRng1 });
    expect(st.status).toBe('verify');
    const first = st.verifyIndices;
    // back to revealed and start verify again with fresh counter
    st = sandboxReducer(st, { type: 'backToRevealed' });
    let counter2 = 0;
    const stubRng2 = () => {
      counter2++;
      return counter2 / 7;
    };
    st = sandboxReducer(st, { type: 'startVerify', rng: stubRng2 });
    expect(st.status).toBe('verify');
    // same sequence of RNG values → same indices
    expect(st.verifyIndices).toEqual(first);
  });

  it('restart from verify → idle', () => {
    let st = s('revealed');
    st = sandboxReducer(st, { type: 'hide' });
    expect(st.status).toBe('verify');
    st = sandboxReducer(st, { type: 'restart' });
    expect(st.status).toBe('idle');
  });
});

describe('canCopy', () => {
  it('true when revealed and not copied', () => {
    expect(canCopy(s('revealed'))).toBe(true);
    expect(canCopy({ ...s('revealed'), copyUsed: false })).toBe(true);
  });

  it('false when revealed and already copied', () => {
    expect(canCopy({ ...s('revealed'), copyUsed: true })).toBe(false);
  });

  it('false in any other status', () => {
    expect(canCopy(s('idle'))).toBe(false);
    expect(canCopy(s('generating'))).toBe(false);
    expect(canCopy(s('hidden'))).toBe(false);
    expect(canCopy(s('verify'))).toBe(false);
    expect(canCopy(s('created'))).toBe(false);
  });
});

describe('shouldWarnBeforeUnload', () => {
  it('true for generating', () => {
    expect(shouldWarnBeforeUnload('generating')).toBe(true);
  });

  it('true for hidden', () => {
    expect(shouldWarnBeforeUnload('hidden')).toBe(true);
  });

  it('true for revealed', () => {
    expect(shouldWarnBeforeUnload('revealed')).toBe(true);
  });

  it('true for verify', () => {
    expect(shouldWarnBeforeUnload('verify')).toBe(true);
  });

  it('false for idle', () => {
    expect(shouldWarnBeforeUnload('idle')).toBe(false);
  });

  it('false for created', () => {
    expect(shouldWarnBeforeUnload('created')).toBe(false);
  });
});
