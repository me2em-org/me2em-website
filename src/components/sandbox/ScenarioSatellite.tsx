import { useState, useRef, useEffect } from 'react';
import {
  Antenna,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Cloud,
  Landmark,
  Radar,
  Rocket,
  Satellite,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Identity } from '@me2em/core';
import { MCCMission } from '@/lib/sandbox/satellite';
import type { SatelliteNode, InstrumentNode, PurchaseReceipt } from '@/lib/sandbox/satellite';
import { fill, type SatelliteCopy } from './copy';
import { Card, KvRow, OkBadge, ScopeChip, StageButton, WarnBadge } from './ui';

interface Props {
  identity: Identity | null;
  seedBytes: Uint8Array | null;
  copy: SatelliteCopy;
}

type Stage = 'idle' | 'fleet' | 'market';
type Busy = null | 'fleet' | 'power' | 'buy';

const KIND_ICON: Record<string, LucideIcon> = {
  imaging: Camera,
  weather: Cloud,
  radar: Radar,
  comms: Antenna,
};

function shorten(s: string, chars = 10): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

function utcHM(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().slice(11, 16);
}

function MCCCard({ copy }: { copy: SatelliteCopy }) {
  return (
    <Card title={copy.mccTitle} icon={<Landmark size={14} />}>
      <KvRow label={copy.rootIdentityLabel}>
        <OkBadge>{copy.rootIdentityBadge}</OkBadge>
      </KvRow>
      <p className="text-xs text-foreground-muted text-balance">{copy.mccNote}</p>
    </Card>
  );
}

function SatelliteCard({ sat, copy }: { sat: SatelliteNode; copy: SatelliteCopy }) {
  const l = copy.labels;
  return (
    <Card title={sat.displayName} icon={<Satellite size={14} />}>
      <KvRow label={l.handleSatellite}>
        <code className="font-mono">{sat.name}</code>
      </KvRow>
      <KvRow label={l.orbit}>
        <span className="text-foreground-muted">{sat.orbit}</span>
      </KvRow>
      <KvRow label={l.handleId}>
        <code className="font-mono">{shorten(sat.handleId, 14)}</code>
      </KvRow>
      <KvRow label={l.attestedBy}>
        <OkBadge>{l.attestedBadge}</OkBadge>
      </KvRow>
      <KvRow label={l.walletSameSeed}>
        <code className="font-mono">{shorten(sat.wallet.address, 12)}</code>
      </KvRow>
      <KvRow label={l.walletBinding}>
        <span className="inline-flex flex-wrap gap-1.5">
          <OkBadge>
            {l.core} {sat.walletBindingOk ? '✓' : '✗'}
          </OkBadge>
          <OkBadge>
            {l.onCurve} {sat.onCurveOk ? '✓' : '✗'}
          </OkBadge>
        </span>
      </KvRow>
    </Card>
  );
}

function InstrumentCard({
  inst,
  satName,
  busy,
  onBuy,
  copy,
}: {
  inst: InstrumentNode;
  satName: string;
  busy: Busy;
  onBuy: (satName: string, instName: string) => void;
  copy: SatelliteCopy;
}) {
  const KindIcon = KIND_ICON[inst.kind] ?? Antenna;
  return (
    <Card title={inst.displayName} icon={<KindIcon size={14} />}>
      <KvRow label={copy.labels.subHandle}>
        <code className="font-mono">{inst.path}</code>
      </KvRow>
      <KvRow label={copy.labels.taskingSlot}>
        <span className="text-foreground-muted">
          {fill(copy.labels.slotWindow, { minutes: inst.slotMinutes })}
        </span>
      </KvRow>
      <KvRow label={copy.labels.price}>
        <span className="font-semibold text-brand-500">{inst.priceSol} SOL</span>
      </KvRow>
      <StageButton
        onClick={() => onBuy(satName, inst.name)}
        busy={busy === 'buy'}
        disabled={busy !== null}
        icon={<Rocket size={16} />}
        label={fill(copy.labels.buy, { minutes: inst.slotMinutes, price: inst.priceSol })}
      />
    </Card>
  );
}

