import {
  Identity,
  Attestation,
  Session,
  verifyWalletBinding,
  generateSeedPhrase,
  get64ByteSeedFromMnemonic,
  type Handle,
  type SubHandle,
  type WalletDescriptor,
  type PaymentRequest,
} from '@me2em/core';
import {
  SolanaWalletTree,
  verifyWalletBindingSolana,
  createPaymentReference,
  createPaymentRequestURL,
  SOLANA_CHAINS,
} from '@me2em/solana';
import { logger } from './logger';

// ─── Scenario mapping ─────────────────────────────────────────────────────────
// Identity  = Mission Control Center (ЦУП)      — the user's own seed
// Handle    = satellite                        — derived from the root seed
// SubHandle = instrument on board              — derived by the satellite
// Purchase  = an access certificate signed by Mission Control binding the
//             BUYER'S OWN external key to a time-boxed tasking window.

export const PORTAL_AUDIENCE = 'tasking.portal.example';

interface InstrumentSpec {
  name: string;
  displayName: string;
  kind: 'imaging' | 'weather' | 'radar' | 'comms';
  scopes: string[];
  slotMinutes: number;
  priceSol: string;
}

interface SatelliteSpec {
  name: string;
  displayName: string;
  orbit: string;
  walletIndex: number;
  instruments: InstrumentSpec[];
}

// Demo fleet: two satellites, four instruments. Deterministic — the same
// seed always derives the same Handles, instruments, and wallet addresses.
const FLEET_SPECS: SatelliteSpec[] = [
  {
    name: 'orb-aurora',
    displayName: 'AURORA-1 · Earth Observation',
    orbit: 'SSO 512 km · next pass 14:04 UTC',
    walletIndex: 0,
    instruments: [
      {
        name: 'inst-camera-hd',
        displayName: 'HD Imager',
        kind: 'imaging',
        scopes: ['imaging:task', 'imaging:fetch'],
        slotMinutes: 30,
        priceSol: '0.012',
      },
      {
        name: 'inst-ir-sensor',
        displayName: 'Infrared Sounder',
        kind: 'weather',
        scopes: ['weather:task', 'weather:fetch'],
        slotMinutes: 30,
        priceSol: '0.008',
      },
    ],
  },
  {
    name: 'orb-orion',
    displayName: 'ORION-2 · SAR Recon',
    orbit: 'LEO 540 km · next pass 15:27 UTC',
    walletIndex: 1,
    instruments: [
      {
        name: 'inst-sar-x',
        displayName: 'X-Band SAR',
        kind: 'radar',
        scopes: ['sar:task', 'sar:fetch'],
        slotMinutes: 20,
        priceSol: '0.020',
      },
      {
        name: 'inst-relay-k',
        displayName: 'Ka-band Relay',
        kind: 'comms',
        scopes: ['relay:link'],
        slotMinutes: 30,
        priceSol: '0.005',
      },
    ],
  },
];

// Rotating demo buyers — each is a real external Identity with its own seed.
const BUYERS = [
  { handle: 'client-geoanalytics', company: 'GeoAnalytics Ltd' },
  { handle: 'client-orbital-maps', company: 'Orbital Maps Inc' },
  { handle: 'client-terra-watch', company: 'TerraWatch LLC' },
];

export interface InstrumentNode {
  name: string;
  displayName: string;
  kind: string;
  scopes: string[];
  slotMinutes: number;
  priceSol: string;
  subHandleId: string;
  path: string;
  attestationToken: string;
}

export interface SatelliteNode {
  name: string;
  displayName: string;
  orbit: string;
  handleId: string;
  attestationToken: string;
  wallet: { address: string; path: string };
  walletBindingOk: boolean;
  onCurveOk: boolean;
  instruments: InstrumentNode[];
}

export interface PurchaseReceipt {
  company: string;
  buyerHandleName: string;
  buyerId: string;
  satName: string;
  satDisplay: string;
  instName: string;
  instDisplay: string;
  scopes: string[];
  windowStart: number;
  windowEnd: number;
  slotMinutes: number;
  priceSol: string;
  certificateToken: string;
  certificateJti: string;
  buyerSessionVerified: boolean;
  buyerSessionToken: string;
  chainSessionVerified: boolean;
  paymentUrl: string;
}

/**
 * Owns the derived satellite Handles and instrument SubHandles for the
 * lifetime of the scenario. The component keeps it in a ref and disposes
 * it on unmount / re-deploy.
 */
export class MCCMission {
  private satHandles = new Map<string, Handle>();
  private instSubs = new Map<string, SubHandle>();
  private sats: SatelliteNode[] = [];
  private walletTree: SolanaWalletTree | null = null;
  private walletDescriptors = new Map<string, WalletDescriptor>();

  getFleet(): SatelliteNode[] {
    return this.sats;
  }

