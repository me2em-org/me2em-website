export type SandboxStatus =
  | 'idle'
  | 'generating'
  | 'hidden'
  | 'revealed'
  | 'verify'
  | 'created';

export interface SandboxState {
  status: SandboxStatus;
  copyUsed: boolean;
  verifyIndices: readonly [number, number, number] | null;
}

export type SandboxAction =
  | { type: 'startGenerating' }
  | { type: 'phraseGenerated' }
  | { type: 'reveal' }
  | { type: 'hide' }
  | { type: 'copyUsed' }
  | { type: 'startVerify'; rng: () => number }
  | { type: 'verifyPassed' }
  | { type: 'verifyFailed' }
  | { type: 'backToRevealed' }
  | { type: 'restart' };

export const initialState: SandboxState = {
  status: 'idle',
  copyUsed: false,
  verifyIndices: null,
};

export function canCopy(state: SandboxState): boolean {
  return state.status === 'revealed' && !state.copyUsed;
}

export function shouldWarnBeforeUnload(status: SandboxStatus): boolean {
  return (
    status === 'generating' ||
    status === 'hidden' ||
    status === 'revealed' ||
    status === 'verify'
  );
}

function pickThreeDistinct(rng: () => number): [number, number, number] {
  const used = new Set<number>();
  const result: number[] = [];
  while (result.length < 3) {
    const n = Math.floor(rng() * 12);
    if (used.has(n)) continue;
    used.add(n);
    result.push(n);
  }
  result.sort((a, b) => a - b);
  return result as [number, number, number];
}

/** Crypto-backed RNG for hide-from-revealed flow. Testable via startVerify. */
function cryptoRng(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / (0xffffffff + 1);
}

export function sandboxReducer(
  state: SandboxState,
  action: SandboxAction,
): SandboxState {
  switch (action.type) {
    case 'startGenerating':
      return { status: 'generating', copyUsed: false, verifyIndices: null };

    case 'phraseGenerated':
      return { status: 'hidden', copyUsed: false, verifyIndices: null };

    case 'reveal':
      return state.status === 'hidden'
        ? { ...state, status: 'revealed' }
        : state;

    case 'hide': {
      if (state.status === 'revealed') {
        return {
          status: 'verify',
          copyUsed: state.copyUsed,
          verifyIndices: pickThreeDistinct(cryptoRng),
        };
      }
      if (state.status === 'verify') {
        return { ...state, status: 'verify', verifyIndices: state.verifyIndices };
      }
      return state;
    }

    case 'copyUsed':
      return state.status === 'revealed'
        ? { ...state, copyUsed: true }
        : state;

    case 'startVerify': {
      if (state.status !== 'revealed') return state;
      return {
        ...state,
        status: 'verify',
        verifyIndices: pickThreeDistinct(action.rng),
      };
    }

    case 'verifyPassed':
      return { status: 'created', copyUsed: false, verifyIndices: state.verifyIndices };

    case 'verifyFailed':
      return state;

    case 'backToRevealed':
      return state.status === 'verify'
        ? { ...state, status: 'revealed' }
        : state;

    case 'restart':
      return initialState;

    default:
      return state;
  }
}
