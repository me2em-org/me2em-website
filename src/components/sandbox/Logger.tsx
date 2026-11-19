import { useEffect, useState } from 'react';
import { logger, type LogEntry, type ScenarioTag } from '@/lib/sandbox/logger';

interface LoggerProps {
  /** Scenario whose log lines are shown. */
  scenario: ScenarioTag;
  /** Heading for the panel (from the sandbox i18n module). */
  title: string;
  /** Empty-state copy (from the sandbox i18n module). */
  emptyText: string;
}

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  info: 'text-foreground-muted',
  success: 'text-success-strong',
  warn: 'text-warning-strong',
  error: 'text-error-strong',
};

/**
 * Crypto Operation Log — the sandbox's live protocol log. Scenario logic
 * emits lines through the shared `logger` singleton; this panel renders the
 * lines tagged with the active scenario. Copy comes from the sandbox i18n
 * module via props; log line text itself is technical English by design.
 */
export default function Logger({ scenario, title, emptyText }: LoggerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const unsubscribe = logger.subscribe((entry) => {
      setLogs((prev) => [...prev, entry]);
    });
    return unsubscribe;
  }, []);

  const filtered = logs.filter((l) => l.scenario === scenario);

  return (
    <aside
      className="flex flex-col gap-3 rounded-xl border border-border bg-background-tertiary/50 p-4"
      role="log"
      aria-label={title}
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto font-mono text-xs leading-relaxed">
        {filtered.length === 0 && (
          <p className="text-foreground-subtle">{emptyText}</p>
        )}
        {filtered.map((entry) => (
          <p key={entry.id} className={LEVEL_COLOR[entry.level]}>
            <span className="text-foreground-subtle">[{entry.timestamp}]</span>{' '}
            {entry.message}
            {entry.data && (
              <span className="text-foreground-subtle"> → {entry.data}</span>
            )}
          </p>
        ))}
      </div>
    </aside>
  );
}
