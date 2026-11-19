import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BatteryCharging,
  CheckCircle2,
  PlugZap,
  RadioTower,
  ShieldCheck,
  ShieldOff,
  WifiOff,
  XCircle,
} from 'lucide-react';
import type { Identity } from '@me2em/core';
import { EvEngine } from '@/lib/sandbox/ev';
import type { EvStation, EvConnector, EvCharge, EvRevokeResult } from '@/lib/sandbox/ev';
import { fill, type EvCopy } from './copy';
import { Card, KvRow, OkBadge, ScopeChip, StageButton, WarnBadge } from './ui';

interface Props {
  identity: Identity | null;
  copy: EvCopy;
}

type Busy = null | 'provision' | 'ccs' | 'type2' | 'charge' | 'revoke';

function shorten(s: string, chars = 10): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

function FlowBreadcrumb({ stage, copy }: { stage: number; copy: EvCopy }) {
  return (
    <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
      {copy.breadcrumb.map((name, i) => (
        <span
          key={name}
          className={i <= stage ? 'text-success-strong' : 'text-foreground-subtle'}
        >
          {i > 0 && <span className="mr-1 text-foreground-subtle">→</span>}
          {name}
        </span>
      ))}
    </div>
  );
}

function StationCard({ station, copy }: { station: EvStation; copy: EvCopy }) {
  const l = copy.labels;
  return (
    <Card title={copy.stationTitle} icon={<RadioTower size={14} />}>
      <KvRow label={l.handleId}>
        <code className="font-mono">{shorten(station.handleId, 14)}</code>
      </KvRow>
      <KvRow label={l.attestedBy}>
        <OkBadge>{fill(l.attestedBadge, { jti: shorten(station.attestationJti, 8) })}</OkBadge>
      </KvRow>
      <KvRow label={l.grantAudiences}>
        <span className="flex flex-wrap gap-1.5">
          {station.grantAudiences.map((a) => (
            <ScopeChip key={a}>{a}</ScopeChip>
          ))}
        </span>
      </KvRow>
      <KvRow label={l.grantScopes}>
        <span className="flex flex-wrap gap-1.5">
          {station.grantScopes.map((s) => (
            <ScopeChip key={s}>{s}</ScopeChip>
          ))}
        </span>
      </KvRow>
      <p className="text-xs text-foreground-muted text-balance">{copy.grantNote}</p>
    </Card>
  );
}

function ConnectorCardView({ conn, copy }: { conn: EvConnector; copy: EvCopy }) {
  const l = copy.labels;
  return (
    <Card title={fill(l.connectorTitle, { type: conn.type })} icon={<PlugZap size={14} />}>
      <KvRow label={l.subHandle}>
        <code className="font-mono">{conn.id}</code>
      </KvRow>
      <KvRow label={l.provisioned}>
        <span className="inline-flex flex-wrap gap-1.5">
          <OkBadge>
            <WifiOff size={10} /> {l.offlineBadge}
          </OkBadge>
          <WarnBadge>{fill(l.ttlBadge, { days: conn.attestationTtlDays })}</WarnBadge>
        </span>
      </KvRow>
      <KvRow label={l.attestationJti}>
        <code className="font-mono">{shorten(conn.attestationJti, 8)}</code>
      </KvRow>
    </Card>
  );
}

function ResultLine({ ok, children }: { ok: boolean; children: ReactNode }) {
  return ok ? <OkBadge>{children}</OkBadge> : <WarnBadge>{children}</WarnBadge>;
}

