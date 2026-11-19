import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Bot,
  CheckCircle2,
  CreditCard,
  ShieldAlert,
  ShieldCheck,
  Store,
  Wallet,
  Wifi,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Identity } from '@me2em/core';
import { CommerceEngine } from '@/lib/sandbox/commerce';
import type {
  AgentCard,
  SellerCard,
  CommerceRun,
  CommerceNegative,
  WireEvent,
} from '@/lib/sandbox/commerce';
import { fill, type CommerceCopy } from './copy';
import { Card, KvRow, OkBadge, ScopeChip, StageButton, WarnBadge } from './ui';

interface Props {
  identity: Identity | null;
  seedBytes: Uint8Array | null;
  copy: CommerceCopy;
}

type Busy = null | 'mandate' | 'call' | 'enforce';

function shorten(s: string, chars = 10): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

// Protocol role tags of the wire panel — technical, kept in English by design.
const ACTOR_LABEL: Record<WireEvent['actor'], string> = {
  agent: 'AGENT',
  seller: 'SELLER',
  facilitator: 'FACILITATOR',
};

function FlowBreadcrumb({ stage, copy }: { stage: 'idle' | 'mandate' | 'run'; copy: CommerceCopy }) {
  const reached = stage === 'idle' ? 0 : stage === 'mandate' ? 1 : 2;
  return (
    <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
      {copy.breadcrumb.map((name, i) => (
        <span
          key={name}
          className={i <= reached ? 'text-success-strong' : 'text-foreground-subtle'}
        >
          {i > 0 && <span className="mr-1 text-foreground-subtle">→</span>}
          {name}
        </span>
      ))}
    </div>
  );
}

function AgentIdentityCard({
  agent,
  sessionJti,
  copy,
}: {
  agent: AgentCard;
  sessionJti?: string;
  copy: CommerceCopy;
}) {
  const l = copy.labels;
  return (
    <Card title={copy.agentTitle} icon={<Bot size={14} />}>
      <KvRow label={l.handleAgent}>
        <code className="font-mono">{agent.handleName}</code>
      </KvRow>
      <KvRow label={l.handleId}>
        <code className="font-mono">{shorten(agent.handleId, 14)}</code>
      </KvRow>
      <KvRow label={l.mandateAudiences}>
        <span className="flex flex-wrap gap-1.5">
          {agent.mandateAudiences.map((a) => (
            <ScopeChip key={a}>{a}</ScopeChip>
          ))}
        </span>
      </KvRow>
      <KvRow label={l.mandateScopes}>
        <span className="flex flex-wrap gap-1.5">
          {agent.mandateScopes.map((s) => (
            <ScopeChip key={s}>{s}</ScopeChip>
          ))}
        </span>
      </KvRow>
      <KvRow label={l.walletIndex}>
        <code className="font-mono">{shorten(agent.walletAddress, 12)}</code>
      </KvRow>
      <KvRow label={l.walletBinding}>
        <span className="inline-flex flex-wrap gap-1.5">
          <OkBadge>
            {l.core} {agent.bindingCore ? '✓' : '✗'}
          </OkBadge>
          <OkBadge>
            {l.onCurve} {agent.bindingOnCurve ? '✓' : '✗'}
          </OkBadge>
        </span>
      </KvRow>
      {sessionJti && (
        <KvRow label={l.session}>
          <code className="font-mono">{shorten(sessionJti, 10)}</code>
        </KvRow>
      )}
      <p className="text-xs text-foreground-muted text-balance">{copy.agentNote}</p>
    </Card>
  );
}

function SellerCardView({ seller, copy }: { seller: SellerCard; copy: CommerceCopy }) {
  const l = copy.labels;
  return (
    <Card title={copy.sellerTitle} icon={<Store size={14} />}>
      <KvRow label={l.endpoint}>
        <code className="font-mono">{seller.api.replace('https://', '')}</code>
      </KvRow>
      <KvRow label={l.price}>
        <span className="font-semibold text-brand-500">
          {fill(l.priceValue, { price: seller.priceSol })}
        </span>
      </KvRow>
      <KvRow label={l.walletPayTo}>
        <code className="font-mono">{shorten(seller.walletAddress, 12)}</code>
      </KvRow>
      <KvRow label={l.origin}>
        <span className="text-foreground-muted">{seller.note}</span>
      </KvRow>
    </Card>
  );
}

