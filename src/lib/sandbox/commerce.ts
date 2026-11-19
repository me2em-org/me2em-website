import {
  Identity,
  Attestation,
  Session,
  verifyWalletBinding,
  type Handle,
  type WalletDescriptor,
  type X402PaymentRequired,
  type X402PaymentRequirements,
  type X402SettleResponse,
} from '@me2em/core';
import { verifyRaw, randomBytes } from '@me2em/crypto';
import {
  SolanaWalletTree,
  SolanaX402Signer,
  verifyWalletBindingSolana,
  createPaymentReference,
  solToLamports,
  SOLANA_CHAINS,
  SOLANA_NATIVE_ASSET,
  type SolanaX402Payload,
} from '@me2em/solana';
import {
  createPaymentFetch,
  paymentRequiredResponse,
  readSettlement,
  readPaymentHeader,
  readMe2emExtra,
  settlementHeader,
  withMe2emExtra,
  PAYMENT_SIGNATURE_HEADER,
} from '@me2em/x402';
import { base58, base64 } from '@scure/base';
import { logger } from './logger';

// ─── Scenario mapping ─────────────────────────────────────────────────────────
// Identity   = the owner (root of trust)        — the user's own seed
// Handle     = an autonomous AI agent           — its own key + signed mandate
// Wallet     = the agent's Solana wallet        — SAME seed, index 2 (m/44'/501')
// Seller API = third party (own random seed)    — sells data, verifies the
//              agent's mandate OFFLINE, quotes via HTTP 402
// x402 loop  = the real @me2em/x402 client (createPaymentFetch): 402 →
//              sign once → retry → settlement. Transport is simulated in-page
//              (globalThis.fetch is swapped for a fake seller/facilitator);
//              on-chain settlement is simulated (devnet has no funds).

export const DATA_AUDIENCE = 'data.api.example';
const DATA_URL = `https://${DATA_AUDIENCE}/meteo-feed`;
const PREMIUM_AUDIENCE = 'premium.api.example';
const PREMIUM_URL = `https://${PREMIUM_AUDIENCE}/feed`;
const AGENT_WALLET_INDEX = 2;
const PRICE_SOL = '0.004';
const SIM_BLOCKHASH = base58.encode(new Uint8Array(32).fill(7));

const RESOURCE = {
  station: 'AURORA-1 · meteo relay',
  feed: 'meteo-feed',
  windowMinutes: 30,
  tempC: -12.4,
  pressureHpa: 1013.2,
  windMs: 6.2,
  cloudCoverPct: 42,
  nextPassUtc: '14:04',
};

export interface WireEvent {
  actor: 'agent' | 'seller' | 'facilitator';
  kind: 'req' | 'res' | 'ok' | 'warn' | 'sim';
  text: string;
  detail?: string;
}

export interface AgentCard {
  handleName: string;
  handleId: string;
  pubKeyHex: string;
  walletAddress: string;
  walletPath: string;
  mandateAudiences: string[];
  mandateScopes: string[];
  bindingCore: boolean;
  bindingOnCurve: boolean;
}

export interface SellerCard {
  api: string;
  priceSol: string;
  walletAddress: string;
  note: string;
}

export interface CommerceArtifacts {
  paymentRequired: unknown;
  paymentPayload: unknown;
  settlement: X402SettleResponse | null;
  resource: unknown;
  txRef: string;
}

export interface CommerceRun {
  wire: WireEvent[];
  artifacts: CommerceArtifacts | null;
  sessionJti: string;
}

export interface CommerceNegative {
  status: number;
  reason: string;
}

function shorten(s: string, chars = 10): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

// ─── Legacy transaction parsing (facilitator-side, fail-closed) ──────────────
// Wire: [compact-u16 sigCount][sig ×64][message], where message =
// [0x01 prefix][numReqSig, numRoSigned, numRoUnsigned][keyCount][keys…]
// [blockhash][ixCount][ixs…]. Verified against a real SolanaX402Signer payload.

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
const TRANSFER_DISCRIMINANT = 2;

function readCompactU16(b: Uint8Array, o: number): [number, number] {
  let v = 0, shift = 0, i = o;
  for (;;) {
    const c = b[i++];
    v |= (c & 0x7f) << shift;
    if ((c & 0x80) === 0) break;
    shift += 7;
  }
  return [v, i];
}

