import { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Dumbbell,
  Home,
  Key,
  Mail,
  Radio,
  Wallet,
} from 'lucide-react';
import type { Identity } from '@me2em/core';
import {
  HumanEngine,
  CONTEXT_ORDER,
  type HumanRootIdentity,
  type HumanHandleInfo,
  type ContextName,
} from '@/lib/sandbox/human';
import { fill, type HumanCopy } from './copy';
import {
  KeyGroup,
  KeyRow,
  NegativeCard,
  ScenarioFooter,
  ScenarioHeader,
  ScenarioNote,
  StageButton,
} from './ui';

interface Props {
  identity: Identity | null;
  seedBytes: Uint8Array | null;
  copy: HumanCopy;
}

const CONTEXT_ICON: Record<ContextName, typeof Briefcase> = {
  work: Briefcase,
  family: Home,
  gym: Dumbbell,
};

function HandleCard({ ctx, copy }: { ctx: HumanHandleInfo; copy: HumanCopy }) {
  const [expanded, setExpanded] = useState(false);
  const { labels } = copy;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background-secondary p-4">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background-tertiary text-xl"
          aria-hidden="true"
        >
          {ctx.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">
            {ctx.displayName}
          </div>
          <div className="truncate text-xs text-foreground-muted">{ctx.nickname}</div>
        </div>
        <span className="rounded-full border border-border bg-background-tertiary px-2.5 py-1 font-mono text-xs text-foreground-muted">
          {ctx.name}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label={labels.toggleKeys}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground-muted transition-colors hover:border-brand-500 hover:text-foreground"
        >
          {expanded ? labels.collapse : labels.expand}
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
        <Mail size={12} />
        {ctx.email}
      </div>

      {/* Group 1 — Handle keys. The private key hides behind the toggle. */}
      <KeyGroup>
        <KeyRow label={labels.handleId} value={ctx.handleId} copyAria={labels.copyValue} />
        <KeyRow label={labels.publicKey} value={ctx.pubKeyHex} copyAria={labels.copyValue} />
        {expanded && (
          <KeyRow
            label={labels.privateKey}
            value={ctx.privKeyHex}
            copyAria={labels.copyValue}
            red
          />
        )}
      </KeyGroup>

      {/* Group 2 — deterministic wallet derived from the same seed. */}
      <KeyGroup>
        <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <Wallet size={11} />
          {labels.wallet}
        </span>
        <KeyRow label={labels.address} value={ctx.wallet.address} copyAria={labels.copyValue} />
        <span className="font-mono text-xs text-foreground-subtle">
          {ctx.wallet.derivationPath}
        </span>
        {expanded && (
          <KeyRow
            label={labels.walletPrivateKey}
            value={ctx.wallet.privateKeyBase58}
            copyAria={labels.copyValue}
            red
          />
        )}
      </KeyGroup>

      {/* Group 3 — the context's service passwords and the E2EE channel key. */}
      <KeyGroup>
        <KeyRow
          label={fill(labels.passwordFor, { value: ctx.email })}
          value={ctx.passwords.email}
          copyAria={labels.copyValue}
        />
        <KeyRow
          label={fill(labels.passwordFor, { value: 'Google' })}
          value={ctx.passwords.google}
          copyAria={labels.copyValue}
        />
        <KeyRow
          label={fill(labels.passwordFor, { value: 'Github' })}
          value={ctx.passwords.github}
          copyAria={labels.copyValue}
        />
        <KeyRow
          label={fill(labels.channelKeyFor, { value: ctx.name })}
          value={ctx.channelKeyHex}
          copyAria={labels.copyValue}
        />
      </KeyGroup>
    </div>
  );
}

function FlowBreadcrumb({ created }: { created: ContextName[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
      {CONTEXT_ORDER.map((name, i) => (
        <span
          key={name}
          className={
            i < created.length
              ? 'text-success-strong'
              : 'text-foreground-subtle'
          }
        >
          {i > 0 && <span className="mr-1 text-foreground-subtle">→</span>}
          {name}
        </span>
      ))}
    </div>
  );
}

export default function ScenarioHuman({ identity, seedBytes, copy }: Props) {
  const engineRef = useRef<HumanEngine | null>(null);
  const getEngine = () => {
    if (engineRef.current === null) engineRef.current = new HumanEngine();
    return engineRef.current;
  };
  const [root, setRoot] = useState<HumanRootIdentity | null>(null);
  const [contexts, setContexts] = useState<HumanHandleInfo[]>([]);
  const [busy, setBusy] = useState<ContextName | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const created: ContextName[] = contexts.map((c) => c.name as ContextName);
  // Progressive reveal: only the NEXT handle in line has a button —
  // work first, then family, then gym.
  const next = CONTEXT_ORDER.find((name) => !created.includes(name)) ?? null;

  const createNext = async (name: ContextName) => {
    if (!identity || !seedBytes) return;
    setBusy(name);
    setError(null);
    try {
      const engine = getEngine();
      if (root === null) {
        setRoot(await engine.init(identity, seedBytes));
      }
      const ctx = await engine.deriveContext(name);
      setContexts((prev) => [...prev, ctx]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <ScenarioHeader
        icon={<CheckCircle2 size={20} />}
        title={copy.title}
        description={copy.description}
      />

      <FlowBreadcrumb created={created} />

      {next && (
        <StageButton
          onClick={() => createNext(next)}
          busy={busy !== null}
          icon={
            (() => {
              const Icon = CONTEXT_ICON[next];
              return <Icon size={16} />;
            })()
          }
          label={copy.cta[next]}
        />
      )}

      {next === 'family' && <ScenarioNote text={copy.noteFamily} />}
      {next === 'gym' && <ScenarioNote text={copy.noteGym} />}

      {error && <NegativeCard text={error} />}

      {contexts.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {contexts.map((ctx) => (
            <HandleCard key={ctx.name} ctx={ctx} copy={copy} />
          ))}
        </div>
      )}

      {contexts.length > 0 && (
        <ScenarioFooter icon={<Radio size={14} />}>
          {copy.footerRoot}{' '}
          <code className="font-mono">{(root?.pubKeyHex ?? '').slice(0, 24)}…</code>
        </ScenarioFooter>
      )}

      {!next && contexts.length > 0 && (
        <ScenarioFooter icon={<Key size={14} />}>{copy.footerDone}</ScenarioFooter>
      )}
    </div>
  );
}
