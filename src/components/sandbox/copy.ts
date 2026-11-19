/**
 * Copy types for the sandbox UI, one interface per scenario slice. All of it
 * lives in the sandbox i18n module (`src/i18n/sandbox/<locale>.json`) and is
 * passed into the client island as a single prop from SandboxView.astro —
 * no component hard-codes reader-facing text (see i18n-coverage.test.ts).
 */
import type { ReactNode } from 'react';
import type { SeedCopy } from './SeedIsland';

export type ScenarioId = 'human' | 'satellite' | 'agent' | 'sso' | 'ev' | 'commerce';

export interface LogCopy {
  title: string;
  empty: string;
}

export interface TabsCopy {
  /** Shown above the scenario tab row once the Identity exists. */
  ready: string;
  /** Footer hint under the scenario area. */
  hint: string;
}

/** Minimal per-scenario copy every scenario carries (the tab bar). */
export interface ScenarioTabCopy {
  tab: string;
  tabDesc: string;
}

/** One tab button of the scenario switcher (icon is attached in the UI). */
export interface ScenarioTab extends ScenarioTabCopy {
  id: ScenarioId;
  icon: ReactNode;
}

export interface HumanCopy extends ScenarioTabCopy {
  title: string;
  description: string;
  cta: Record<'work' | 'family' | 'gym', string>;
  noteFamily: string;
  noteGym: string;
  footerRoot: string;
  footerDone: string;
  labels: {
    handleId: string;
    publicKey: string;
    privateKey: string;
    wallet: string;
    address: string;
    walletPrivateKey: string;
    /** `Password for "{value}"` — {value} is the service or email. */
    passwordFor: string;
    /** `Channel Key for E2EE "{value}"` — {value} is the context name. */
    channelKeyFor: string;
    copyValue: string;
    toggleKeys: string;
    expand: string;
    collapse: string;
  };
}

export interface SandboxCopy {
  sandboxSeed: SeedCopy;
  log: LogCopy;
  tabs: TabsCopy;
  // Grows scenario by scenario; each key is filled in as that scenario's
  // component lands.
  scenarios: {
    human: HumanCopy;
    satellite: ScenarioTabCopy;
    agent: ScenarioTabCopy;
    sso: ScenarioTabCopy;
    ev: ScenarioTabCopy;
    commerce: ScenarioTabCopy;
  };
}

/**
 * Substitute `{name}` placeholders in a copy template. Same contract as
 * `t()`'s `vars` in `src/i18n/index.ts`; unknown placeholders stay untouched.
 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
