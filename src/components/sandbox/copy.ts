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

export interface SatelliteCopy extends ScenarioTabCopy {
  title: string;
  description: string;
  /** The five flow breadcrumb steps, in order. */
  breadcrumb: [string, string, string, string, string];
  mccTitle: string;
  mccNote: string;
  rootIdentityLabel: string;
  rootIdentityBadge: string;
  ctaDeploy: string;
  ctaPower: string;
  certTitle: string;
  /** `signed by Mission Control · #{jti}` */
  certSubtitle: string;
  certsTitle: string;
  labels: {
    handleSatellite: string;
    orbit: string;
    handleId: string;
    attestedBy: string;
    attestedBadge: string;
    walletSameSeed: string;
    walletBinding: string;
    subHandle: string;
    taskingSlot: string;
    /** `{minutes} min window` */
    slotWindow: string;
    price: string;
    /** `Buy {minutes} min · {price} SOL` */
    buy: string;
    core: string;
    onCurve: string;
    issuer: string;
    issuerValue: string;
    subject: string;
    satelliteInstrument: string;
    taskingWindow: string;
    scopes: string;
    payment: string;
    /** `{price} SOL · simulated in demo` */
    paymentValue: string;
    buyerSessionCheck: string;
    verifiedOffline: string;
    chainCheck: string;
    valid: string;
    failed: string;
    showToken: string;
    hideToken: string;
  };
}

export interface CommerceCopy extends ScenarioTabCopy {
  title: string;
  description: string;
  /** The three flow breadcrumb steps, in order. */
  breadcrumb: [string, string, string];
  ctaMandate: string;
  ctaPaidCall: string;
  ctaEnforce: string;
  agentTitle: string;
  sellerTitle: string;
  agentNote: string;
  /** Wire panel heading. */
  wireTitle: string;
  simNote: string;
  artifactPaymentRequired: string;
  artifactPaymentPayload: string;
  artifactSettlement: string;
  artifactResource: string;
  /** `Settlement tx {tx} · {amount} lamports · payer = mandate-bound agent wallet` */
  receipt: string;
  /** `Mandate enforced — HTTP {status}, blocked BEFORE any payment.` */
  negativeTitle: string;
  negativeDetail2: string;
  hint: string;
  labels: {
    handleAgent: string;
    handleId: string;
    mandateAudiences: string;
    mandateScopes: string;
    walletIndex: string;
    walletBinding: string;
    core: string;
    onCurve: string;
    session: string;
    endpoint: string;
    price: string;
    /** `{price} SOL per call` */
    priceValue: string;
    walletPayTo: string;
    origin: string;
  };
}

export interface SsoCopy extends ScenarioTabCopy {
  title: string;
  description: string;
  /** The four flow breadcrumb steps, in order. */
  breadcrumb: [string, string, string, string];
  ctaTaxi: string;
  ctaFreelance: string;
  ctaPartner: string;
  ctaLogout: string;
  /** Correlation note between the two app cards; {taxiHandle}/{freelanceHandle}. */
  simNote: string;
  cookieTitle: string;
  cookieNote: string;
  cookieFlagsBadge: string;
  partnerTitle: string;
  /** `offline · root public key only · attestation JTI {jti}` */
  partnerSubtitle: string;
  partnerReceives: string;
  partnerReceivesValue: string;
  partnerChecks: string;
  partnerChecksValue: string;
  partnerResult: string;
  partnerResultOk: string;
  partnerResultFail: string;
  /** `Log out everywhere — {count} JTI entries, that was the whole logout.` */
  logoutTitle: string;
  /** `Taxi rejects: {taxi} · Freelance rejects: {freelance} · Partner rejects: {partner} — …` */
  logoutDetail: string;
  labels: {
    handleApp: string;
    handleId: string;
    sessionJti: string;
    verification: string;
    modeStateless: string;
    modeAttested: string;
    keyHex: string;
    domain: string;
  };
}

export interface EvCopy extends ScenarioTabCopy {
  title: string;
  description: string;
  /** The four flow breadcrumb steps, in order. */
  breadcrumb: [string, string, string, string];
  ctaProvision: string;
  ctaCcs: string;
  ctaType2: string;
  ctaCharge: string;
  ctaRevoke: string;
  stationTitle: string;
  /** Blast-radius note under the station grant. */
  grantNote: string;
  chargeTitle: string;
  /** `connector {connector} · JTI {jti}` */
  chargeSubtitle: string;
  revokeTitle: string;
  /** `A brand-new connector session … is rejected: {result} — every verifier …` */
  revokeDetail: string;
  revokeOk: string;
  revokeFail: string;
  labels: {
    handleId: string;
    attestedBy: string;
    /** `✓ JTI {jti}` */
    attestedBadge: string;
    grantAudiences: string;
    grantScopes: string;
    subHandle: string;
    provisioned: string;
    offlineBadge: string;
    /** `TTL {days} d` */
    ttlBadge: string;
    attestationJti: string;
    signedBy: string;
    signedByValue: string;
    verifiedByApp: string;
    verifiedOk: string;
    verifiedFail: string;
    /** `{type} Connector` */
    connectorTitle: string;
  };
}

export interface AgentCopy extends ScenarioTabCopy {
  title: string;
  description: string;
  /** Shown while the one-shot run is in flight. */
  loading: string;
  /** Shown if the stage renders before the one-shot run started. */
  placeholder: string;
  steps: {
    mandateIssued: string;
    /** `Root Identity → Handle {handle} → SubHandle {sub}` */
    mandateDetail: string;
    sessionBefore: string;
    sessionBeforeOk: string;
    sessionBeforeFail: string;
    revokeSession: string;
    revokeSessionDetail: string;
    sessionAfter: string;
    sessionAfterOk: string;
    sessionAfterFail: string;
    newSession: string;
    newSessionWarn: string;
    newSessionFail: string;
    killSwitch: string;
    /** `The mandate's JTI {jti} enters the same revocation store; …` */
    killSwitchDetail: string;
    futureAfter: string;
    futureAfterOk: string;
    futureAfterFail: string;
  };
  footerRoot: string;
}

export interface SandboxCopy {
  sandboxSeed: SeedCopy;
  log: LogCopy;
  tabs: TabsCopy;
  // Grows scenario by scenario; each key is filled in as that scenario's
  // component lands.
  scenarios: {
    human: HumanCopy;
    satellite: SatelliteCopy;
    agent: AgentCopy;
    sso: SsoCopy;
    ev: EvCopy;
    commerce: CommerceCopy;
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
