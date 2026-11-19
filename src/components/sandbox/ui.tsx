/**
 * Shared sandbox UI primitives, restyled from the standalone me2em-demo app
 * onto the site's Tailwind tokens. Copy (including every aria-label) arrives
 * as props from the scenario components, which read it from the sandbox i18n
 * module.
 */
import { useState, type ReactNode } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';

export function CopyBtn({ value, ariaLabel }: { value: string; ariaLabel: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      className="shrink-0 rounded-md border border-border bg-background p-1 text-foreground-muted transition-colors hover:border-brand-500 hover:text-foreground"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

export function KeyRow({
  label,
  value,
  copyAria,
  red = false,
}: {
  label: ReactNode;
  value: string;
  copyAria: string;
  red?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="text-xs text-foreground-muted">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <code
          className={`min-w-0 flex-1 truncate rounded-md border px-2 py-1 font-mono text-xs ${
            red
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : 'border-border bg-background text-foreground'
          }`}
          title={value}
        >
          {value}
        </code>
        <CopyBtn value={value} ariaLabel={copyAria} />
      </div>
    </div>
  );
}

export function KeyGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background-tertiary/50 p-3">
      {children}
    </div>
  );
}

export function ScenarioHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-success shrink-0">{icon}</span>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-foreground-muted text-balance">{description}</p>
      </div>
    </div>
  );
}

export function StageButton({
  onClick,
  disabled,
  busy,
  icon,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  busy: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

export function NegativeCard({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
      <span className="text-destructive" aria-hidden="true">
        ✕
      </span>
      <p className="text-sm text-destructive">{text}</p>
    </div>
  );
}

export function ScenarioNote({ text }: { text: string }) {
  return <p className="text-sm text-success-strong">{text}</p>;
}

export function ScenarioFooter({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-foreground-muted">
      {icon}
      <span>{children}</span>
    </div>
  );
}
