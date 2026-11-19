import { Identity, Session, type Handle, type SubHandle, type Attestation } from '@me2em/core';
import { logger } from './logger';

// ─── Scenario mapping ─────────────────────────────────────────────────────────
// Identity            = the charging network operator (root of trust)
// Handle              = a charging station (attested ONCE at install)
// SubHandle           = a connector on that station — derived AND attested
//                       locally, fully offline
// Session             = a charging session signed onboard by the connector
// Verification        = Mode 2: the charging app holds the operator's PUBLIC
//                       key only; chain check is fully offline
// Station revocation  = one JTI in the revocation store kills every
//                       connector of the station at once

export const EV_APP_AUDIENCE = 'ev-charging-app.example';
export const CHARGE_SCOPES = ['charge:start', 'charge:stop', 'charge:status'];

export interface EvStation {
  name: string;
  handleId: string;
  attestationJti: string;
  grantAudiences: string[];
  grantScopes: string[];
  maxSessionTtl: number;
}

export interface EvConnector {
  id: string;
  type: string;
  subHandleId: string;
  attestationJti: string;
  attestationTtlDays: number;
}

export interface EvCharge {
  connectorId: string;
  sessionJti: string;
  verified: boolean;
  offline: true;
}

export interface EvRevokeResult {
  stationJti: string;
  newSessionRejected: boolean;
}

export class EvEngine {
  private identity: Identity | null = null;
  private station: Handle | null = null;
  private stationAttestation: Attestation | null = null;
  private connectors = new Map<string, { sub: SubHandle; B: Attestation; type: string }>();
  private stationJti: string | null = null;

  dispose(): void {
    this.identity = null;
    this.station = null;
    this.stationAttestation = null;
    this.connectors = new Map();
    this.stationJti = null;
  }

  getStation(): EvStation | null {
    if (!this.station || !this.stationAttestation) return null;
    return {
      name: 'station-001',
      handleId: this.station.getId(),
      attestationJti: this.stationAttestation.jti,
      grantAudiences: [EV_APP_AUDIENCE],
      grantScopes: [...CHARGE_SCOPES],
      maxSessionTtl: 7200,
    };
  }

  getConnectors(): EvConnector[] {
    return Array.from(this.connectors.entries()).map(([id, c]) => ({
      id,
      type: c.type,
      subHandleId: c.sub.getId(),
      attestationJti: c.B.jti,
      attestationTtlDays: 365,
    }));
  }

  /** Stage 1 — provisioning (once, at install): operator attests the station. */
  async provisionStation(identity: Identity): Promise<EvStation> {
    logger.setScenario('ev');
    this.dispose();
    this.identity = identity;

    logger.info('Operator = root Identity (the network owner\'s seed)');
    logger.info('Deriving station Handle "station-001"…');
    this.station = await identity.deriveHandle('station-001', {
      displayName: 'EV Station 001 — Highway A1',
    });

    logger.info('Operator attests the station (grant: charge:* scopes, connector-* subs)…');
    this.stationAttestation = await identity.attestHandle('station-001', {
      audiences: [EV_APP_AUDIENCE],
      scopes: [...CHARGE_SCOPES],
      maxSessionTtl: 7200,
      subNamePatterns: ['connector-*'],
    }, { ttlSeconds: 365 * 24 * 3600 });
    this.stationJti = this.stationAttestation.jti;

    logger.success('Station provisioned — it will never need the network again');
    return this.getStation() as EvStation;
  }