  /** Step 1 — derive satellite Handles and attest them (ЦУП → satellite). */
  async deployFleet(identity: Identity, seedBytes: Uint8Array): Promise<SatelliteNode[]> {
    logger.setScenario('satellite');
    this.dispose();

    logger.info('Mission Control Center = root Identity (derived from YOUR seed)');
    this.walletTree = SolanaWalletTree.fromSeed(seedBytes);

    for (let i = 0; i < FLEET_SPECS.length; i++) {
      const spec = FLEET_SPECS[i];

      logger.info(`Deriving satellite Handle "${spec.name}"…`);
      const handle: Handle = await identity.deriveHandle(spec.name, {
        displayName: spec.displayName,
      });

      const scopes = [...new Set(spec.instruments.flatMap((it) => it.scopes))];
      const grant = {
        audiences: [PORTAL_AUDIENCE],
        scopes,
        maxSessionTtl: 3600,
        subNamePatterns: ['inst-*'],
      };

      // Wallet is derived first so the attestation can carry the v1.2 §6
      // wallet-binding extensions (subjectWallet / chain / path).
      const wallet = await this.walletTree.deriveWallet(spec.walletIndex);
      const descriptor: WalletDescriptor = {
        chain: SOLANA_CHAINS.devnet,
        address: wallet.address,
        derivationPath: wallet.derivationPath,
        label: spec.name,
      };
      wallet.privateKey.fill(0); // wipe per API contract (fresh buffer)

      logger.info(
        `Attesting satellite Handle "${spec.name}" (Mission Control → satellite, wallet-bound)…`,
      );
      const A = await Attestation.issue(identity, handle.getPublicKey(), spec.name, grant, {
        subjectWallet: descriptor.address,
        subjectWalletChain: descriptor.chain,
        subjectWalletPath: descriptor.derivationPath,
      });

      const entityRef = { id: handle.getId(), kind: 'handle' as const, name: spec.name };
      let walletBindingOk = false;
      try {
        walletBindingOk = await verifyWalletBinding(descriptor, entityRef, A, {
          issuerPublicKey: identity.getPublicKey(),
        });
      } catch {
        walletBindingOk = false;
      }
      const onCurveOk = verifyWalletBindingSolana(descriptor);

      logger.success(
        `Satellite "${spec.name}" deployed`,
        `${wallet.derivationPath} → ${wallet.address.slice(0, 8)}…`,
      );

      this.satHandles.set(spec.name, handle);
      this.walletDescriptors.set(spec.name, descriptor);
      this.sats.push({
        name: spec.name,
        displayName: spec.displayName,
        orbit: spec.orbit,
        handleId: handle.getId(),
        attestationToken: A.token,
        wallet: { address: wallet.address, path: wallet.derivationPath },
        walletBindingOk,
        onCurveOk,
        instruments: [],
      });
    }

    return this.sats;
  }

  /** Step 2 — derive instrument SubHandles on board (satellite → instrument). */
  async powerInstruments(satName: string): Promise<InstrumentNode[]> {
    logger.setScenario('satellite');
    const satSpec = FLEET_SPECS.find((s) => s.name === satName);
    const handle = this.satHandles.get(satName);
    const node = this.sats.find((s) => s.name === satName);
    if (!satSpec || !handle || !node) throw new Error('Fleet not deployed');
    if (node.instruments.length > 0) return node.instruments;

    for (const inst of satSpec.instruments) {
      logger.info(`Deriving instrument SubHandle "${inst.name}" on "${satName}"…`);
      const sub: SubHandle = await handle.deriveSubHandle(inst.name, {
        displayName: inst.displayName,
        allowedAudiences: [PORTAL_AUDIENCE],
        allowedScopes: inst.scopes,
        maxSessionTtl: inst.slotMinutes * 60,
      });

      logger.info(`Attesting instrument "${inst.name}" (satellite → instrument)…`);
      const B = await handle.attestSubHandle(
        inst.name,
        {
          audiences: [PORTAL_AUDIENCE],
          scopes: inst.scopes,
          maxSessionTtl: inst.slotMinutes * 60,
        },
        { ttlSeconds: 365 * 24 * 3600 },
      );

      this.instSubs.set(inst.name, sub);
      node.instruments.push({
        name: inst.name,
        displayName: inst.displayName,
        kind: inst.kind,
        scopes: inst.scopes,
        slotMinutes: inst.slotMinutes,
        priceSol: inst.priceSol,
        subHandleId: sub.getId(),
        path: sub.getPathString(),
        attestationToken: B.token,
      });
      logger.success(`Instrument "${inst.displayName}" online`, `path ${sub.getPathString()}`);
    }

    return node.instruments;
  }

