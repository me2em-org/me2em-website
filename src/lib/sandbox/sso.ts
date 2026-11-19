import { Identity, Handle, Session, type Attestation } from '@me2em/core';
import { logger } from './logger';

// ─── Scenario mapping ─────────────────────────────────────────────────────────
// One seed → one Handle per application (@taxi, @freelance). The user types
// the seed ONCE; the in-page Me2eM instance (self-sovereign: it holds the
// user's Identity) reconstructs keys deterministically and verifies every
// session statelessly — no user database anywhere.
//   Mode 1: perimeter apps   → Session.verifyStateless (instance identity)
//   Mode 2: external partner → Session.verifyAttested (root public key only)
// "Log out everywhere" = one revocation entry per session JTI.

export const TAXI_AUDIENCE = 'app.taxi.example';
export const FREELANCE_AUDIENCE = 'app.freelance.example';

export interface SsoApp {
  name: string;
  displayName: string;
  audience: string;
  handleId: string;
  pubKeyHex: string;
  sessionJti: string;
  sessionToken: string;
  verified: boolean;
  mode: 'stateless' | 'attested';
}

export interface SsoCookie {
  domain: string;
  sessionJti: string;
}

export interface SsoSignIn {
  app: SsoApp;
  cookie: SsoCookie | null;
  seedReEntered: boolean;
}

export interface SsoPartnerCheck {
  verified: boolean;
  attestationJti: string;
  offline: true;
}

