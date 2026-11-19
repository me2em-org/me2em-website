import { useEffect, useRef, useState } from 'react';
import {
  Car,
  CheckCircle2,
  Cookie,
  Fingerprint,
  Handshake,
  KeyRound,
  Laptop,
  LogOut,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { Identity } from '@me2em/core';
import { SsoEngine } from '@/lib/sandbox/sso';
import type { SsoApp, SsoCookie, SsoPartnerCheck, SsoLogout } from '@/lib/sandbox/sso';
import { fill, type SsoCopy } from './copy';
import { Card, KvRow, OkBadge, ScopeChip, StageButton, WarnBadge } from './ui';

interface Props {
  identity: Identity | null;
  copy: SsoCopy;
}

type Busy = null | 'taxi' | 'freelance' | 'partner' | 'logout';

function shorten(s: string, chars = 10): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

function FlowBreadcrumb({ stage, copy }: { stage: number; copy: SsoCopy }) {
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

function AppCard({ app, icon, copy }: { app: SsoApp; icon: 'taxi' | 'freelance'; copy: SsoCopy }) {
  const Icon = icon === 'taxi' ? Car : Laptop;
  const l = copy.labels;
  return (
    <Card title={app.displayName} icon={<Icon size={14} />}>
      <KvRow label={l.handleApp}>
        <ScopeChip>@{app.name}</ScopeChip>
      </KvRow>
      <KvRow label={l.handleId}>
        <code className="font-mono">{shorten(app.handleId, 14)}</code>
      </KvRow>
      <KvRow label={l.sessionJti}>
        <code className="font-mono">{shorten(app.sessionJti, 8)}</code>
      </KvRow>
      <KvRow label={l.verification}>
        {app.verified ? (
          <OkBadge>
            {app.mode === 'stateless' ? l.modeStateless : l.modeAttested}
          </OkBadge>
        ) : (
          <WarnBadge>
            {app.mode === 'stateless' ? l.modeStateless : l.modeAttested}
          </WarnBadge>
        )}
      </KvRow>
      <KvRow label={l.keyHex}>
        <code className="font-mono">{shorten(app.pubKeyHex, 12)}</code>
      </KvRow>
    </Card>
  );
}

export default function ScenarioSso({ identity, copy }: Props) {
  const engineRef = useRef<SsoEngine | null>(null);
  const getEngine = () => {
    if (engineRef.current === null) engineRef.current = new SsoEngine();
    return engineRef.current;
  };
  const [apps, setApps] = useState<SsoApp[]>([]);
  const [cookie, setCookie] = useState<SsoCookie | null>(null);
  const [partner, setPartner] = useState<SsoPartnerCheck | null>(null);
  const [logout, setLogout] = useState<SsoLogout | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const stage = logout ? 3 : partner ? 2 : apps.length >= 2 ? 1 : apps.length === 1 ? 0 : -1;

  const run = async (kind: Exclude<Busy, null>) => {
    setBusy(kind);
    setError(null);
    try {
      const engine = getEngine();
      if (kind === 'taxi' && identity) {
        const res = await engine.signInFirstApp(identity);
        setApps((prev) => [...prev, res.app]);
        setCookie(res.cookie);
      } else if (kind === 'freelance') {
        const res = await engine.signInSecondApp();
        setApps((prev) => [...prev, res.app]);
      } else if (kind === 'partner') {
        setPartner(await engine.partnerCheck());
      } else if (kind === 'logout') {
        setLogout(await engine.logoutEverywhere());
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const taxi = apps.find((a) => a.name === 'taxi');
  const freelance = apps.find((a) => a.name === 'freelance');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-brand-500 shrink-0">
          <KeyRound size={22} />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-semibold text-foreground">{copy.title}</h3>
          <p className="text-sm text-foreground-muted text-balance">{copy.description}</p>
        </div>
      </div>

      <FlowBreadcrumb stage={stage} copy={copy} />

      <div className="flex flex-wrap gap-3">
        <StageButton
          onClick={() => run('taxi')}
          busy={busy === 'taxi'}
          disabled={busy !== null}
          icon={<Car size={16} />}
          label={copy.ctaTaxi}
        />
        {taxi && (
          <StageButton
            onClick={() => run('freelance')}
            busy={busy === 'freelance'}
            disabled={busy !== null}
            icon={<Laptop size={16} />}
            label={copy.ctaFreelance}
          />
        )}
        {apps.length >= 2 && (
          <StageButton
            onClick={() => run('partner')}
            busy={busy === 'partner'}
            disabled={busy !== null}
            icon={<Handshake size={16} />}
            label={copy.ctaPartner}
          />
        )}
        {partner && (
          <StageButton
            onClick={() => run('logout')}
            busy={busy === 'logout'}
            disabled={busy !== null}
            icon={<LogOut size={16} />}
            label={copy.ctaLogout}
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

      {apps.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="grid gap-4 xl:grid-cols-2">
            {taxi && <AppCard app={taxi} icon="taxi" copy={copy} />}
            {freelance && <AppCard app={freelance} icon="freelance" copy={copy} />}
          </div>
          {taxi && freelance && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-background-tertiary/50 px-4 py-3">
              <span className="mt-0.5 text-foreground-muted shrink-0">
                <Fingerprint size={12} />
              </span>
              <p className="text-xs text-foreground-muted text-balance">
                {fill(copy.simNote, { taxiHandle: '@taxi', freelanceHandle: '@freelance' })}
              </p>
            </div>
          )}
        </div>
      )}

      {cookie && (
        <Card title={copy.cookieTitle} icon={<Cookie size={14} />}>
          <KvRow label={copy.labels.domain}>
            <code className="font-mono">{cookie.domain}</code>
          </KvRow>
          <KvRow label={copy.labels.verification}>
            <OkBadge>{copy.cookieFlagsBadge}</OkBadge>
          </KvRow>
          <p className="text-xs text-foreground-muted text-balance">{copy.cookieNote}</p>
        </Card>
      )}

      {partner && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-brand-500/30 bg-background-secondary p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-500 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold text-foreground">{copy.partnerTitle}</div>
              <div className="text-xs text-foreground-muted">
                {fill(copy.partnerSubtitle, { jti: shorten(partner.attestationJti, 8) })}
              </div>
            </div>
          </div>
          <KvRow label={copy.partnerReceives}>
            <span>{copy.partnerReceivesValue}</span>
          </KvRow>
          <KvRow label={copy.partnerChecks}>
            <span>{copy.partnerChecksValue}</span>
          </KvRow>
          <KvRow label={copy.partnerResult}>
            {partner.verified ? (
              <OkBadge>{copy.partnerResultOk}</OkBadge>
            ) : (
              <WarnBadge>{copy.partnerResultFail}</WarnBadge>
            )}
          </KvRow>
        </div>
      )}

      {logout && (
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <span className="mt-0.5 text-success-strong shrink-0">
            <CheckCircle2 size={16} />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              {fill(copy.logoutTitle, { count: logout.revokedJtis.length })}
            </p>
            <p className="text-xs text-foreground-muted text-balance">
              {fill(copy.logoutDetail, {
                taxi: logout.taxiRejected ? '✓' : '✗',
                freelance: logout.freelanceRejected ? '✓' : '✗',
                partner: logout.partnerRejected ? '✓' : '✗',
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
