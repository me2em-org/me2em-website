import { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import {
  Me2emProvider,
  useCreateIdentity,
} from '@me2em/react';

// DEMO: verification indices — change together with verifyPrompt strings.
// The sandbox verifies words at positions 3, 8, 12 (1-based) = [2, 7, 11] (0-based).
const VERIFY_INDICES: readonly [number, number, number] = [2, 7, 11];

export interface SeedCopy {
  badge: string;
  heading: string;
  lead: string;
  ctaStart: string;
  generating: string;
  disclaimer: string;
  copied: string;
  verifyTitle: string;
  verifyRetry: string;
  bornTitle: string;
  bornText: string;
  nextLabel: string;
  nextHuman: string;
  nextIot: string;
  nextAgent: string;
  restart: string;
  panelHidden: string;
  panelRevealed: string;
  afterCopy: string;
  retryButton: string;
  revealButton: string;
  hideButton: string;
  copyAllButton: string;
  verifyPrompt: string;
  verifyWordLabel: string;
  verifyPlaceholder: string;
  verifyConfirm: string;
  verifyError: string;
  verifySeeAgain: string;
}

type PanelState = 'idle' | 'generating' | 'hidden' | 'revealed' | 'copied' | 'verify' | 'created';

import {
  sandboxReducer,
  initialState,
  canCopy,
  shouldWarnBeforeUnload,
  type SandboxStatus,
} from './sandboxState';

function MaskedWordBadge({ index }: { index: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-background-tertiary border border-border px-3 py-1.5 text-xs font-mono text-foreground-muted">
      <span className="text-foreground-subtle font-semibold">{index + 1}.</span>
      <span>••••••••</span>
    </span>
  );
}

function RevealedWordBadge({ index, word }: { index: number; word: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-background-tertiary border border-border px-3 py-1.5 text-xs font-mono text-foreground">
      <span className="text-foreground-subtle font-semibold">{index + 1}.</span>
      <span>{word}</span>
    </span>
  );
}

function MentorPanel({
  state,
  words,
  seed,
  onReveal,
  onCopyAll,
  onHide,
  onGenerate,
}: {
  state: PanelState;
  words: string[] | null;
  seed: SeedCopy;
  onReveal: () => void;
  onCopyAll: () => void;
  onHide: () => void;
  onGenerate: () => void;
}) {
  const isHidden = state === 'hidden';
  const isRevealed = state === 'revealed';
  const isCopied = state === 'copied';
  const isCreated = state === 'created';
  const isGenerating = state === 'generating';
  const isIdle = state === 'idle';

  // Button labels come from i18n — never hardcode component defaults.
  const buttonClasses =
    'rounded-md border border-border bg-background hover:bg-background-secondary px-4 py-2 text-sm font-medium transition-colors';

  return (
    <div
      className={`w-full max-w-2xl mx-auto rounded-xl border p-5 transition-colors ${
        isCreated
          ? 'border-[var(--success-light)] bg-[var(--success-light)]/30'
          : 'border-border bg-background-secondary'
      }`}
      role="status"
      aria-live="polite"
    >
      {isIdle && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-foreground-muted shrink-0 mt-0.5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 9v4" />
                <path d="M10.363 3.591l-8.106 13.53a1.001 1.001 0 00.84 1.499h16.212a1.001 1.001 0 00.84-1.499L13.636 3.59a1.001 1.001 0 00-1.68 0z" />
              </svg>
              <p className="text-sm text-foreground-muted text-balance">{seed.disclaimer}</p>
            </div>
          </div>
          <button
            onClick={onGenerate}
            className="self-center rounded-md bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 font-medium transition-colors"
          >
            {seed.ctaStart}
          </button>
        </div>
      )}

      {isGenerating && (
        <p className="text-foreground-muted text-center">{seed.generating}</p>
      )}

      {isHidden && words && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground text-balance">{seed.panelHidden}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {words.map((_, i) => (
              <MaskedWordBadge key={i} index={i} />
            ))}
          </div>
          <button
            onClick={onReveal}
            className="self-center rounded-md bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 font-medium transition-colors"
          >
            {seed.revealButton}
          </button>
        </div>
      )}

      {isRevealed && words && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground text-balance">{seed.panelRevealed}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {words.map((word, i) => (
              <RevealedWordBadge key={i} index={i} word={word} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={onCopyAll}
              className={buttonClasses}
            >
              {seed.copyAllButton}
            </button>
            <button
              onClick={onHide}
              className={buttonClasses}
            >
              {seed.hideButton}
            </button>
          </div>
        </div>
      )}

      {isCopied && words && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground text-balance">{seed.panelRevealed}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {words.map((word, i) => (
              <RevealedWordBadge key={i} index={i} word={word} />
            ))}
          </div>
          <div className="flex flex-col gap-2 items-center">
            <p className="text-sm font-medium text-foreground">{seed.copied}</p>
            <p className="text-sm text-foreground-muted">{seed.afterCopy}</p>
            <button
              onClick={onHide}
              className={buttonClasses}
            >
              {seed.hideButton}
            </button>
          </div>
        </div>
      )}

      {isCreated && (
        <div className="flex flex-col gap-3 text-center">
          <h3 className="text-xl font-display font-bold text-foreground">
            {seed.bornTitle}
          </h3>
          <p className="text-sm text-foreground-muted text-balance">{seed.bornText}</p>
        </div>
      )}
    </div>
  );
}