export default function ScenarioEv({ identity, copy }: Props) {
  const engineRef = useRef<EvEngine | null>(null);
  const getEngine = () => {
    if (engineRef.current === null) engineRef.current = new EvEngine();
    return engineRef.current;
  };
  const [station, setStation] = useState<EvStation | null>(null);
  const [connectors, setConnectors] = useState<EvConnector[]>([]);
  const [charge, setCharge] = useState<EvCharge | null>(null);
  const [revoked, setRevoked] = useState<EvRevokeResult | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const stage = revoked ? 3 : charge ? 2 : connectors.length > 0 ? 1 : station ? 0 : -1;

  const run = async (kind: Exclude<Busy, null>) => {
    setBusy(kind);
    setError(null);
    try {
      const engine = getEngine();
      if (kind === 'provision' && identity) {
        setStation(await engine.provisionStation(identity));
      } else if (kind === 'ccs') {
        const c = await engine.addConnector('CCS');
        setConnectors((prev) => [...prev, c]);
      } else if (kind === 'type2') {
        const c = await engine.addConnector('Type 2');
        setConnectors((prev) => [...prev, c]);
      } else if (kind === 'charge') {
        setCharge(await engine.chargeSession());
      } else if (kind === 'revoke') {
        setRevoked(await engine.revokeStation());
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const l = copy.labels;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-brand-500 shrink-0">
          <PlugZap size={22} />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-semibold text-foreground">{copy.title}</h3>
          <p className="text-sm text-foreground-muted text-balance">{copy.description}</p>
        </div>
      </div>

      <FlowBreadcrumb stage={stage} copy={copy} />

      <div className="flex flex-wrap gap-3">
        <StageButton
          onClick={() => run('provision')}
          busy={busy === 'provision'}
          disabled={busy !== null}
          icon={<RadioTower size={16} />}
          label={copy.ctaProvision}
        />
        {station && (
          <>
            <StageButton
              onClick={() => run('ccs')}
              busy={busy === 'ccs'}
              disabled={busy !== null || connectors.some((c) => c.id === 'connector-ccs')}
              icon={<PlugZap size={16} />}
              label={copy.ctaCcs}
            />
            <StageButton
              onClick={() => run('type2')}
              busy={busy === 'type2'}
              disabled={busy !== null || connectors.some((c) => c.id === 'connector-type2')}
              icon={<PlugZap size={16} />}
              label={copy.ctaType2}
            />
          </>
        )}
        {connectors.length > 0 && (
          <StageButton
            onClick={() => run('charge')}
            busy={busy === 'charge'}
            disabled={busy !== null}
            icon={<BatteryCharging size={16} />}
            label={copy.ctaCharge}
          />
        )}
        {charge && (
          <StageButton
            onClick={() => run('revoke')}
            busy={busy === 'revoke'}
            disabled={busy !== null}
            icon={<ShieldOff size={16} />}
            label={copy.ctaRevoke}
          />
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
          <span className="text-destructive" aria-hidden="true">
            ✕
          </span>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {station && (
        <div className="flex flex-col gap-4">
          <StationCard station={station} copy={copy} />
          {connectors.length > 0 && (
            <div className="grid gap-4 xl:grid-cols-2">
              {connectors.map((c) => (
                <ConnectorCardView key={c.id} conn={c} copy={copy} />
              ))}
            </div>
          )}
        </div>
      )}

      {charge && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-brand-500/30 bg-background-secondary p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-500 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold text-foreground">{copy.chargeTitle}</div>
              <div className="text-xs text-foreground-muted">
                {fill(copy.chargeSubtitle, {
                  connector: charge.connectorId,
                  jti: shorten(charge.sessionJti, 8),
                })}
              </div>
            </div>
          </div>
          <KvRow label={l.signedBy}>
            <span>{l.signedByValue}</span>
          </KvRow>
          <KvRow label={l.verifiedByApp}>
            <ResultLine ok={charge.verified}>
              {charge.verified ? l.verifiedOk : l.verifiedFail}
            </ResultLine>
          </KvRow>
        </div>
      )}

      {revoked && (
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <span className="mt-0.5 text-success-strong shrink-0">
            <CheckCircle2 size={16} />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              {fill(copy.revokeTitle, { jti: shorten(revoked.stationJti, 8) })}
            </p>
            <p className="text-xs text-foreground-muted text-balance">
              {fill(copy.revokeDetail, {
                result: revoked.newSessionRejected ? copy.revokeOk : copy.revokeFail,
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