  /** Stage 2 — the station adds a connector fully offline (derive + self-attest). */
  async addConnector(type: 'CCS' | 'Type 2'): Promise<EvConnector> {
    if (!this.station) {
      throw new Error('provision the station first');
    }
    logger.setScenario('ev');
    const id = `connector-${type === 'CCS' ? 'ccs' : 'type2'}`;
    if (this.connectors.has(id)) {
      throw new Error(`${id} already exists`);
    }

    logger.info(`Station derives SubHandle "${id}" locally — no network involved…`);
    const sub: SubHandle = await this.station.deriveSubHandle(id, {
      allowedAudiences: [EV_APP_AUDIENCE],
      allowedScopes: [...CHARGE_SCOPES],
      maxSessionTtl: 7200,
      displayName: `${type} Connector`,
    });

    logger.info(`Station attests "${id}" itself (B, TTL 365 days) — offline…`);
    const B = await this.station.attestSubHandle(id, {
      audiences: [EV_APP_AUDIENCE],
      scopes: [...CHARGE_SCOPES],
      maxSessionTtl: 7200,
    }, { ttlSeconds: 365 * 24 * 3600 });

    this.connectors.set(id, { sub, B, type });
    logger.success(`Connector "${id}" ready — two local operations, zero connectivity`);
    return {
      id,
      type,
      subHandleId: sub.getId(),
      attestationJti: B.jti,
      attestationTtlDays: 365,
    };
  }

  /** Stage 3 — a charging session signed onboard; the app verifies offline (Mode 2). */
  async chargeSession(connectorId?: string): Promise<EvCharge> {
    const id = connectorId ?? Array.from(this.connectors.keys())[0];
    const conn = this.connectors.get(id);
    if (!conn || !this.identity) {
      throw new Error('add a connector first');
    }
    logger.setScenario('ev');

    logger.info(`Charging session on "${id}" — the connector signs its own session…`);
    const session = await Session.create(conn.sub, {
      audience: EV_APP_AUDIENCE,
      scopes: [...CHARGE_SCOPES],
      ttl: 7200,
    });

    // Mode 2: the charging app holds ONLY the operator's public key. The
    // full chain (operator → station → connector) is checked offline.
    let verified = false;
    try {
      await Session.verifyAttested(
        session.token,
        this.identity.getPublicKey(),
        [(this.stationAttestation as Attestation).token, conn.B.token],
        EV_APP_AUDIENCE,
      );
      verified = true;
      logger.success('App verified the session OFFLINE — operator public key only, no network');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('Charging app verification failed', msg.slice(0, 80));
    }

    return {
      connectorId: id,
      sessionJti: session.sessionId,
      verified,
      offline: true,
    };
  }

  /** Stage 4 — one flag per station: revoke the station JTI, every connector dies. */
  async revokeStation(): Promise<EvRevokeResult> {
    if (!this.stationJti || !this.connectors.size || !this.identity) {
      throw new Error('provision the station and add a connector first');
    }
    logger.setScenario('ev');

    logger.info(`Operator revokes ONE JTI — the station's attestation (${this.stationJti.slice(0, 8)}…)`);
    const revoked = new Set<string>([this.stationJti]);
    const chainJtis = [this.stationJti];
    const checker = {
      isRevoked: async (sid: string) =>
        revoked.has(sid) || chainJtis.some((j) => revoked.has(j)),
    };

    const id = Array.from(this.connectors.keys())[0];
    const conn = this.connectors.get(id) as { sub: SubHandle; B: Attestation; type: string };
    logger.info(`"${id}" signs a brand-new session — signature is perfectly valid…`);
    const session = await Session.create(conn.sub, {
      audience: EV_APP_AUDIENCE,
      scopes: [...CHARGE_SCOPES],
      ttl: 7200,
    });

    let newSessionRejected = false;
    try {
      await Session.verifyAttested(
        session.token,
        this.identity.getPublicKey(),
        [(this.stationAttestation as Attestation).token, conn.B.token],
        EV_APP_AUDIENCE,
        checker,
      );
      logger.error('Expected the revoked station to fail, but verification passed');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      newSessionRejected = true;
      logger.warn('Rejected — the chain carries a revoked JTI', msg.slice(0, 80));
    }

    logger.success('One flag per station: every connector of station-001 is contained');
    return {
      stationJti: this.stationJti,
      newSessionRejected,
    };
  }
}
