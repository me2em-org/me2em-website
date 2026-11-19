import { CheckCircle2, ShieldCheck, ShieldX, XCircle, Bot, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AgentResult } from '@/lib/sandbox/agent';
import { fill, type AgentCopy } from './copy';
import { ScenarioFooter, ScenarioHeader } from './ui';

interface Props {
  result: AgentResult | null;
  loading: boolean;
  copy: AgentCopy;
}

function shorten(s: string, chars = 16): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

type StepState = 'ok' | 'err' | 'info';

function stepIcon(state: StepState): { Icon: LucideIcon; className: string } {
  if (state === 'ok') return { Icon: CheckCircle2, className: 'text-success-strong' };
  if (state === 'err') return { Icon: XCircle, className: 'text-error-strong' };
  return { Icon: ShieldX, className: 'text-foreground-muted' };
}

function TimelineStep({
  state,
  icon,
  title,
  children,
}: {
  state: StepState;
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  const Icon = icon ?? stepIcon(state).Icon;
  const color = icon ? 'text-foreground-muted' : stepIcon(state).className;
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background-tertiary ${color}`}
        aria-hidden="true"
      >
        <Icon size={15} />
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-foreground-muted text-balance break-words">{children}</span>
      </div>
    </li>
  );
}

export default function ScenarioAgent({ result, loading, copy }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-background-secondary p-5">
        <Bot size={20} className="animate-pulse text-foreground-muted" aria-hidden="true" />
        <p className="text-sm text-foreground-muted">{copy.loading}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-border bg-background-secondary p-5">
        <p className="text-sm text-foreground-muted">{copy.placeholder}</p>
      </div>
    );
  }

  const s = copy.steps;

  return (
    <div className="flex flex-col gap-5">
      <ScenarioHeader
        icon={<CheckCircle2 size={20} />}
        title={copy.title}
        description={copy.description}
      />

      <ol className="flex flex-col gap-4 rounded-xl border border-border bg-background-secondary p-5">
        <TimelineStep state="ok" title={s.mandateIssued}>
          {fill(s.mandateDetail, {
            handle: shorten(result.agentHandleId, 10),
            sub: shorten(result.agentSubHandleId, 10),
          })}
        </TimelineStep>

        <TimelineStep
          state={result.sessionVerifiedBefore ? 'ok' : 'err'}
          title={s.sessionBefore}
        >
          {result.sessionVerifiedBefore ? s.sessionBeforeOk : s.sessionBeforeFail}
        </TimelineStep>

        <TimelineStep state="info" icon={CheckCircle2} title={s.revokeSession}>
          {s.revokeSessionDetail}
        </TimelineStep>

        <TimelineStep
          state={!result.sessionVerifiedAfter ? 'ok' : 'err'}
          title={s.sessionAfter}
        >
          {!result.sessionVerifiedAfter ? s.sessionAfterOk : s.sessionAfterFail}
        </TimelineStep>

        <TimelineStep
          state={result.futureSessionPassedBefore ? 'info' : 'err'}
          icon={ShieldX}
          title={s.newSession}
        >
          {result.futureSessionPassedBefore ? s.newSessionWarn : s.newSessionFail}
        </TimelineStep>

        <TimelineStep state="info" icon={ShieldX} title={s.killSwitch}>
          {fill(s.killSwitchDetail, { jti: shorten(result.attestationJti, 8) })}
        </TimelineStep>

        <TimelineStep
          state={result.futureSessionFailedAfter ? 'ok' : 'err'}
          title={s.futureAfter}
        >
          {result.futureSessionFailedAfter ? s.futureAfterOk : s.futureAfterFail}
        </TimelineStep>
      </ol>

      <ScenarioFooter icon={<ShieldCheck size={14} />}>
        {copy.footerRoot} <code className="font-mono">{shorten(result.rootPubKeyHex, 16)}</code>
      </ScenarioFooter>
    </div>
  );
}