function CertificateCard({ r, copy }: { r: PurchaseReceipt; copy: SatelliteCopy }) {
  const [showToken, setShowToken] = useState(false);
  const l = copy.labels;
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-brand-500/30 bg-background-secondary p-4">
      <div className="flex items-center gap-2">
        <BadgeCheck size={18} className="text-brand-500 shrink-0" aria-hidden="true" />
        <div>
          <div className="text-sm font-semibold text-foreground">{copy.certTitle}</div>
          <div className="text-xs text-foreground-muted">
            {fill(copy.certSubtitle, { jti: r.certificateJti.slice(0, 8) })}
          </div>
        </div>
      </div>

      <KvRow label={l.issuer}>
        <span>{l.issuerValue}</span>
      </KvRow>
      <KvRow label={l.subject}>
        <span>
          {r.company} · <code className="font-mono">{r.buyerHandleName}</code> · key{' '}
          {shorten(r.buyerId, 8)}
        </span>
      </KvRow>
      <KvRow label={l.satelliteInstrument}>
        <span>
          {r.satDisplay} / {r.instDisplay}
        </span>
      </KvRow>
      <KvRow label={l.taskingWindow}>
        <span>
          {utcHM(r.windowStart)}–{utcHM(r.windowEnd)} UTC ({r.slotMinutes} min)
        </span>
      </KvRow>
      <KvRow label={l.scopes}>
        <span className="flex flex-wrap gap-1.5">
          {r.scopes.map((s) => (
            <ScopeChip key={s}>{s}</ScopeChip>
          ))}
        </span>
      </KvRow>
      <KvRow label={l.payment}>
        <span>{fill(l.paymentValue, { price: r.priceSol })}</span>
      </KvRow>

      <div className="flex flex-col gap-2 border-t border-border pt-2">
        <KvRow label={l.buyerSessionCheck}>
          {r.buyerSessionVerified ? (
            <OkBadge>
              <ShieldCheck size={12} /> {l.verifiedOffline}
            </OkBadge>
          ) : (
            <WarnBadge>
              <XCircle size={12} /> {l.failed}
            </WarnBadge>
          )}
        </KvRow>
        <KvRow label={l.chainCheck}>
          {r.chainSessionVerified ? (
            <OkBadge>
              <CheckCircle2 size={12} /> {l.valid}
            </OkBadge>
          ) : (
            <WarnBadge>
              <XCircle size={12} /> {l.failed}
            </WarnBadge>
          )}
        </KvRow>
      </div>

      <button
        type="button"
        onClick={() => setShowToken((v) => !v)}
        className="self-start text-xs text-foreground-muted underline underline-offset-2 transition-colors hover:text-foreground"
      >
        {showToken ? l.hideToken : l.showToken}
      </button>
      {showToken && (
        <code className="break-all rounded-md border border-border bg-background-tertiary p-2 font-mono text-xs text-foreground-muted">
          {r.certificateToken}
        </code>
      )}
    </div>
  );
}

function FlowBreadcrumb({ stage, copy }: { stage: Stage; copy: SatelliteCopy }) {
  const reached = stage === 'idle' ? 0 : stage === 'fleet' ? 2 : 3;
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

export default function ScenarioSatellite({ identity, seedBytes, copy }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [sats, setSats] = useState<SatelliteNode[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [busy, setBusy] = useState<Busy>(null);
  const missionRef = useRef<MCCMission | null>(null);
  const buyCountRef = useRef(0);

  useEffect(
    () => () => {
      missionRef.current?.dispose();
      missionRef.current = null;
    },
    [],
  );

  const handleDeploy = async () => {
    if (!identity || !seedBytes || busy) return;
    setBusy('fleet');
    try {
      if (!missionRef.current) missionRef.current = new MCCMission();
      const nodes = await missionRef.current.deployFleet(identity, seedBytes);
      setSats(nodes);
      setStage('fleet');
    } finally {
      setBusy(null);
    }
  };

  const handlePower = async () => {
    const mission = missionRef.current;
    if (!mission || busy) return;
    setBusy('power');
    try {
      for (const s of sats) await mission.powerInstruments(s.name);
      setSats(mission.getFleet());
      setStage('market');
    } finally {
      setBusy(null);
    }
  };

  const handleBuy = async (satName: string, instName: string) => {
    if (!identity || !missionRef.current || busy) return;
    setBusy('buy');
    try {
      const r = await missionRef.current.purchase(
        identity,
        satName,
        instName,
        buyCountRef.current,
      );
      buyCountRef.current += 1;
      setReceipts((prev) => [r, ...prev]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-success shrink-0">
          <CheckCircle2 size={20} />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-semibold text-foreground">{copy.title}</h3>
          <p className="text-sm text-foreground-muted text-balance">{copy.description}</p>
        </div>
      </div>

      <FlowBreadcrumb stage={stage} copy={copy} />

      {stage === 'idle' && (
        <div className="flex flex-col gap-4">
          <MCCCard copy={copy} />
          <StageButton
            onClick={handleDeploy}
            busy={busy === 'fleet'}
            disabled={busy !== null}
            icon={<Satellite size={16} />}
            label={copy.ctaDeploy}
          />
        </div>
      )}

      {stage !== 'idle' && (
        <div className="flex flex-col gap-4">
          <MCCCard copy={copy} />
          <div className="grid gap-4 xl:grid-cols-2">
            {sats.map((s) => (
              <SatelliteCard key={s.name} sat={s} copy={copy} />
            ))}
          </div>
        </div>
      )}

      {stage === 'fleet' && (
        <StageButton
          onClick={handlePower}
          busy={busy === 'power'}
          disabled={busy !== null}
          icon={<Rocket size={16} />}
          label={copy.ctaPower}
        />
      )}

      {stage === 'market' && (
        <div className="flex flex-col gap-5">
          {sats.map((s) => (
            <div key={s.name} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
                <Satellite size={14} className="text-brand-500" />
                {s.displayName}
                <span className="text-xs font-normal text-foreground-muted">· {s.orbit}</span>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {s.instruments.map((inst) => (
                  <InstrumentCard
                    key={inst.name}
                    inst={inst}
                    satName={s.name}
                    busy={busy}
                    onBuy={handleBuy}
                    copy={copy}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {receipts.length > 0 && (
        <div className="flex flex-col gap-4">
          <h4 className="font-display text-sm font-semibold text-foreground">
            {copy.certsTitle}
          </h4>
          {receipts.map((r) => (
            <CertificateCard key={r.certificateJti} r={r} copy={copy} />
          ))}
        </div>
      )}
    </div>
  );
}