function WirePanel({ wire, copy }: { wire: WireEvent[]; copy: CommerceCopy }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-background-tertiary/50 p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Wifi size={13} />
        {copy.wireTitle}
      </div>
      {wire.map((ev, i) => (
        <div key={i} className="flex items-start gap-2 font-mono text-xs leading-relaxed">
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              ev.kind === 'ok'
                ? 'bg-success/10 text-success-strong'
                : ev.kind === 'warn'
                  ? 'bg-warning/10 text-warning-strong'
                  : 'bg-background-secondary text-foreground-muted'
            }`}
          >
            {ACTOR_LABEL[ev.actor]}
          </span>
          <span className="min-w-0 text-foreground-muted break-words">
            {ev.text}
            {ev.detail && <span className="text-foreground-subtle"> · {ev.detail}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function Artifact({ title, body }: { title: string; body: unknown }) {
  if (body === null || body === undefined) return null;
  return (
    <details className="rounded-lg border border-border bg-background-tertiary/50">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground-muted">
        {title}
      </summary>
      <pre className="max-h-64 overflow-auto px-3 pb-2 font-mono text-xs text-foreground-muted">
        {JSON.stringify(body, null, 2)}
      </pre>
    </details>
  );
}

export default function ScenarioCommerce({ identity, seedBytes, copy }: Props) {
  const engineRef = useRef<CommerceEngine | null>(null);
  // Lazy init: refs are set after render, so a render-scope capture would
  // always see null — resolve the engine inside each handler instead.
  const getEngine = () => {
    if (engineRef.current === null) engineRef.current = new CommerceEngine();
    return engineRef.current;
  };
  const [stage, setStage] = useState<'idle' | 'mandate' | 'run'>('idle');
  const [agent, setAgent] = useState<AgentCard | null>(null);
  const [seller, setSeller] = useState<SellerCard | null>(null);
  const [run, setRun] = useState<CommerceRun | null>(null);
  const [negative, setNegative] = useState<CommerceNegative | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const doMandate = async () => {
    if (!identity || !seedBytes) return;
    setBusy('mandate');
    setError(null);
    try {
      const engine = getEngine();
      const card = await engine.issueMandate(identity, seedBytes);
      setAgent(card);
      setSeller(engine.getSeller());
      setRun(null);
      setNegative(null);
      setStage('mandate');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doPaidCall = async () => {
    setBusy('call');
    setError(null);
    try {
      setRun(await getEngine().paidCall());
      setStage('run');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doEnforce = async () => {
    setBusy('enforce');
    setError(null);
    try {
      setNegative(await getEngine().mandateEnforcement());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-brand-500 shrink-0">
          <CreditCard size={22} />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-semibold text-foreground">{copy.title}</h3>
          <p className="text-sm text-foreground-muted text-balance">{copy.description}</p>
        </div>
      </div>

      <FlowBreadcrumb stage={stage} copy={copy} />

      <div className="flex flex-wrap gap-3">
        <StageButton
          onClick={doMandate}
          busy={busy === 'mandate'}
          disabled={busy !== null}
          icon={<ShieldCheck size={16} />}
          label={copy.ctaMandate}
        />
        <StageButton
          onClick={doPaidCall}
          busy={busy === 'call'}
          disabled={busy !== null || stage === 'idle'}
          icon={<CreditCard size={16} />}
          label={copy.ctaPaidCall}
        />
        <StageButton
          onClick={doEnforce}
          busy={busy === 'enforce'}
          disabled={busy !== null || run === null}
          icon={<ShieldAlert size={16} />}
          label={copy.ctaEnforce}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
          <span className="text-destructive" aria-hidden="true">
            ✕
          </span>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {agent && (
        <div className="grid gap-4 xl:grid-cols-2">
          <AgentIdentityCard agent={agent} sessionJti={run?.sessionJti} copy={copy} />
          {seller && <SellerCardView seller={seller} copy={copy} />}
        </div>
      )}

      {run && (
        <div className="flex flex-col gap-3">
          <WirePanel wire={run.wire} copy={copy} />
          <div className="flex items-start gap-2 rounded-lg border border-border bg-background-tertiary/50 px-4 py-3">
            <p className="text-xs text-foreground-muted text-balance">{copy.simNote}</p>
          </div>
          <Artifact title={copy.artifactPaymentRequired} body={run.artifacts?.paymentRequired} />
          <Artifact title={copy.artifactPaymentPayload} body={run.artifacts?.paymentPayload} />
          <Artifact title={copy.artifactSettlement} body={run.artifacts?.settlement} />
          <Artifact title={copy.artifactResource} body={run.artifacts?.resource} />
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <BadgeCheck size={14} className="text-success-strong shrink-0" />
            <span>
              {fill(copy.receipt, {
                tx: shorten(run.artifacts?.txRef ?? '', 12),
                amount: run.artifacts?.settlement?.amount ?? '',
              })}
            </span>
          </div>
        </div>
      )}

      {negative && (
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <span className="mt-0.5 text-success-strong shrink-0">
            <CheckCircle2 size={16} />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              {fill(copy.negativeTitle, { status: negative.status })}
            </p>
            <p className="text-xs text-foreground-muted">{negative.reason}</p>
            <p className="text-xs text-foreground-muted text-balance">{copy.negativeDetail2}</p>
          </div>
        </div>
      )}

      {agent && !run && (
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Wallet size={14} />
          <span>{copy.hint}</span>
        </div>
      )}
    </div>
  );
}