export interface SsoLogout {
  revokedJtis: string[];
  /** true = the app correctly REJECTS the revoked session now. */
  taxiRejected: boolean;
  freelanceRejected: boolean;
  partnerRejected: boolean;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class SsoEngine {
  private identity: Identity | null = null;
  private taxiHandle: Handle | null = null;
  private freelanceHandle: Handle | null = null;
  private freelanceAttestation: Attestation | null = null;
  private apps: SsoApp[] = [];
  private cookie: SsoCookie | null = null;
  private revoked = new Set<string>();

  dispose(): void {
    this.identity = null;
    this.taxiHandle = null;
    this.freelanceHandle = null;
    this.freelanceAttestation = null;
    this.apps = [];
    this.cookie = null;
    this.revoked = new Set<string>();
  }

  getApps(): SsoApp[] {
    return this.apps;
  }

  getCookie(): SsoCookie | null {
    return this.cookie;
  }

  /** Stage 1 — the user types the seed once, at the first app (taxi). */
  async signInFirstApp(identity: Identity): Promise<SsoSignIn> {
    logger.setScenario('sso');
    this.dispose();
    this.identity = identity;

    logger.info('App A (taxi): user enters the seed phrase locally…');
    logger.info('Deriving Handle "taxi" — this app sees only this identity…');
    this.taxiHandle = await identity.deriveHandle('taxi', {
      displayName: 'Rider @taxi',
    });

    logger.info(`Instance signs a session for audience "${TAXI_AUDIENCE}"…`);
    const session = await Session.create(this.taxiHandle, {
      audience: TAXI_AUDIENCE,
      scopes: ['app:read', 'app:write'],
      ttl: 3600,
    });

    // Mode 1 — the perimeter app verifies statelessly: the instance
    // reconstructs the Handle public key from the same Identity. No
    // session database, one signature check.
    let verified = false;
    try {
      await Session.verifyStateless(session.token, identity, TAXI_AUDIENCE);
      verified = true;
      logger.success('Mode 1: verifyStateless — signature checked against the reconstructed key, zero DB');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('Stateless verification failed', msg.slice(0, 80));
    }

    // The instance keeps an HttpOnly cookie for its own domain.
    this.cookie = { domain: '.example', sessionJti: session.sessionId };
    logger.info('Instance sets an HttpOnly cookie for .example (simulated in-page)');

    const app: SsoApp = {
      name: 'taxi',
      displayName: 'Taxi app',
      audience: TAXI_AUDIENCE,
      handleId: this.taxiHandle.getId(),
      pubKeyHex: toHex(this.taxiHandle.getPublicKey()),
      sessionJti: session.sessionId,
      sessionToken: session.token,
      verified,
      mode: 'stateless',
    };
    this.apps.push(app);
    return { app, cookie: this.cookie, seedReEntered: false };
  }

  /**
   * Stage 2 — the user opens App B: the instance recognizes its cookie and
   * signs the user in. The seed is NOT re-entered.
   */
  async signInSecondApp(): Promise<SsoSignIn> {
    if (!this.identity || !this.cookie) {
      throw new Error('sign in at the first app first');
    }
    logger.setScenario('sso');
    this.seedCheck();

    logger.info('App B (freelance): cookie check → instance recognizes the user');
    logger.info('Deriving Handle "freelance" — a different key, taxi cannot correlate it…');
    this.freelanceHandle = await this.identity.deriveHandle('freelance', {
      displayName: 'Freelancer @freelance',
    });

    logger.info(`Instance signs a session for audience "${FREELANCE_AUDIENCE}"…`);
    const session = await Session.create(this.freelanceHandle, {
      audience: FREELANCE_AUDIENCE,
      scopes: ['app:read'],
      ttl: 3600,
    });

    let verified = false;
    try {
      await Session.verifyStateless(session.token, this.identity, FREELANCE_AUDIENCE);
      verified = true;
      logger.success('Mode 1: auto login complete — the seed was never re-entered');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('Stateless verification failed', msg.slice(0, 80));
    }

    const app: SsoApp = {
      name: 'freelance',
      displayName: 'Freelance app',
      audience: FREELANCE_AUDIENCE,
      handleId: this.freelanceHandle.getId(),
      pubKeyHex: toHex(this.freelanceHandle.getPublicKey()),
      sessionJti: session.sessionId,
      sessionToken: session.token,
      verified,
      mode: 'stateless',
    };
    this.apps.push(app);
    return { app, cookie: null, seedReEntered: false };
  }

  /**
   * Stage 3 — a partner app OUTSIDE the perimeter: Mode 2, offline
   * verification with the root public key only.
   */
  async partnerCheck(): Promise<SsoPartnerCheck> {
    if (!this.identity || !this.freelanceHandle) {
      throw new Error('sign in at the apps first');
    }
    logger.setScenario('sso');

    logger.info('External partner app: no shared perimeter — it gets token + chain');
    logger.info('Instance attests Handle "freelance" (root → handle)…');
    this.freelanceAttestation = await this.identity.attestHandle('freelance', {
      audiences: [FREELANCE_AUDIENCE],
      scopes: ['app:read'],
      maxSessionTtl: 3600,
    });

    const session = await Session.create(this.freelanceHandle, {
      audience: FREELANCE_AUDIENCE,
      scopes: ['app:read'],
      ttl: 3600,
    });

    // Mode 2 — the partner holds ONLY the root public key; verification is
    // fully offline: chain + signature + audience, no database, no network.
    let verified = false;
    try {
      await Session.verifyAttested(
        session.token,
        this.identity.getPublicKey(),
        [this.freelanceAttestation.token],
        FREELANCE_AUDIENCE,
      );
      verified = true;
      logger.success('Mode 2: verifyAttested — chain verified offline with the public key alone');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('Partner verification failed', msg.slice(0, 80));
    }

    return {
      verified,
      attestationJti: this.freelanceAttestation.jti,
      offline: true,
    };
  }

  /** Stage 4 — "log out everywhere": one revocation entry per session. */
  async logoutEverywhere(): Promise<SsoLogout> {
    if (this.apps.length === 0) {
      throw new Error('sign in first');
    }
    logger.setScenario('sso');

    for (const app of this.apps) {
      this.revoked.add(app.sessionJti);
    }
    logger.info(`Revocation store: ${this.revoked.size} JTI entries — that is the whole logout`);

    const checker = { isRevoked: async (sid: string) => this.revoked.has(sid) };
    const taxi = this.apps.find((a) => a.name === 'taxi');
    const freelance = this.apps.find((a) => a.name === 'freelance');

    // The previously issued sessions are what dies: re-verify each one —
    // Mode 1 for the perimeter apps, Mode 2 for the external partner.
    let taxiVerifiedAfter: boolean | null = null;
    if (taxi && taxi.verified && this.identity) {
      try {
        await Session.verifyStateless(taxi.sessionToken, this.identity, TAXI_AUDIENCE, checker);
        taxiVerifiedAfter = true;
      } catch {
        taxiVerifiedAfter = false;
      }
    }

    let freelanceVerifiedAfter: boolean | null = null;
    if (freelance && freelance.verified && this.identity) {
      try {
        await Session.verifyStateless(freelance.sessionToken, this.identity, FREELANCE_AUDIENCE, checker);
        freelanceVerifiedAfter = true;
      } catch {
        freelanceVerifiedAfter = false;
      }
    }

    let partnerVerifiedAfter: boolean | null = null;
    if (this.freelanceAttestation && this.identity && freelance) {
      try {
        await Session.verifyAttested(
          freelance.sessionToken,
          this.identity.getPublicKey(),
          [this.freelanceAttestation.token],
          FREELANCE_AUDIENCE,
          checker,
        );
        partnerVerifiedAfter = true;
      } catch {
        partnerVerifiedAfter = false;
      }
    }

    if (!taxiVerifiedAfter && !freelanceVerifiedAfter && !partnerVerifiedAfter) {
      logger.success('Log out everywhere: every app now rejects the user — one store, no DB wipe');
    } else {
      logger.error('Expected every app to reject the user after logout');
    }

    return {
      revokedJtis: Array.from(this.revoked),
      taxiRejected: taxiVerifiedAfter === false,
      freelanceRejected: freelanceVerifiedAfter === false,
      partnerRejected: partnerVerifiedAfter === false,
    };
  }

  private seedCheck(): void {
    logger.info('Seed check: none — the seed was typed once, in the browser, at App A');
  }
}
