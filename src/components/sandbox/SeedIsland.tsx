import { useState, useCallback, useEffect, useRef, useReducer, useMemo } from 'react';
import {
  Me2emProvider,
  useCreateIdentity,
} from '@me2em/react';

/**
 * Parse raw paper text into a list of words, stripping numbered prefixes
 * and punctuation.  Returns at most 12 words; returns [] when the text
 * contains no real words (only numbers or whitespace).
 */
export function parsePaperWords(raw: string): string[] {
  // Split on whitespace, newlines, tabs, and common punctuation.
  const tokens = raw
    .replace(/[\r\n\t]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const words: string[] = [];
  for (const token of tokens) {
    // Strip leading number+dot patterns like "1.", "2.", etc.
    const stripped = token.replace(/^\d+\.\s*/, '');
    if (!stripped) continue;
    // Skip tokens that are pure numbers.
    if (/^\d+$/.test(stripped)) continue;
    // Strip trailing punctuation.
    const clean = stripped.replace(/[.,;:!?"'(){}[\]]+$/g, '');
    if (!clean) continue;
    words.push(clean);
    if (words.length >= 12) break;
  }
  return words;
}

export interface SeedCopy {
  badge: string;
  heading: string;
  lead: string;
  ctaStart: string;
  generating: string;
  disclaimer: string;
  copied: string;
  panelHidden: string;
  panelRevealed: string;
  revealButton: string;
  hideButton: string;
  copyAllButton: string;
  paperTitle: string;
  paperPasteHint: string;
  paperNote: string;
  verifyPrompt: string;
  verifyWordLabel: string;
  verifyPlaceholder: string;
  verifyConfirm: string;
  verifyError: string;
  verifySeeAgain: string;
  paperMissing: string;
  paperBadgeHint: string;
  bornTitle: string;
  bornText: string;
  createdSequence: string;
  nextLabel: string;
  nextHuman: string;
  nextIot: string;
  nextAgent: string;
  restart: string;
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

function PaperWordBadge({
  index,
  word,
  onClick,
}: {
  index: number;
  word: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Word ${index + 1}: ${word}`}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-background-tertiary border border-border px-3 py-1.5 text-xs font-mono text-foreground hover:border-brand-500 hover:bg-background-secondary transition-colors cursor-pointer"
    >
      <span className="text-foreground-subtle font-semibold">{index + 1}.</span>
      <span>{word}</span>
    </button>
  );
}

function PaperBlock({
  title,
  note,
  value,
  onChange,
}: {
  title: string;
  note?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-2 p-4 rounded-lg border border-border bg-background-tertiary/50">
      <p className="text-sm text-foreground-muted text-center">{title}</p>
      {note && <p className="text-sm text-foreground-muted text-balance">{note}</p>}
      <textarea
        rows={4}
        aria-label={title}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm font-mono focus:border-brand-500 transition-colors outline-none resize-y"
      />
    </div>
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
  paperText,
  onPaperChange,
}: {
  state: PanelState;
  words: string[] | null;
  seed: SeedCopy;
  onReveal: () => void;
  onCopyAll: () => void;
  onHide: () => void;
  onGenerate: () => void;
  paperText: string;
  onPaperChange: (v: string) => void;
}) {
  const isHidden = state === 'hidden';
  const isRevealed = state === 'revealed';
  const isCopied = state === 'copied';
  const isGenerating = state === 'generating';
  const isIdle = state === 'idle';

  // Button labels come from i18n — never hardcode component defaults.
  const buttonClasses =
    'rounded-md border border-border bg-background hover:bg-background-secondary px-4 py-2 text-sm font-medium transition-colors';

  return (
    <div
      className={`w-full max-w-2xl mx-auto rounded-xl border p-5 transition-colors ${
        'border-border bg-background-secondary'
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
            <button
              onClick={onHide}
              className={buttonClasses}
            >
              {seed.hideButton}
            </button>
          </div>
          <PaperBlock
            title={seed.paperTitle + (paperText.trim() ? '' : ' ' + seed.paperPasteHint)}
            note={seed.paperNote}
            value={paperText}
            onChange={onPaperChange}
          />
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
  verifyIndices,
  paperText,
  onPaperChange,
}: {
  realWords: string[];
  onVerified: () => void;
  onError: () => void;
  onSeeAgain: () => void;
  seed: SeedCopy;
  verifyIndices: readonly [number, number, number];
  paperText: string;
  onPaperChange: (v: string) => void;
}) {
  const [inputs, setInputs] = useState<string[]>(['', '', '']);
  const [errorShown, setErrorShown] = useState(false);
  const [focusedInput, setFocusedInput] = useState<number | null>(null);

  const expected = verifyIndices.map(i => realWords[i].toLowerCase());

  const dynamicPrompt = seed.verifyPrompt
    .replace('{a}', String(verifyIndices[0] + 1))
    .replace('{b}', String(verifyIndices[1] + 1))
    .replace('{c}', String(verifyIndices[2] + 1));

  const paperWords = useMemo(() => parsePaperWords(paperText), [paperText]);
  const hasPaper = paperWords.length >= 12;

  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  const handleBadgeClick = (word: string) => {
    setInputs((prev) => {
      const next = [...prev];
      const target = focusedInput !== null && !next[focusedInput] ? focusedInput : next.findIndex((v) => !v.trim());
      if (target === -1) return prev;
      next[target] = word;
      return next;
    });
    const nextEmpty = inputs.findIndex((v, i) => !v.trim() && i !== focusedInput);
    if (nextEmpty !== -1) inputRefs.current[nextEmpty]?.focus();
  };

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
        {dynamicPrompt}
      </p>

      {hasPaper ? (
        <>
          <p className="text-center text-sm text-foreground-muted">{seed.paperBadgeHint}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {paperWords.map((word, i) => (
              <PaperWordBadge key={i} index={i} word={word} onClick={() => handleBadgeClick(word)} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-background-tertiary/50 px-4 py-3">
          <svg className="h-5 w-5 text-foreground-muted shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-foreground text-balance">{seed.paperMissing}</p>
        </div>
      )}

      {hasPaper && (
        <div className="flex flex-col gap-3">
          {verifyIndices.map((wordIdx, inputIdx) => {
            const padded = String(wordIdx + 1).padStart(2, '0');
            const label = seed.verifyWordLabel.replace('{n}', padded);
            const isCorrect = inputs[inputIdx]?.trim().toLowerCase() === expected[inputIdx];
            return (
              <div key={inputIdx} className="flex flex-col gap-1">
                <label className="text-xs text-foreground-muted font-mono">
                  {label}
                </label>
                <input
                  ref={el => { inputRefs.current[inputIdx] = el; }}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={seed.verifyPlaceholder}
                  value={inputs[inputIdx]}
                  onChange={e => handleChange(inputIdx, e.target.value)}
                  onFocus={() => setFocusedInput(inputIdx)}
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
      )}

      {hasPaper && errorShown && (
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
        {hasPaper && (
          <button
            onClick={handleConfirm}
            disabled={isDisabled}
            className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 text-sm font-medium transition-colors"
          >
            {seed.verifyConfirm}
          </button>
        )}
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
  const [paperText, setPaperText] = useState('');
  const copyRef = useRef(false);
  const confirmCalledRef = useRef(false);

  const handlePaperChange = useCallback((v: string) => setPaperText(v), []);

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
    if (hookStatus === 'ready' || hookStatus === 'verified') {
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

  const handleVerified = useCallback(() => {
    dispatch({ type: 'verifyPassed' });
    if (!confirmCalledRef.current) {
      confirmCalledRef.current = true;
      confirmWords().catch((e) => console.warn('[sandbox] confirmWords:', e));
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
    setPaperText('');
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
        paperText={paperText}
        onPaperChange={handlePaperChange}
      />

      {panel === 'verify' && generatedWords && state.verifyIndices && (
        <VerifyForm
          realWords={generatedWords}
          onVerified={handleVerified}
          onError={handleVerifyError}
          onSeeAgain={handleBackToRevealed}
          seed={seedCopy}
          verifyIndices={state.verifyIndices!}
          paperText={paperText}
          onPaperChange={handlePaperChange}
        />
      )}

      {panel === 'created' && (
        <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-3xl font-display font-bold text-foreground text-center">
              {seedCopy.bornTitle}
            </h2>
            <p className="max-w-xl text-foreground-muted text-balance">
              {seedCopy.bornText}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            <span className="text-sm font-bold text-brand-500">{seedCopy.nextLabel}</span>
            <div className="grid gap-4 sm:grid-cols-3 w-full">
              <div aria-disabled="true" className="flex flex-col items-center gap-3 text-center rounded-xl border border-border bg-background-tertiary p-5 opacity-60 cursor-not-allowed">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 text-brand-500 shrink-0">
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="11" r="5" />
                  </svg>
                </span>
                <h3 className="font-display text-base font-semibold text-foreground">
                  {seedCopy.nextHuman}
                </h3>
              </div>
              <div aria-disabled="true" className="flex flex-col items-center gap-3 text-center rounded-xl border border-border bg-background-tertiary p-5 opacity-60 cursor-not-allowed">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 text-brand-500 shrink-0">
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 7 9 3 5 7l4 4" />
                    <path d="m17 11 4 4-4 4-4-4" />
                    <path d="m8 12 4 4 6-6-4-4Z" />
                    <path d="m16 8 3-3" />
                    <path d="M9 21a6 6 0 0 0-6-6" />
                  </svg>
                </span>
                <h3 className="font-display text-base font-semibold text-foreground">
                  {seedCopy.nextIot}
                </h3>
              </div>
              <div aria-disabled="true" className="flex flex-col items-center gap-3 text-center rounded-xl border border-border bg-background-tertiary p-5 opacity-60 cursor-not-allowed">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 text-brand-500 shrink-0">
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4H8" />
                    <rect width="16" height="12" x="4" y="8" rx="2" />
                    <path d="M2 14h2" />
                    <path d="M20 14h2" />
                    <path d="M15 13v2" />
                    <path d="M9 13v2" />
                  </svg>
                </span>
                <h3 className="font-display text-base font-semibold text-foreground">
                  {seedCopy.nextAgent}
                </h3>
              </div>
            </div>
          </div>

          {/* Destructive action kept below the cards, not as a peer tile. */}
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