interface ParsedTransfer {
  sig: Uint8Array;
  signedMessage: Uint8Array;
  signerKeyBytes: Uint8Array;
  keys: string[];
  blockhash: string;
  destinationKey: string;
  lamports: bigint;
}

function parseLegacyTransfer(tx: Uint8Array): ParsedTransfer {
  const [sigCount, o0] = readCompactU16(tx, 0);
  if (sigCount !== 1) throw new Error(`sigCount ${sigCount} !== 1`);
  const sig = tx.slice(o0, o0 + 64 * sigCount);
  const signedMessage = tx.subarray(o0 + 64 * sigCount);
  const msg = signedMessage;
  if (msg[0] !== 1) throw new Error(`message prefix ${msg[0]} !== 1`);
  let o = 1;
  const numReq = msg[o++];
  if (numReq !== 1) throw new Error(`numRequiredSignatures ${numReq} !== 1`);
  o += 2; // numReadonlySigned, numReadonlyUnsigned
  const keyBytes: Uint8Array[] = [];
  const keys: string[] = [];
  const [n, o1] = readCompactU16(msg, o);
  o = o1;
  for (let i = 0; i < n; i++) {
    keyBytes.push(msg.slice(o, o + 32));
    keys.push(base58.encode(msg.subarray(o, o + 32)));
    o += 32;
  }
  const blockhash = base58.encode(msg.subarray(o, o + 32));
  o += 32;
  const [ixCount, o2] = readCompactU16(msg, o);
  o = o2;
  for (let i = 0; i < ixCount; i++) {
    const progIdx = msg[o++];
    let ac: number;
    [ac, o] = readCompactU16(msg, o);
    const accts: number[] = [];
    for (let j = 0; j < ac; j++) accts.push(msg[o++]);
    let dl: number;
    [dl, o] = readCompactU16(msg, o);
    const data = msg.slice(o, o + dl);
    o += dl;
    if (keys[progIdx] === SYSTEM_PROGRAM_ID && data[0] === TRANSFER_DISCRIMINANT && data.length === 12) {
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const lamports = view.getBigUint64(4, true);
      return {
        sig,
        signedMessage,
        signerKeyBytes: keyBytes[0],
        keys,
        blockhash,
        destinationKey: keys[accts[1]],
        lamports,
      };
    }
  }
  throw new Error('no system-program transfer instruction found');
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class CommerceEngine {
  private tree: SolanaWalletTree | null = null;
  private agentHandle: Handle | null = null;
  private A: Attestation | null = null;
  private agentCard: AgentCard | null = null;
  private seller: SellerCard | null = null;
  private reference = '';
  private run: CommerceRun | null = null;
  private session: Session | null = null;

  dispose(): void {
    try {
      this.tree?.dispose();
    } catch {
      /* already disposed */
    }
    this.tree = null;
    this.agentHandle = null;
    this.A = null;
    this.agentCard = null;
    this.seller = null;
    this.run = null;
    this.session = null;
    this.rootPub = null;
  }

  getAgentCard(): AgentCard | null {
    return this.agentCard;
  }

  getSeller(): SellerCard | null {
    return this.seller;
  }

  getRun(): CommerceRun | null {
    return this.run;
  }

  getNegative(): CommerceNegative | null {
    return this.negative;
  }
  private negative: CommerceNegative | null = null;
  private rootPub: Uint8Array | null = null;

  clearNegative(): void {
    this.negative = null;
  }

  /** Stage 1 — agent identity: Handle + mandate attestation + own wallet. */
  async issueMandate(identity: Identity, seedBytes: Uint8Array): Promise<AgentCard> {
    logger.setScenario('commerce');
    this.dispose();
    this.negative = null;
    this.rootPub = identity.getPublicKey();

    logger.info('Agent owner = root Identity (derived from YOUR seed)');
    this.tree = SolanaWalletTree.fromSeed(seedBytes);

    logger.info('Deriving agent Handle "agent-commerce" (its own Ed25519 key)…');
    const handle: Handle = await identity.deriveHandle('agent-commerce', {
      displayName: 'Commerce Agent',
    });

    // The agent's Solana wallet derives from the SAME seed (index 2):
    // one seed = identity + payment capability.
    logger.info(`Deriving agent wallet from the same seed (index ${AGENT_WALLET_INDEX})…`);
    const wallet = await this.tree.deriveWallet(AGENT_WALLET_INDEX);
    const descriptor: WalletDescriptor = {
      chain: SOLANA_CHAINS.devnet,
      address: wallet.address,
      derivationPath: wallet.derivationPath,
      label: 'agent-commerce',
    };
    wallet.privateKey.fill(0); // signer derives its own copy from the tree

    const grant = {
      audiences: [DATA_AUDIENCE],
      scopes: ['data:fetch'],
      maxSessionTtl: 3600,
    };
    logger.info('Owner signs the mandate: attestation with wallet binding…');
    const A = await Attestation.issue(identity, handle.getPublicKey(), 'agent-commerce', grant, {
      subjectWallet: descriptor.address,
      subjectWalletChain: descriptor.chain,
      subjectWalletPath: descriptor.derivationPath,
    });

    let bindingCore = false;
    try {
      bindingCore = await verifyWalletBinding(
        descriptor,
        { id: handle.getId(), kind: 'handle', name: 'agent-commerce' },
        A,
        { issuerPublicKey: identity.getPublicKey() },
      );
    } catch {
      bindingCore = false;
    }
    const bindingOnCurve = verifyWalletBindingSolana(descriptor);

    // Third-party seller: its own random seed → its own wallet address.
    const sellerSeed = randomBytes(64);
    const sellerTree = SolanaWalletTree.fromSeed(sellerSeed);
    const sellerWallet = await sellerTree.deriveWallet(0);
    sellerTree.dispose();
    sellerSeed.fill(0);

    this.agentHandle = handle;
    this.A = A;
    const card: AgentCard = {
      handleName: 'agent-commerce',
      handleId: handle.getId(),
      pubKeyHex: Array.from(handle.getPublicKey())
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join(''),
      walletAddress: descriptor.address,
      walletPath: descriptor.derivationPath ?? '',
      mandateAudiences: grant.audiences,
      mandateScopes: grant.scopes,
      bindingCore,
      bindingOnCurve,
    };
    this.agentCard = card;
    this.seller = {
      api: DATA_URL,
      priceSol: PRICE_SOL,
      walletAddress: sellerWallet.address,
      note: 'own random seed — a genuine third party, no shared secrets with the buyer',
    };

    logger.success('Mandate issued: audiences [data.api.example], wallet bound (core + on-curve)');
    return card;
  }

  /**
   * Stage 2 — the real x402 client loop against an in-page seller +
   * facilitator: GET → 402 PAYMENT-REQUIRED → sign once → retry with
   * PAYMENT-SIGNATURE → 200 + PAYMENT-RESPONSE.
   */
  async paidCall(): Promise<CommerceRun> {
    if (!this.tree || !this.agentHandle || !this.A || !this.agentCard || !this.seller) {
      throw new Error('run the mandate stage first');
    }
    logger.setScenario('commerce');
    this.negative = null;
    this.reference = createPaymentReference();
    const wire: WireEvent[] = [];

    logger.info('Agent signs its own session (audience data.api.example)…');
    const session = await Session.create(this.agentHandle, {
      audience: DATA_AUDIENCE,
      scopes: ['data:fetch'],
      ttl: 3600,
    });
    this.session = session;
    wire.push({
      actor: 'agent',
      kind: 'req',
      text: `GET ${DATA_URL}`,
      detail: `Authorization: Bearer <session ${shorten(session.sessionId, 8)}>`,
    });

    const captured: { required?: X402PaymentRequired; payload?: unknown } = {};
    const router = this.makeRouter(wire, captured);
    const signer = new SolanaX402Signer({
      tree: this.tree,
      index: AGENT_WALLET_INDEX,
      getRecentBlockhash: async () => {
        wire.push({
          actor: 'agent',
          kind: 'sim',
          text: 'offline signer: blockhash injected (simulated RPC) — signing the legacy transfer, exactly once',
        });
        return SIM_BLOCKHASH;
      },
    });
    const pay = createPaymentFetch({ signer, maxAttempts: 2 });

    const origFetch = globalThis.fetch;
    globalThis.fetch = router;
    let res: Response;
    try {
      res = await pay(DATA_URL, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
    } finally {
      globalThis.fetch = origFetch;
    }

    const settlement = readSettlement(res);
    const resource = await res.json();
    wire.push({
      actor: 'agent',
      kind: 'ok',
      text: 'agent: 200 OK — resource received; readSettlement() → receipt',
      detail: settlement ? `tx ${shorten(settlement.transaction, 10)}` : undefined,
    });

    const run: CommerceRun = {
      wire,
      artifacts: {
        paymentRequired: captured.required ?? null,
        paymentPayload: captured.payload ?? null,
        settlement,
        resource,
        txRef: settlement?.transaction ?? '',
      },
      sessionJti: session.sessionId,
    };
    this.run = run;
    logger.success('x402 loop complete: 402 → sign once → 200 + settlement');
    return run;
  }

  /** Stage 3 — mandate enforcement: an API outside the audiences is blocked BEFORE any payment. */
  async mandateEnforcement(): Promise<CommerceNegative> {
    if (!this.tree || !this.run) {
      throw new Error('run the paid-call stage first');
    }
    logger.setScenario('commerce');
    const wire: WireEvent[] = [];
    const session = this.session;
    if (!session) {
      throw new Error('run the paid-call stage first');
    }

    wire.push({
      actor: 'agent',
      kind: 'req',
      text: `GET ${PREMIUM_URL}`,
      detail: 'same session — but "premium.api.example" is not in the mandate',
    });

    const router = this.makeRouter(wire, {});
    const signer = new SolanaX402Signer({
      tree: this.tree,
      index: AGENT_WALLET_INDEX,
      getRecentBlockhash: async () => SIM_BLOCKHASH,
    });
    const pay = createPaymentFetch({ signer, maxAttempts: 2 });

    const origFetch = globalThis.fetch;
    globalThis.fetch = router;
    let res: Response;
    try {
      res = await pay(PREMIUM_URL, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
    } finally {
      globalThis.fetch = origFetch;
    }

    let reason = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; detail?: string };
      reason = `${body.error ?? `HTTP ${res.status}`}: ${body.detail ?? ''}`.trim();
    } catch {
      /* keep status-only reason */
    }
    this.negative = { status: res.status, reason };
    this.run.wire.push(...wire);
    logger.warn(`Premium API blocked before payment (HTTP ${res.status})`, reason);
    return this.negative;
  }

  /** In-page seller + facilitator: verifies the mandate offline, quotes, settles. */
  private makeRouter(
    wire: WireEvent[],
    captured: { required?: X402PaymentRequired; payload?: unknown },
  ) {
    const A = this.A as Attestation;
    const rootKey = this.rootPub as Uint8Array;
    const reference = this.reference;
    const seller = this.seller as SellerCard;
    const agentCard = this.agentCard as AgentCard;

    const verifyMandate = async (token: string, expectedAudience: string): Promise<void> => {
      await Session.verifyAttested(token, rootKey, [A.token], expectedAudience);
    };

    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      const headers = new Headers(init?.headers);
      const token = (headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
      const expectedAudience = url === DATA_URL ? DATA_AUDIENCE : PREMIUM_AUDIENCE;

      try {
        await verifyMandate(token, expectedAudience);
        wire.push({
          actor: 'seller',
          kind: 'ok',
          text: `seller: mandate chain verified offline (root public key only) — audience "${expectedAudience}" granted`,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        wire.push({
          actor: 'seller',
          kind: 'warn',
          text: `seller: mandate REJECTED for "${expectedAudience}" — no quote, no 402, no payment`,
          detail: msg.slice(0, 120),
        });
        return Response.json(
          { error: 'mandate_rejected', detail: msg.slice(0, 160) },
          { status: 403 },
        );
      }

      if (headers.has(PAYMENT_SIGNATURE_HEADER)) {
        return this.settle(wire, headers, url, captured);
      }

      // First call — quote via a real 402 + PAYMENT-REQUIRED header.
      const req0: X402PaymentRequirements = {
        scheme: 'exact',
        network: SOLANA_CHAINS.devnet,
        amount: solToLamports(PRICE_SOL).toString(),
        asset: SOLANA_NATIVE_ASSET,
        payTo: seller.walletAddress,
        maxTimeoutSeconds: 60,
      };
      const req = withMe2emExtra(req0, {
        sellerId: 'api:seller-meteo',
        buyerId: agentCard.handleName,
        reference,
      });
      const pr: X402PaymentRequired = {
        x402Version: 2,
        resource: {
          url,
          description: 'Live meteo feed — 30 minutes',
          mimeType: 'application/json',
          serviceName: 'meteo-feed',
        },
        accepts: [req],
      };
      captured.required = pr;
      wire.push({
        actor: 'seller',
        kind: 'res',
        text: `402 PAYMENT-REQUIRED — price ${PRICE_SOL} SOL (${req.amount} lamports)`,
        detail: `payTo ${shorten(seller.walletAddress, 8)} · ref ${shorten(reference, 8)}`,
      });
      return paymentRequiredResponse(pr);
    };
  }

  /** Facilitator path: decode PAYMENT-SIGNATURE, verify for real, "settle". */
  private async settle(
    wire: WireEvent[],
    headers: Headers,
    url: string,
    captured: { payload?: unknown },
  ): Promise<Response> {
    const payload = readPaymentHeader(headers, url);
    if (!payload) {
      // readPaymentHeader returns null only when the header is absent —
      // we only get here with PAYMENT-SIGNATURE present, so fail closed.
      throw new Error('PAYMENT-SIGNATURE header missing');
    }
    captured.payload = payload;
    const accepted = payload.accepted;
    const extra = readMe2emExtra(accepted);
    const sp = payload.payload as SolanaX402Payload;

    wire.push({
      actor: 'facilitator',
      kind: 'req',
      text: 'facilitator: PAYMENT-SIGNATURE decoded (x402 v2, solana-legacy-transfer)',
      detail: `amount ${accepted.amount} lamports → ${shorten(accepted.payTo, 8)}`,
    });

    // REAL verification — Ed25519 over the signed message, pubkey from the
    // message itself (exactly how Solana nodes verify).
    let sigOk = false;
    let fromOk = false;
    let toOk = false;
    let amountOk = false;
    try {
      const tx = base64.decode(sp.transaction);
      const parsed = parseLegacyTransfer(tx);
      sigOk = verifyRaw(parsed.signerKeyBytes, parsed.signedMessage, parsed.sig);
      fromOk = parsed.keys[0] === sp.from && sp.from === (this.agentCard as AgentCard).walletAddress;
      toOk = parsed.destinationKey === sp.to && sp.to === accepted.payTo;
      amountOk = parsed.lamports === BigInt(accepted.amount);
      void parsed.blockhash;
    } catch (e: unknown) {
      wire.push({
        actor: 'facilitator',
        kind: 'warn',
        text: 'facilitator: transaction parse failed — fail closed',
        detail: e instanceof Error ? e.message : String(e),
      });
    }

    const refOk = extra?.reference === this.reference;
    wire.push({
      actor: 'facilitator',
      kind: sigOk && fromOk && toOk && amountOk ? 'ok' : 'warn',
      text: `facilitator: Ed25519 signature ${sigOk ? 'verified' : 'INVALID'} · payer = mandate-bound wallet ${fromOk ? '✓' : '✗'} · destination = payTo ${toOk ? '✓' : '✗'} · amount = quoted ${amountOk ? '✓' : '✗'} · reference ${refOk ? 'match' : 'MISMATCH'}`,
    });
    if (!(sigOk && fromOk && toOk && amountOk)) {
      const settleFail: X402SettleResponse = {
        success: false,
        errorReason: 'verification_failed',
        errorMessage: 'payment payload failed facilitator verification',
        transaction: '',
        network: accepted.network,
      };
      return new Response(JSON.stringify({ error: 'verification_failed' }), {
        status: 402,
        headers: settlementHeader(settleFail),
      });
    }

    wire.push({
      actor: 'facilitator',
      kind: 'sim',
      text: 'facilitator: broadcast to solana:devnet — SIMULATED (devnet has no funds)',
    });
    const txRef = base58.encode(randomBytes(64));
    const settle: X402SettleResponse = {
      success: true,
      transaction: txRef,
      network: accepted.network,
      payer: sp.from,
      amount: accepted.amount,
    };
    wire.push({
      actor: 'seller',
      kind: 'res',
      text: '200 OK — resource + PAYMENT-RESPONSE',
      detail: `tx ${shorten(txRef, 10)} · ${accepted.amount} lamports settled`,
    });
    return new Response(JSON.stringify(RESOURCE), {
      status: 200,
      headers: { ...settlementHeader(settle), 'content-type': 'application/json' },
    });
  }
}