function VerifyForm({
  realWords,
  onVerified,
  onError,
  onSeeAgain,
  seed,
}: {
  realWords: string[];
  onVerified: () => void;
  onError: () => void;
  onSeeAgain: () => void;
  seed: SeedCopy;
}) {
  // DEMO: verification indices — change together with verifyPrompt strings.
  const [inputs, setInputs] = useState<string[]>(['', '', '']);
  const [errorShown, setErrorShown] = useState(false);

  const expected = VERIFY_INDICES.map(i => realWords[i].toLowerCase());

  const handleChange = (idx: number, value: string) => {
    setInputs(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleConfirm = () => {
    const trimmed = inputs.map(i => i.trim().toLowerCase());
    const allFilled = trimmed.every(Boolean);
    if (!allFilled) return;

    const match = trimmed.every((v, i) => v === expected[i]);
    if (match) {
      onVerified();
    } else {
      setErrorShown(true);
      onError();
    }
  };

  const handleSeeAgain = () => {
    onSeeAgain();
  };

  const isDisabled = inputs.some(i => !i.trim());

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl">
      <p className="text-center text-sm text-foreground-muted">
        {seed.verifyPrompt}
      </p>

      <div className="flex flex-col gap-3">
        {VERIFY_INDICES.map((wordIdx, inputIdx) => {
          const padded = String(wordIdx + 1).padStart(2, '0');
          const label = seed.verifyWordLabel.replace('{n}', padded);
          const isCorrect = inputs[inputIdx]?.trim().toLowerCase() === expected[inputIdx];
          return (
            <div key={inputIdx} className="flex flex-col gap-1">
              <label className="text-xs text-foreground-muted font-mono">
                {label}
              </label>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={seed.verifyPlaceholder}
                value={inputs[inputIdx]}
                onChange={e => handleChange(inputIdx, e.target.value)}
                className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm font-mono focus:border-brand-500 transition-colors outline-none"
              />
              {isCorrect && inputs[inputIdx].trim() && (
                <div className="flex items-center gap-1 text-[var(--success)]">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {errorShown && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
          <svg className="h-5 w-5 text-destructive shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-destructive">{seed.verifyError}</p>
        </div>
      )}

      <div className="flex flex-col gap-2 items-center">
        <button
          onClick={handleConfirm}
          disabled={isDisabled}
          className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 text-sm font-medium transition-colors"
        >
          {seed.verifyConfirm}
        </button>
        <button
          onClick={handleSeeAgain}
          className="text-sm text-foreground-muted hover:text-foreground underline underline-offset-2 transition-colors"
        >
          {seed.verifySeeAgain}
        </button>
      </div>
    </div>
  );
}

function SeedIslandInner({ seed: seedCopy }: { seed: SeedCopy }) {
  const { status: hookStatus, seedWords, generate, reset, confirmWords } = useCreateIdentity();
  const [state, dispatch] = useReducer(sandboxReducer, initialState);
  const [generatedWords, setGeneratedWords] = useState<string[] | null>(null);
  const copyRef = useRef(false);
  const confirmCalledRef = useRef(false);

  // Derive PanelState from sandbox state: 'revealed' + copyUsed → 'copied'
  function panelState(status: SandboxStatus): PanelState {
    if (status === 'revealed' && state.copyUsed) return 'copied';
    return status;
  }

  // beforeunload guard when not idle
  useEffect(() => {
    if (shouldWarnBeforeUnload(state.status)) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        (e as unknown as { returnValue: string }).returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [state.status]);

  // Track hook status transitions
  useEffect(() => {
    if (hookStatus === 'seed-generated' && seedWords && !confirmCalledRef.current) {
      setGeneratedWords(seedWords);
      dispatch({ type: 'phraseGenerated' });
      copyRef.current = false;
    }
  }, [hookStatus, seedWords]);

  useEffect(() => {
    if (hookStatus === 'ready') {
      confirmCalledRef.current = true;
      dispatch({ type: 'verifyPassed' });
    }
  }, [hookStatus]);

  const handleGenerate = useCallback(() => {
    dispatch({ type: 'startGenerating' });
    confirmCalledRef.current = false;
    generate();
  }, [generate]);

  const handleReveal = useCallback(() => {
    dispatch({ type: 'reveal' });
  }, []);

  const handleCopyAll = useCallback(() => {
    if (!copyRef.current && generatedWords && canCopy(state)) {
      copyRef.current = true;
      navigator.clipboard.writeText(generatedWords.join(' ')).catch(() => {});
      dispatch({ type: 'copyUsed' });
    }
  }, [generatedWords, state]);

  const handleHide = useCallback(() => {
    dispatch({ type: 'hide' });
  }, []);

  const handleVerified = useCallback(async () => {
    if (!confirmCalledRef.current) {
      confirmCalledRef.current = true;
      await confirmWords();
    }
  }, [confirmWords]);

  const handleVerifyError = useCallback(() => {
    dispatch({ type: 'verifyFailed' });
  }, []);

  const handleBackToRevealed = useCallback(() => {
    dispatch({ type: 'backToRevealed' });
  }, []);

  const handleRestart = useCallback(() => {
    reset();
    dispatch({ type: 'restart' });
    setGeneratedWords(null);
    copyRef.current = false;
    confirmCalledRef.current = false;
  }, [reset]);

  const panel = panelState(state.status);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto py-8">
      <MentorPanel
        state={panel}
        words={generatedWords}
        seed={seedCopy}
        onReveal={handleReveal}
        onCopyAll={handleCopyAll}
        onHide={handleHide}
        onGenerate={handleGenerate}
      />

      {panel === 'verify' && generatedWords && state.verifyIndices && (
        <VerifyForm
          realWords={generatedWords}
          onVerified={handleVerified}
          onError={handleVerifyError}
          onSeeAgain={handleBackToRevealed}
          seed={seedCopy}
        />
      )}

      {panel === 'created' && (
        <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-3xl font-display font-bold text-foreground text-center">
              {seedCopy.bornTitle}
            </h2>
            <p className="max-w-xl text-foreground-muted text-balance">{seedCopy.bornText}</p>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            <span className="text-sm font-bold text-brand-500">{seedCopy.nextLabel}</span>
            <div className="grid gap-4 sm:grid-cols-3 w-full">
              <div aria-disabled="true" className="opacity-60 cursor-not-allowed rounded-xl border border-border bg-background-tertiary p-5">
                <h3 className="font-display text-base font-semibold text-foreground">
                  {seedCopy.nextHuman}
                </h3>
              </div>
              <div aria-disabled="true" className="opacity-60 cursor-not-allowed rounded-xl border border-border bg-background-tertiary p-5">
                <h3 className="font-display text-base font-semibold text-foreground">
                  {seedCopy.nextIot}
                </h3>
              </div>
              <div aria-disabled="true" className="opacity-60 cursor-not-allowed rounded-xl border border-border bg-background-tertiary p-5">
                <h3 className="font-display text-base font-semibold text-foreground">
                  {seedCopy.nextAgent}
                </h3>
              </div>
            </div>
          </div>

          <button
            onClick={handleRestart}
            className="text-sm text-foreground-muted hover:text-foreground underline underline-offset-2 transition-colors"
          >
            {seedCopy.restart}
          </button>
        </div>
      )}
    </div>
  );
}

let nextKey = 0;

export default function SeedIsland({ seed }: { seed: SeedCopy }) {
  const [key] = useState(++nextKey);

  return (
    <Me2emProvider key={key}>
      <SeedIslandInner seed={seed} />
    </Me2emProvider>
  );
}