  /** Step 3 — the sale: certificate from Mission Control to an external buyer. */
  async purchase(
    identity: Identity,
    satName: string,
    instName: string,
    purchaseIndex: number,
  ): Promise<PurchaseReceipt> {
    logger.setScenario('satellite');
    const sat = this.sats.find((s) => s.name === satName);
    const inst = sat?.instruments.find((i) => i.name === instName);
    const instSub = this.instSubs.get(instName);
    const descriptor = this.walletDescriptors.get(satName);
    if (!sat || !inst || !instSub || !descriptor) {
      throw new Error('Deploy the fleet and power up instruments first');
    }

    const buyer = BUYERS[purchaseIndex % BUYERS.length];
    const slotSeconds = inst.slotMinutes * 60;
    const nowSec = Math.floor(Date.now() / 1000);
    const windowStart = nowSec;
    const windowEnd = nowSec + slotSeconds;

    // 1. The buyer joins the marketplace with their OWN external identity.
    logger.info(`Buyer "${buyer.company}" joins — generating an external identity (own seed)…`);
    const buyerSeedPhrase = generateSeedPhrase(128);
    const buyerIdentity = await Identity.fromSeed(
      await get64ByteSeedFromMnemonic(buyerSeedPhrase),
    );

    try {
      const buyerHandle = await buyerIdentity.deriveHandle(buyer.handle);
      const buyerId = buyerHandle.getId();

      // 2. THE SALE — Mission Control signs an access certificate binding the
      //    buyer's own key to this instrument's tasking window.
      logger.info(
        `Issuing access certificate (Mission Control → "${buyer.handle}", ${inst.slotMinutes} min window)…`,
      );
      const C = await Attestation.issue(
        identity,
        buyerHandle.getPublicKey(),
        buyer.handle,
        {
          audiences: [PORTAL_AUDIENCE],
          scopes: inst.scopes,
          maxSessionTtl: slotSeconds,
        },
        { expiresAt: windowEnd },
      );

      // 3. Payment via x402 (request is real; confirmation is simulated —
      //    devnet wallets in the demo carry no funds).
      const reference = createPaymentReference();
      const paymentRequest: PaymentRequest = {
        chain: SOLANA_CHAINS.devnet,
        payTo: sat.wallet.address,
        amount: inst.priceSol,
        asset: 'sol',
        reference,
        expiresAt: windowEnd,
        extra: {
          sellerId: sat.handleId,
          buyerId,
          memo: `${inst.displayName} — ${inst.slotMinutes} min tasking window`,
          reference,
        },
      };
      const paymentUrl = createPaymentRequestURL(paymentRequest);
      logger.success(
        'x402 payment confirmed (simulated in demo)',
        `${inst.priceSol} SOL → ${sat.wallet.address.slice(0, 8)}…`,
      );

      // 4. Portal check #1 — the buyer authenticates with THEIR OWN key and
      //    the certificate chain [C]; verification needs only the MCC root
      //    public key and works offline.
      logger.info('Portal: verifying buyer session against certificate [C]…');
      const buyerSession = await Session.create(buyerHandle, {
        audience: PORTAL_AUDIENCE,
        scopes: [inst.scopes[0]],
        ttl: slotSeconds - 60,
      });
      let buyerSessionVerified = false;
      try {
        await Session.verifyAttested(
          buyerSession.token,
          identity.getPublicKey(),
          [C.token],
          PORTAL_AUDIENCE,
        );
        buyerSessionVerified = true;
        logger.success('Buyer session verified — certificate chain [C] valid');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.warn('Certificate chain check failed', msg.slice(0, 80));
      }

      // 5. Portal check #2 — the on-board chain [satellite → instrument].
      logger.info('Portal: verifying instrument chain [A → B]…');
      const chainSession = await Session.create(instSub, {
        audience: PORTAL_AUDIENCE,
        scopes: [inst.scopes[0]],
        ttl: slotSeconds - 60,
      });
      let chainSessionVerified = false;
      try {
        await Session.verifyAttested(
          chainSession.token,
          identity.getPublicKey(),
          [sat.attestationToken, inst.attestationToken],
          PORTAL_AUDIENCE,
        );
        chainSessionVerified = true;
        logger.success('Instrument chain verified — [satellite → instrument] valid');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.warn('Instrument chain check failed', msg.slice(0, 80));
      }

      logger.success(
        `Access granted — "${inst.displayName}" @ "${sat.displayName}"`,
        `window ${inst.slotMinutes} min · cert ${C.jti.slice(0, 8)}…`,
      );

      return {
        company: buyer.company,
        buyerHandleName: buyer.handle,
        buyerId,
        satName: sat.name,
        satDisplay: sat.displayName,
        instName: inst.name,
        instDisplay: inst.displayName,
        scopes: inst.scopes,
        windowStart,
        windowEnd,
        slotMinutes: inst.slotMinutes,
        priceSol: inst.priceSol,
        certificateToken: C.token,
        certificateJti: C.jti,
        buyerSessionVerified,
        buyerSessionToken: buyerSession.token,
        chainSessionVerified,
        paymentUrl,
      };
    } finally {
      buyerIdentity.dispose();
    }
  }

  dispose(): void {
    for (const h of this.satHandles.values()) h.dispose();
    for (const s of this.instSubs.values()) s.dispose();
    this.satHandles.clear();
    this.instSubs.clear();
    this.sats = [];
    this.walletDescriptors.clear();
    this.walletTree?.dispose();
    this.walletTree = null;
  }
}
