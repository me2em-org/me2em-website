import {
  Identity,
  Session,
  type Handle,
  type SubHandle,
} from '@me2em/core';
import { logger } from './logger';

export interface AgentResult {
  agentHandleId: string;
  agentSubHandleId: string;
  attestationToken: string;
  sessionToken: string;
  sessionVerifiedBefore: boolean;
  sessionVerifiedAfter: boolean;
  revoked: boolean;
  attestationJti: string;
  futureSessionPassedBefore: boolean;
  attestationRevoked: boolean;
  futureSessionFailedAfter: boolean;
  rootPubKeyHex: string;
}

export async function runAgentScenario(identity: Identity): Promise<AgentResult> {
  logger.setScenario('agent');
  const handleName = 'agent-host';
  const agentName = 'travel-planner';

  // 1. Derive a Handle for the agent host
  logger.info(`Deriving agent Handle "${handleName}"…`);
  const agentHandle: Handle = await identity.deriveHandle(handleName, {
    displayName: 'Agent Host',
  });

  // 2. Derive agent SubHandle under the Handle
  logger.info(`Deriving agent SubHandle "${agentName}"…`);
  const agentSub: SubHandle = await agentHandle.deriveSubHandle(agentName, {
    displayName: 'Travel Planner Agent',
  });

  // 3. Owner attests the Handle (root → handle)
  logger.info('Owner issues root attestation for agent Handle…');
  const A = await identity.attestHandle(handleName, {
    audiences: ['booking.api.example'],
    scopes: ['travel:search', 'travel:book'],
    maxSessionTtl: 3600,
    subNamePatterns: ['*'],
  });

  // 4. Handle attests the SubHandle (handle → sub)
  logger.info('Agent Handle issues SubHandle attestation…');
  const B = await agentHandle.attestSubHandle(agentName, {
    audiences: ['booking.api.example'],
    scopes: ['travel:search'],
    maxSessionTtl: 3600,
  }, { ttlSeconds: 86400 });

  // 5. Agent creates a session (signs with its own key)
  logger.info('Agent creates session (audience: booking.api.example)…');
  const session1 = await Session.create(agentSub, {
    audience: 'booking.api.example',
    scopes: ['travel:search'],
    ttl: 3600,
  });

  // 6. Verify the session with full chain — should pass
  logger.info('Verifying agent session (before revocation)…');
  let verified1 = false;
  try {
    await Session.verifyAttested(
      session1.token,
      identity.getPublicKey(),
      [A.token, B.token],
      'booking.api.example',
    );
    verified1 = true;
    logger.success('Session verified — agent authorized');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('Verification failed unexpectedly', msg);
  }

  // 7. Owner revokes the session (in-memory RevocationChecker)
  logger.info('Owner revokes agent session…');
  const revokedIds = new Set<string>();
  revokedIds.add(session1.sessionId);

  const revocationChecker = {
    isRevoked: async (sid: string) => revokedIds.has(sid),
  };

  // 8. Re-verify the same session — should now fail with REVOKED
  logger.info('Verifying agent session (after revocation)…');
  let verified2 = false;
  try {
    await Session.verifyAttested(
      session1.token,
      identity.getPublicKey(),
      [A.token, B.token],
      'booking.api.example',
      revocationChecker,
    );
    verified2 = true;
    logger.error('Expected REVOKED, but verification passed');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    verified2 = false;
    logger.warn('Session REVOKED — verification now fails', msg.slice(0, 80));
  }

  // 9. The agent makes a NEW session (a "future" one): session revocation
  //    only killed session1 — the mandate itself is still alive.
  logger.info('Agent creates a future session (new JTI, mandate still valid)…');
  const session2 = await Session.create(agentSub, {
    audience: 'booking.api.example',
    scopes: ['travel:search'],
    ttl: 3600,
  });
  let futureSessionPassedBefore = false;
  try {
    await Session.verifyAttested(
      session2.token,
      identity.getPublicKey(),
      [A.token, B.token],
      'booking.api.example',
      revocationChecker,
    );
    futureSessionPassedBefore = true;
    logger.warn(
      'Future session VERIFIED — session revocation alone cannot stop the agent',
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('Future session failed unexpectedly', msg.slice(0, 80));
  }

  // 10. UC-1 one-call revocation: revokeAttestation(A.jti) — the ATTESTATION
  //     jti goes into the same revocation store. Every verifier that checks
  //     jti (session AND chain entries) stops trusting the agent instantly.
  logger.info('Owner revokes the ATTESTATION itself — one call, revokeAttestation(A.jti)…');
  revokedIds.add(A.jti);

  // A real service checks every jti it sees: the session id AND each jti in
  // the presented attestation chain.
  const chainJtis = [A.jti, B.jti];
  const attestationChecker = {
    isRevoked: async (sid: string) =>
      revokedIds.has(sid) || chainJtis.some((j) => revokedIds.has(j)),
  };

  // 11. Re-verify the FUTURE session with the chain-aware checker — must fail.
  logger.info('Verifying future session (after attestation revocation)…');
  let futureSessionFailedAfter = false;
  try {
    await Session.verifyAttested(
      session2.token,
      identity.getPublicKey(),
      [A.token, B.token],
      'booking.api.example',
      attestationChecker,
    );
    logger.error('Expected the mandate to be dead, but verification passed');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    futureSessionFailedAfter = true;
    logger.warn('Mandate DEAD — future sessions fail too', msg.slice(0, 80));
  }

  return {
    agentHandleId: agentHandle.getId(),
    agentSubHandleId: agentSub.getId(),
    attestationToken: A.token,
    sessionToken: session1.token,
    sessionVerifiedBefore: verified1,
    sessionVerifiedAfter: verified2,
    revoked: true,
    attestationJti: A.jti,
    futureSessionPassedBefore,
    attestationRevoked: true,
    futureSessionFailedAfter,
    rootPubKeyHex: Array.from(identity.getPublicKey())
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join(''),
  };
}
